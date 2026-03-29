import type { Prisma, PrismaClient, RestartScope, TaintStatus } from "@prisma/client";
import { db } from "../../lib/db.ts";
import { DefectNotFoundError, RestartNotAllowedError } from "../shared/errors.ts";
import { createCheckpoint, recordMatterEvent } from "../usage/usage.service.ts";
import { draftSectionFromOutlineNode } from "../draft/draft.service.ts";

type DbClient = PrismaClient | Prisma.TransactionClient | Record<string, unknown>;

function hasMethod(client: DbClient, key: string, method: string) {
  return Boolean((client as Record<string, any>)[key]?.[method]);
}

function mapSeverityToTaint(severity: string): TaintStatus {
  return severity === "critical" ? "tainted" : "suspect";
}

function buildPreserveDiscardSummary(scope: RestartScope) {
  if (scope === "section") {
    return {
      preserve: ["verified authorities", "outline proposition", "defect history"],
      discard: ["tainted section prose", "claim links derived from failed support"],
    };
  }
  if (scope === "outline_node" || scope === "proposition") {
    return {
      preserve: ["verified authorities", "matter context", "defect history"],
      discard: ["tainted outline node", "dependent section prose", "claim links from failed support"],
    };
  }
  return {
    preserve: ["verified authorities", "defect history"],
    discard: ["tainted downstream prose"],
  };
}

