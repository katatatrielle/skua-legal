import type { ResearchItemStatus } from "@prisma/client";
import { db } from "../../lib/db.ts";
import { extractCandidateAuthorityNames } from "../../lib/parsing/authority-extraction.ts";
import { normalizeCitation } from "../../lib/parsing/citation-normalization.ts";
import {
  buildSourcePlaceholder,
  retrieveSourceFromUrl,
} from "./source-retrieval.service.ts";
import { recordMatterEvent } from "../usage/usage.service.ts";
import type {
  CreateAuthorityFromResearchItemInput,
  CreateResearchItemInput,
  MarkResearchItemStatusInput,
  UpdateResearchItemInput,
} from "./research.validators.ts";
import {
  validateCreateAuthorityFromResearchItemInput,
  validateCreateResearchItemInput,
  validateMarkResearchItemStatusInput,
  validateUpdateResearchItemInput,
} from "./research.validators.ts";
import { ensureMatterExists } from "../shared/db-helpers.ts";

const RESEARCH_ITEM_STATUS_TRANSITIONS: Record<ResearchItemStatus, readonly ResearchItemStatus[]> = {
  new: ["processed", "abandoned"],
  processed: ["abandoned"],
  abandoned: ["new"],
};

function canTransition<T extends string>(map: Record<T, readonly T[]>, from: T, to: T): boolean {
  return map[from].includes(to);
}

