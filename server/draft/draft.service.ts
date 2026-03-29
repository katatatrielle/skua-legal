import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db.ts";
import { ensureMatterExists } from "../shared/db-helpers.ts";
import { canAttachAuthorityDownstream } from "../shared/guards.ts";
import { runDraftingModelWithTelemetry, type DraftClaimSupport } from "../shared/model-client.ts";
import { createCheckpoint, recordMatterEvent, recordModelRun } from "../usage/usage.service.ts";

type DbClient = Prisma.TransactionClient | typeof db;

type AuthorityForDraft = {
  id: string;
  citedName: string;
  verificationStatus: "verified" | "verified_with_warning";
  status: string;
  fitStatus: DraftClaimSupport["fitStatus"] | null;
  excerptText: string | null;
  excerptLocation: string | null;
  propositionUnderReview: string | null;
};

async function getMatterSummary(matterId: string) {
  const matter = await db.matter.findUnique({
    where: { id: matterId },
    select: {
      title: true,
      mainIssue: true,
      courseOrContext: true,
      objective: true,
    },
  });

  return {
    title: matter?.title ?? "Untitled matter",
    description: matter?.mainIssue ?? matter?.courseOrContext ?? matter?.objective ?? null,
  };
}

function normalizeClaimSupport(
  claims: DraftClaimSupport[],
  authorities: AuthorityForDraft[],
  fallbackClaimText: string
): DraftClaimSupport[] {
  const byAuthorityId = new Map(authorities.map((authority) => [authority.id, authority]));

  const normalized = claims.flatMap((claim, index): DraftClaimSupport[] => {
      const authority = byAuthorityId.get(claim.authorityId);
      if (!authority) return [];

      return [{
        claimText: claim.claimText?.trim() || fallbackClaimText,
        claimLocation: claim.claimLocation?.trim() || `Paragraph ${index + 1}`,
        authorityId: authority.id,
        excerptText: claim.excerptText?.trim() || authority.excerptText || authority.citedName,
        excerptLocation: claim.excerptLocation?.trim() || authority.excerptLocation || null,
        fitStatus: claim.fitStatus || authority.fitStatus || "partial_support",
        verificationSummary:
          claim.verificationSummary?.trim() ||
          `Draft claim supported by ${authority.citedName} with ${authority.verificationStatus} status.`,
        status:
          claim.status === "blocked"
            ? "warning"
            : claim.status ??
              (authority.verificationStatus === "verified" && authority.fitStatus === "supports"
                ? "verified"
                : "warning"),
      }];
    });

  if (normalized.length > 0) return normalized;

  return authorities.map((authority, index) => ({
    claimText: index === 0 ? fallbackClaimText : `Additional support from ${authority.citedName}.`,
    claimLocation: `Paragraph ${index + 1}`,
    authorityId: authority.id,
    excerptText: authority.excerptText || authority.citedName,
    excerptLocation: authority.excerptLocation,
    fitStatus: authority.fitStatus ?? "partial_support",
    verificationSummary: `Fallback support record from ${authority.citedName}.`,
    status: authority.verificationStatus === "verified" && authority.fitStatus === "supports" ? "verified" : "warning",
  }));
}

function selectCleanAuthorities(authorities: AuthorityForDraft[]) {
  return authorities
    .filter((authority) =>
      canAttachAuthorityDownstream({
        status: authority.status as "eligible" | "candidate" | "blocked" | "invalidated",
        verificationStatus: authority.verificationStatus,
      })
    )
    .filter((authority) => Boolean(authority.excerptText?.trim()));
}

