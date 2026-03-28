import { db } from "../../lib/db.ts";
import { ensureMatterExists } from "../shared/db-helpers.ts";

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

  return db.outlineNode.create({
    data: {
      matterId: input.matterId,
      title: input.title.trim(),
      proposition: input.proposition?.trim() || null,
      nodeType: input.nodeType ?? "analysis",
      orderIndex,
      status: "draft",
    },
  });
}

export async function attachAuthorityToOutlineNode(input: { outlineNodeId: string; authorityId: string }) {
  const outlineNode = await db.outlineNode.findUnique({
    where: { id: input.outlineNodeId },
    select: { id: true, matterId: true },
  });
  if (!outlineNode) throw new Error("Outline node not found");

  const authority = await db.authority.findUnique({
    where: { id: input.authorityId },
    select: {
      id: true,
      matterId: true,
      status: true,
      verificationStatus: true,
    },
  });

  if (!authority || authority.matterId !== outlineNode.matterId) {
    throw new Error("Authority not found for outline node");
  }
  if (authority.status !== "eligible" || !["verified", "verified_with_warning"].includes(authority.verificationStatus)) {
    throw new Error("Only verified authorities can be attached to an outline node");
  }

  await db.outlineNodeAuthority.upsert({
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

  return db.outlineNode.findUnique({
    where: { id: outlineNode.id },
    include: {
      authorityLinks: {
        include: {
          authority: true,
        },
      },
    },
  });
}

function composeDraftText(nodeTitle: string, proposition: string | null, authorities: Array<{
  citedName: string;
  excerptText: string | null;
  excerptLocation: string | null;
}>) {
  const intro = proposition
    ? `${nodeTitle}. ${proposition.trim()}`
    : `${nodeTitle}. This section is drafted from the currently attached verified authorities.`;

  const support = authorities
    .map((authority) => {
      const excerpt = authority.excerptText?.slice(0, 260).trim() ?? "No excerpt captured yet.";
      const locator = authority.excerptLocation ? ` (${authority.excerptLocation})` : "";
      return `${authority.citedName}${locator}: ${excerpt}`;
    })
    .join("\n\n");

  return `${intro}\n\n${support}`;
}

export async function draftSectionFromOutlineNode(input: { outlineNodeId: string }) {
  const outlineNode = await db.outlineNode.findUnique({
    where: { id: input.outlineNodeId },
    include: {
      authorityLinks: {
        include: {
          authority: true,
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

  const cleanAuthorities = outlineNode.authorityLinks
    .map((link) => link.authority)
    .filter((authority) => authority.status === "eligible")
    .filter((authority) => ["verified", "verified_with_warning"].includes(authority.verificationStatus));

  if (cleanAuthorities.length === 0) {
    throw new Error("No attached authorities are eligible for drafting");
  }

  const text = composeDraftText(outlineNode.title, outlineNode.proposition, cleanAuthorities);

  return db.$transaction(async (tx) => {
    const existingSection = outlineNode.draftSections[0];
    const section = existingSection
      ? await tx.draftSection.update({
          where: { id: existingSection.id },
          data: {
            text,
            status: "draft",
            taintStatus: "clean",
          },
        })
      : await tx.draftSection.create({
          data: {
            matterId: outlineNode.matterId,
            outlineNodeId: outlineNode.id,
            text,
            status: "draft",
            taintStatus: "clean",
          },
        });

    await tx.claimSupportLink.deleteMany({ where: { draftSectionId: section.id } });

    for (const authority of cleanAuthorities) {
      await tx.claimSupportLink.create({
        data: {
          draftSectionId: section.id,
          claimText: outlineNode.proposition?.trim() || outlineNode.title,
          authorityId: authority.id,
          excerptText: authority.excerptText || authority.citedName,
          excerptLocation: authority.excerptLocation,
          speakerClassification: authority.speakerClassification,
          fitStatus: authority.fitStatus ?? "partial_support",
          verificationSummary: `Attached from authority review as ${authority.verificationStatus}.`,
          status: authority.verificationStatus === "verified" ? "verified" : "warning",
        },
      });
    }

    await tx.outlineNode.update({
      where: { id: outlineNode.id },
      data: { status: "ready", taintStatus: "clean" },
    });

    return tx.draftSection.findUnique({
      where: { id: section.id },
      include: {
        claimSupportLinks: {
          include: {
            authority: {
              select: { id: true, citedName: true },
            },
          },
        },
      },
    });
  });
}