function normalizeCandidateAuthorityNames(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function mergeNotes(...parts: Array<string | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join("\n\n");
}

export async function createResearchItem(input: CreateResearchItemInput) {
  const validated = validateCreateResearchItemInput(input);
  await ensureMatterExists(db, validated.matterId);

  let rawText = validated.rawText ?? "";
  let sourceUrl = validated.sourceUrl;
  let notes = validated.notes;

  if (!rawText.trim() && !sourceUrl && validated.sourceType === "note" && notes?.trim()) {
    rawText = notes.trim();
  }

  if (sourceUrl) {
    const retrieval = await retrieveSourceFromUrl(sourceUrl);
    sourceUrl = retrieval.sourceUrl;
    if (retrieval.ok) {
      rawText = retrieval.rawText;
      notes = mergeNotes(notes, `Retrieved from ${retrieval.sourceDatabase.toUpperCase()} at ${retrieval.sourceUrl}`);
    } else {
      rawText = rawText || buildSourcePlaceholder(sourceUrl);
      notes = mergeNotes(notes, `Source retrieval pending: ${retrieval.reason}`);
    }
  }

  const candidateAuthorityNames = validated.runExtraction !== false
    ? extractCandidateAuthorityNames(rawText)
    : [];

  const item = await db.researchItem.create({
    data: {
      matterId: validated.matterId,
      rawText,
      sourceType: validated.sourceType,
      sourceUrl,
      notes: notes || null,
      status: "new",
      candidateAuthorityNames,
    },
  });

  await recordMatterEvent({
    matterId: validated.matterId,
    eventType: "research_item_created",
    stage: "research",
    entityType: "research_item",
    entityId: item.id,
    summary: `Added ${validated.sourceType} research item to the inbox.`,
    metadata: {
      candidateAuthorityCount: candidateAuthorityNames.length,
      sourceUrl: sourceUrl ?? null,
    },
  });

  return item;
}

export async function listResearchItemsForMatter(matterId: string, status?: ResearchItemStatus) {
  await ensureMatterExists(db, matterId);

  return db.researchItem.findMany({
    where: { matterId, ...(status ? { status } : {}) },
    select: {
      id: true,
      matterId: true,
      sourceType: true,
      rawText: true,
      sourceUrl: true,
      notes: true,
      status: true,
      candidateAuthorityNames: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateResearchItem(input: UpdateResearchItemInput) {
  const validated = validateUpdateResearchItemInput(input);
  const existing = await db.researchItem.findUnique({ where: { id: validated.researchItemId } });
  if (!existing) throw new Error("Research item not found");

  const rawText = validated.rawText ?? existing.rawText;
  const shouldExtract = Boolean(validated.rawText && validated.runExtractionOnTextChange);
  const candidateAuthorityNames = shouldExtract
    ? extractCandidateAuthorityNames(rawText)
    : normalizeCandidateAuthorityNames(existing.candidateAuthorityNames);

  return db.researchItem.update({
    where: { id: existing.id },
    data: {
      rawText,
      sourceType: validated.sourceType ?? existing.sourceType,
      sourceUrl:
        validated.sourceUrl === undefined
          ? existing.sourceUrl
          : validated.sourceUrl,
      notes: validated.notes ?? existing.notes,
      candidateAuthorityNames,
    },
  });
}

export async function markResearchItemStatus(input: MarkResearchItemStatusInput) {
  const validated = validateMarkResearchItemStatusInput(input);
  const existing = await db.researchItem.findUnique({ where: { id: validated.researchItemId } });
  if (!existing) throw new Error("Research item not found");

  if (!canTransition(RESEARCH_ITEM_STATUS_TRANSITIONS, existing.status, validated.status)) {
    throw new Error(`Invalid research item status transition: ${existing.status} -> ${validated.status}`);
  }

  return db.researchItem.update({
    where: { id: existing.id },
    data: { status: validated.status },
  });
}

export async function extractCandidateAuthoritiesFromResearchItem(researchItemId: string) {
  const item = await db.researchItem.findUnique({ where: { id: researchItemId } });
  if (!item) throw new Error("Research item not found");

  const extracted = extractCandidateAuthorityNames(item.rawText);
  const updated = await db.researchItem.update({
    where: { id: researchItemId },
    data: {
      candidateAuthorityNames: extracted,
    },
  });

  return {
    extracted,
    item: updated,
  };
}

export async function createAuthorityFromResearchItem(input: CreateAuthorityFromResearchItemInput) {
  const validated = validateCreateAuthorityFromResearchItemInput(input);
  const [matter, researchItem] = await Promise.all([
    db.matter.findUnique({ where: { id: validated.matterId }, select: { id: true } }),
    db.researchItem.findUnique({ where: { id: validated.researchItemId } }),
  ]);

  if (!matter) throw new Error("Matter not found");
  if (!researchItem) throw new Error("Research item not found");
  if (researchItem.matterId !== matter.id) throw new Error("Research item does not belong to matter");

  return db.$transaction(async (tx) => {
    const authority = await tx.authority.create({
      data: {
        matterId: validated.matterId,
        preferredSourceResearchItemId: researchItem.id,
        citedName: normalizeCitation(validated.selectedCandidateAuthority),
        normalizedName: normalizeCitation(validated.selectedCandidateAuthority),
        status: "candidate",
        verificationStatus: "not_started",
        existenceStatus: "ambiguous",
        retrievalStatus: "fail_no_text",
        researchItemLinks: {
          create: { researchItemId: researchItem.id },
        },
      },
    });

    if (researchItem.status === "new") {
      await tx.researchItem.update({
        where: { id: researchItem.id },
        data: { status: "processed" },
      });
    }

    await recordMatterEvent(
      {
        matterId: validated.matterId,
        eventType: "authority_created_from_research",
        stage: "research",
        entityType: "authority",
        entityId: authority.id,
        summary: `Created authority ${authority.citedName} from research item ${researchItem.id}.`,
        metadata: {
          researchItemId: researchItem.id,
        },
      },
      tx
    );

    return authority;
  });
}

export async function mergeResearchItemsIntoAuthority(
  matterId: string,
  researchItemIds: string[],
  citedName: string
) {
  if (researchItemIds.length === 0) throw new Error("At least one research item is required");

  const items = await db.researchItem.findMany({
    where: { id: { in: researchItemIds }, matterId },
    select: { id: true, status: true },
  });

  if (items.length !== researchItemIds.length) {
    throw new Error("One or more research items were not found in matter");
  }

  return db.$transaction(async (tx) => {
    const authority = await tx.authority.create({
      data: {
        matterId,
        citedName: normalizeCitation(citedName),
        normalizedName: normalizeCitation(citedName),
        preferredSourceResearchItemId: items[0]?.id,
        status: "candidate",
        verificationStatus: "not_started",
        existenceStatus: "ambiguous",
        retrievalStatus: "fail_no_text",
        researchItemLinks: {
          createMany: {
            data: items.map((item) => ({ researchItemId: item.id })),
          },
        },
      },
    });

    await tx.researchItem.updateMany({
      where: { id: { in: items.filter((item) => item.status === "new").map((item) => item.id) } },
      data: { status: "processed" },
    });

    return authority;
  });
}