export async function listOutlineNodesForMatter(matterId: string) {
  await ensureMatterExists(db, matterId);

  return db.outlineNode.findMany({
    where: { matterId },
    include: {
      authorityLinks: {
        include: {
          authority: {
            select: {
              id: true,
              citedName: true,
              verificationStatus: true,
              status: true,
              fitStatus: true,
              excerptText: true,
              excerptLocation: true,
            },
          },
        },
      },
      draftSections: {
        include: {
          claimSupportLinks: {
            include: {
              authority: {
                select: { id: true, citedName: true },
              },
            },
            orderBy: [{ claimLocation: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 1,
      },
    },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
  });
}

export async function listEligibleAuthoritiesForMatter(matterId: string) {
  await ensureMatterExists(db, matterId);

  return db.authority.findMany({
    where: {
      matterId,
      status: "eligible",
      verificationStatus: { in: ["verified", "verified_with_warning"] },
    },
    select: {
      id: true,
      citedName: true,
      verificationStatus: true,
      fitStatus: true,
      excerptText: true,
      excerptLocation: true,
      propositionUnderReview: true,
    },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function createOutlineNode(input: {
  matterId: string;
  title: string;
  proposition?: string;
  nodeType?: "issue" | "rule" | "analysis" | "counterargument" | "conclusion";
}) {
  await ensureMatterExists(db, input.matterId);

  const orderIndex = await db.outlineNode.count({ where: { matterId: input.matterId } });

  const node = await db.outlineNode.create({
    data: {
      matterId: input.matterId,
      title: input.title.trim(),
      proposition: input.proposition?.trim() || null,
      nodeType: input.nodeType ?? "analysis",
      orderIndex,
      status: "draft",
    },
  });

  await recordMatterEvent({
    matterId: input.matterId,
    eventType: "outline_node_created",
    stage: "outlining",
    entityType: "outline_node",
    entityId: node.id,
    summary: `Created outline node "${node.title}".`,
  });

  return node;
}

export async function attachAuthorityToOutlineNode(input: { outlineNodeId: string; authorityId: string }) {
  const outlineNode = await db.outlineNode.findUnique({
    where: { id: input.outlineNodeId },
    select: { id: true, matterId: true, title: true },
  });
  if (!outlineNode) throw new Error("Outline node not found");

  const authority = await db.authority.findUnique({
    where: { id: input.authorityId },
    select: {
      id: true,
      matterId: true,
      citedName: true,
      status: true,
      verificationStatus: true,
    },
  });

  if (!authority || authority.matterId !== outlineNode.matterId) {
    throw new Error("Authority not found for outline node");
  }
  if (!canAttachAuthorityDownstream(authority)) {
    throw new Error("Only verified authorities can be attached to an outline node");
  }

  return db.$transaction(async (tx) => {
    await tx.outlineNodeAuthority.upsert({
      where: {
        outlineNodeId_authorityId: {
          outlineNodeId: outlineNode.id,
          authorityId: authority.id,
        },
      },
      update: {},
      create: {
        outlineNodeId: outlineNode.id,
        authorityId: authority.id,
      },
    });

    await createCheckpoint(
      {
        matterId: outlineNode.matterId,
        stage: "outline_clean",
      },
      tx
    );

    await recordMatterEvent(
      {
        matterId: outlineNode.matterId,
        eventType: "authority_attached",
        stage: "outlining",
        entityType: "outline_node",
        entityId: outlineNode.id,
        summary: `Attached ${authority.citedName} to outline node "${outlineNode.title}".`,
        metadata: {
          authorityId: authority.id,
        },
      },
      tx
    );

    return tx.outlineNode.findUnique({
      where: { id: outlineNode.id },
      include: {
        authorityLinks: {
          include: {
            authority: true,
          },
        },
      },
    });
  });
}

async function buildDraftExecution(params: {
  outlineNodeId: string;
  reason: "draft" | "restart";
}) {
  const outlineNode = await db.outlineNode.findUnique({
    where: { id: params.outlineNodeId },
    include: {
      authorityLinks: {
        include: {
          authority: {
            select: {
              id: true,
              citedName: true,
              verificationStatus: true,
              status: true,
              fitStatus: true,
              excerptText: true,
              excerptLocation: true,
              propositionUnderReview: true,
            },
          },
        },
      },
      draftSections: {
        orderBy: [{ updatedAt: "desc" }],
        take: 1,
      },
    },
  });

  if (!outlineNode) throw new Error("Outline node not found");
  if (outlineNode.authorityLinks.length === 0) {
    throw new Error("Attach at least one verified authority before drafting");
  }

  const cleanAuthorities = selectCleanAuthorities(
    outlineNode.authorityLinks.map((link) => link.authority as AuthorityForDraft)
  );

  if (cleanAuthorities.length === 0) {
    throw new Error("No attached authorities are eligible for drafting");
  }

  const matter = await getMatterSummary(outlineNode.matterId);
  const fallbackClaimText = outlineNode.proposition?.trim() || outlineNode.title;
  const execution = await runDraftingModelWithTelemetry({
    matterTitle: matter.title,
    matterDescription: matter.description,
    nodeTitle: outlineNode.title,
    proposition: outlineNode.proposition,
    authorities: cleanAuthorities.map((authority) => ({
      id: authority.id,
      citedName: authority.citedName,
      excerptText: authority.excerptText ?? authority.citedName,
      excerptLocation: authority.excerptLocation,
      fitStatus: authority.fitStatus ?? "partial_support",
      verificationStatus: authority.verificationStatus,
      propositionUnderReview: authority.propositionUnderReview,
    })),
  });

  const claims = normalizeClaimSupport(execution.output.claims, cleanAuthorities, fallbackClaimText);

  return {
    outlineNode,
    execution,
    claims,
    fallbackClaimText,
    eventType: params.reason === "restart" ? "section_restarted" : "section_drafted",
  };
}

async function saveDraftExecution(
  tx: DbClient,
  params: Awaited<ReturnType<typeof buildDraftExecution>>
) {
  const existingSection = params.outlineNode.draftSections[0];
  const section = existingSection
    ? await tx.draftSection.update({
        where: { id: existingSection.id },
        data: {
          text: params.execution.output.draftText,
          status: "draft",
          taintStatus: "clean",
        },
      })
    : await tx.draftSection.create({
        data: {
          matterId: params.outlineNode.matterId,
          outlineNodeId: params.outlineNode.id,
          text: params.execution.output.draftText,
          status: "draft",
          taintStatus: "clean",
        },
      });

  await tx.claimSupportLink.deleteMany({ where: { draftSectionId: section.id } });

  for (const claim of params.claims) {
    await tx.claimSupportLink.create({
      data: {
        draftSectionId: section.id,
        claimText: claim.claimText,
        claimLocation: claim.claimLocation,
        authorityId: claim.authorityId,
        excerptText: claim.excerptText,
        excerptLocation: claim.excerptLocation,
        fitStatus: claim.fitStatus,
        verificationSummary: claim.verificationSummary,
        status: claim.status,
      },
    });
  }

  await tx.outlineNode.update({
    where: { id: params.outlineNode.id },
    data: { status: "ready", taintStatus: "clean" },
  });

  await createCheckpoint(
    {
      matterId: params.outlineNode.matterId,
      stage: "section_clean",
      linkDraftSectionId: section.id,
    },
    tx
  );

  await recordModelRun(
    {
      matterId: params.outlineNode.matterId,
      outlineNodeId: params.outlineNode.id,
      draftSectionId: section.id,
      stage: "section_drafting",
      provider: params.execution.usage.provider,
      model: params.execution.usage.model,
      reasoningEffort: params.execution.usage.reasoningEffort,
      status: "succeeded",
      latencyMs: params.execution.usage.latencyMs,
      requestTokens: params.execution.usage.requestTokens,
      responseTokens: params.execution.usage.responseTokens,
      totalTokens: params.execution.usage.totalTokens,
      estimatedCostUsd: params.execution.usage.estimatedCostUsd,
      metadata: {
        claimCount: params.claims.length,
        fallbackUsed: params.execution.usage.fallbackUsed,
      },
    },
    tx
  );

  await recordMatterEvent(
    {
      matterId: params.outlineNode.matterId,
      eventType: params.eventType,
      stage: "drafting",
      entityType: "draft_section",
      entityId: section.id,
      summary:
        params.eventType === "section_restarted"
          ? `Restarted draft section for "${params.outlineNode.title}" from clean authorities.`
          : `Drafted section for "${params.outlineNode.title}".`,
      metadata: {
        outlineNodeId: params.outlineNode.id,
        claimCount: params.claims.length,
      },
    },
    tx
  );

  return tx.draftSection.findUnique({
    where: { id: section.id },
    include: {
      claimSupportLinks: {
        include: {
          authority: {
            select: { id: true, citedName: true },
          },
        },
        orderBy: [{ claimLocation: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}

async function recordDraftFailure(params: {
  matterId: string;
  outlineNodeId: string;
  error: unknown;
}) {
  const provider =
    process.env.MODEL_PROVIDER === "openai" || process.env.OPENAI_API_KEY ? "openai" : "heuristic";
  const model = process.env.OPENAI_DRAFT_MODEL ?? "gpt-5";
  const message = params.error instanceof Error ? params.error.message : "Drafting failed";

  await recordModelRun({
    matterId: params.matterId,
    outlineNodeId: params.outlineNodeId,
    stage: "section_drafting",
    provider,
    model,
    reasoningEffort: process.env.OPENAI_DRAFT_REASONING_EFFORT ?? process.env.OPENAI_REASONING_EFFORT ?? null,
    status: "failed",
    errorMessage: message,
  });

  await recordMatterEvent({
    matterId: params.matterId,
    eventType: "section_drafting_failed",
    stage: "drafting",
    entityType: "outline_node",
    entityId: params.outlineNodeId,
    summary: `Draft generation failed: ${message}`,
  });
}

export async function draftSectionFromOutlineNode(
  input: { outlineNodeId: string },
  options: { reason?: "draft" | "restart" } = {}
) {
  const outlineNode = await db.outlineNode.findUnique({
    where: { id: input.outlineNodeId },
    select: { id: true, matterId: true },
  });
  if (!outlineNode) throw new Error("Outline node not found");

  try {
    const execution = await buildDraftExecution({
      outlineNodeId: input.outlineNodeId,
      reason: options.reason ?? "draft",
    });

    return db.$transaction((tx) => saveDraftExecution(tx, execution));
  } catch (error) {
    await recordDraftFailure({
      matterId: outlineNode.matterId,
      outlineNodeId: outlineNode.id,
      error,
    });
    throw error;
  }
}