async function getAffectedArtifacts(authorityId: string, matterId: string) {
  if (!hasMethod(db, "outlineNode", "findMany")) {
    return { outlineNodes: [], draftSections: [] };
  }

  const outlineNodes = await (db as Record<string, any>).outlineNode.findMany({
    where: {
      matterId,
      authorityLinks: {
        some: {
          authorityId,
        },
      },
    },
    include: {
      draftSections: {
        orderBy: [{ updatedAt: "desc" }],
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return {
    outlineNodes,
    draftSections: outlineNodes.flatMap((node: Record<string, any>) => node.draftSections ?? []),
  };
}

export async function propagateAuthorityTaint(params: {
  matterId: string;
  authorityId: string;
  severity: string;
  defectId?: string;
  defectType?: string;
}) {
  const taintStatus = mapSeverityToTaint(params.severity);
  const affected = await getAffectedArtifacts(params.authorityId, params.matterId);

  if (affected.outlineNodes.length === 0) {
    return {
      taintStatus,
      affectedOutlineNodeIds: [] as string[],
      affectedDraftSectionIds: [] as string[],
    };
  }

  await db.$transaction(async (tx) => {
    const draftSectionIds = affected.draftSections.map((section: Record<string, any>) => String(section.id));

    if (draftSectionIds.length > 0 && hasMethod(tx, "claimSupportLink", "updateMany")) {
      await (tx as Record<string, any>).claimSupportLink.updateMany({
        where: {
          authorityId: params.authorityId,
          draftSectionId: { in: draftSectionIds },
        },
        data: {
          status: params.severity === "critical" ? "blocked" : "warning",
        },
      });
    }

    for (const node of affected.outlineNodes as Array<Record<string, any>>) {
      await (tx as Record<string, any>).outlineNode.update({
        where: { id: node.id },
        data: {
          taintStatus,
          status: params.severity === "critical" ? "blocked" : node.status,
        },
      });
    }

    for (const section of affected.draftSections as Array<Record<string, any>>) {
      await (tx as Record<string, any>).draftSection.update({
        where: { id: section.id },
        data: {
          taintStatus,
          status: params.severity === "critical" ? "invalidated" : section.status,
        },
      });
    }

    await recordMatterEvent(
      {
        matterId: params.matterId,
        eventType: "taint_propagated",
        stage: "claim_verification",
        entityType: "authority",
        entityId: params.authorityId,
        summary: `Propagated ${taintStatus} state from authority defect to dependent artifacts.`,
        metadata: {
          defectId: params.defectId ?? null,
          defectType: params.defectType ?? null,
          affectedOutlineNodeIds: affected.outlineNodes.map((node: Record<string, any>) => node.id),
          affectedDraftSectionIds: draftSectionIds,
        },
      },
      tx
    );
  });

  return {
    taintStatus,
    affectedOutlineNodeIds: affected.outlineNodes.map((node: Record<string, any>) => String(node.id)),
    affectedDraftSectionIds: affected.draftSections.map((section: Record<string, any>) => String(section.id)),
  };
}

export async function getMatterRestartState(matterId: string) {
  const [openDefects, checkpoints, taintedNodes, taintedSections] = await Promise.all([
    db.defect.findMany({
      where: {
        matterId,
        status: { in: ["open", "pending_human", "reopened"] },
      },
      orderBy: [{ severity: "desc" }, { updatedAt: "desc" }],
      include: {
        authority: {
          select: {
            id: true,
            citedName: true,
            status: true,
            verificationStatus: true,
          },
        },
      },
    }),
    hasMethod(db, "checkpoint", "findMany")
      ? (db as Record<string, any>).checkpoint.findMany({
          where: { matterId, status: "clean" },
          orderBy: [{ createdAt: "desc" }],
          take: 1,
        })
      : Promise.resolve([]),
    db.outlineNode.findMany({
      where: {
        matterId,
        taintStatus: { in: ["suspect", "tainted"] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        taintStatus: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
    db.draftSection.findMany({
      where: {
        matterId,
        taintStatus: { in: ["suspect", "tainted"] },
      },
      select: {
        id: true,
        outlineNodeId: true,
        status: true,
        taintStatus: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
  ]);

  const openDefectSummaries = await Promise.all(
    openDefects.map(async (defect) => {
      const affected = defect.authorityId
        ? await getAffectedArtifacts(defect.authorityId, matterId)
        : { outlineNodes: [], draftSections: [] };

      return {
        id: defect.id,
        defectType: defect.defectType,
        severity: defect.severity,
        description: defect.description,
        status: defect.status,
        authorityId: defect.authorityId,
        authorityName: defect.authority?.citedName ?? null,
        restartScopeRecommended: defect.restartScopeRecommended,
        restartScopeChosen: defect.restartScopeChosen,
        restartEligible: affected.outlineNodes.length > 0 || affected.draftSections.length > 0,
        affectedOutlineNodeCount: affected.outlineNodes.length,
        affectedDraftSectionCount: affected.draftSections.length,
        preserveDiscardSummary: buildPreserveDiscardSummary(defect.restartScopeChosen ?? defect.restartScopeRecommended),
        createdAt: defect.createdAt.toISOString(),
        updatedAt: defect.updatedAt.toISOString(),
      };
    })
  );

  return {
    matterId,
    latestCleanCheckpoint: checkpoints[0]
      ? {
          id: checkpoints[0].id,
          stage: checkpoints[0].stage,
          createdAt: checkpoints[0].createdAt.toISOString(),
        }
      : null,
    openDefects: openDefectSummaries,
    taintedOutlineNodes: taintedNodes.map((node) => ({
      ...node,
      updatedAt: node.updatedAt.toISOString(),
    })),
    taintedDraftSections: taintedSections.map((section) => ({
      ...section,
      updatedAt: section.updatedAt.toISOString(),
    })),
  };
}

async function clearAffectedDrafts(nodeIds: string[]) {
  if (nodeIds.length === 0) return;

  await db.$transaction(async (tx) => {
    const sections = await tx.draftSection.findMany({
      where: {
        outlineNodeId: { in: nodeIds },
      },
      select: { id: true },
    });

    const sectionIds = sections.map((section) => section.id);
    if (sectionIds.length > 0) {
      await tx.claimSupportLink.deleteMany({
        where: {
          draftSectionId: { in: sectionIds },
        },
      });

      await tx.draftSection.updateMany({
        where: {
          id: { in: sectionIds },
        },
        data: {
          text: "",
          status: "invalidated",
          taintStatus: "clean",
          checkpointParent: null,
        },
      });
    }

    await tx.outlineNode.updateMany({
      where: { id: { in: nodeIds } },
      data: {
        status: "blocked",
        taintStatus: "clean",
      },
    });
  });
}

export async function restartFromDefect(params: {
  defectId: string;
  chosenScope?: RestartScope;
}) {
  const defect = await db.defect.findUnique({
    where: { id: params.defectId },
  });
  if (!defect) throw new DefectNotFoundError(params.defectId);
  if (!defect.authorityId) {
    throw new RestartNotAllowedError("Only authority-linked defects can trigger restart in the MVP.");
  }

  const chosenScope = params.chosenScope ?? defect.restartScopeChosen ?? defect.restartScopeRecommended;
  const propagated = await propagateAuthorityTaint({
    matterId: defect.matterId,
    authorityId: defect.authorityId,
    severity: defect.severity,
    defectId: defect.id,
    defectType: defect.defectType,
  });

  const affected = await getAffectedArtifacts(defect.authorityId, defect.matterId);

  if (chosenScope !== "authority_only") {
    if (affected.outlineNodes.length === 0) {
      throw new RestartNotAllowedError("No downstream artifacts are linked to this authority.");
    }

    for (const node of affected.outlineNodes as Array<Record<string, any>>) {
      try {
        await draftSectionFromOutlineNode({ outlineNodeId: String(node.id) }, { reason: "restart" });
      } catch {
        await clearAffectedDrafts([String(node.id)]);
      }
    }

    await createCheckpoint({
      matterId: defect.matterId,
      stage: "section_clean",
    });
  }

  await db.defect.update({
    where: { id: defect.id },
    data: { restartScopeChosen: chosenScope },
  });

  await recordMatterEvent({
    matterId: defect.matterId,
    eventType: "restart_executed",
    stage: "claim_verification",
    entityType: "defect",
    entityId: defect.id,
    summary: `Executed ${chosenScope} restart from defect ${defect.defectType}.`,
    metadata: {
      authorityId: defect.authorityId,
      affectedOutlineNodeIds: propagated.affectedOutlineNodeIds,
      affectedDraftSectionIds: propagated.affectedDraftSectionIds,
    },
  });

  return {
    defectId: defect.id,
    chosenScope,
    preserveDiscardSummary: buildPreserveDiscardSummary(chosenScope),
    affectedOutlineNodeIds: propagated.affectedOutlineNodeIds,
    affectedDraftSectionIds: propagated.affectedDraftSectionIds,
    restartState: await getMatterRestartState(defect.matterId),
  };
}
