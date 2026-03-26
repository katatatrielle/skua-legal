import type { ResearchItemStatus, ResearchSourceType } from "@prisma/client";

const SOURCE_TYPES: ResearchSourceType[] = [
  "case_citation",
  "snippet",
  "note",
  "link",
  "proposition",
];
const ITEM_STATUSES: ResearchItemStatus[] = ["new", "processed", "abandoned"];

export type CreateResearchItemInput = {
  matterId: string;
  rawText: string;
  sourceType: ResearchSourceType;
  notes?: string;
  runExtraction?: boolean;
};

export type UpdateResearchItemInput = {
  researchItemId: string;
  rawText?: string;
  sourceType?: ResearchSourceType;
  notes?: string;
  runExtractionOnTextChange?: boolean;
};

export type MarkResearchItemStatusInput = {
  researchItemId: string;
  status: ResearchItemStatus;
};

export type CreateAuthorityFromResearchItemInput = {
  matterId: string;
  researchItemId: string;
  selectedCandidateAuthority: string;
};

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

export function validateCreateResearchItemInput(input: CreateResearchItemInput): CreateResearchItemInput {
  assertNonEmptyString(input.matterId, "matterId");
  assertNonEmptyString(input.rawText, "rawText");
  if (!SOURCE_TYPES.includes(input.sourceType)) {
    throw new Error("sourceType is invalid");
  }

  if (input.notes !== undefined && typeof input.notes !== "string") {
    throw new Error("notes must be a string");
  }

  return {
    ...input,
    rawText: input.rawText.trim(),
    notes: input.notes?.trim(),
  };
}

export function validateUpdateResearchItemInput(input: UpdateResearchItemInput): UpdateResearchItemInput {
  assertNonEmptyString(input.researchItemId, "researchItemId");

  if (input.rawText !== undefined && input.rawText.trim().length === 0) {
    throw new Error("rawText cannot be empty when provided");
  }
  if (input.sourceType !== undefined && !SOURCE_TYPES.includes(input.sourceType)) {
    throw new Error("sourceType is invalid");
  }
  if (input.notes !== undefined && typeof input.notes !== "string") {
    throw new Error("notes must be a string");
  }

  return {
    ...input,
    rawText: input.rawText?.trim(),
    notes: input.notes?.trim(),
  };
}

export function validateMarkResearchItemStatusInput(
  input: MarkResearchItemStatusInput
): MarkResearchItemStatusInput {
  assertNonEmptyString(input.researchItemId, "researchItemId");
  if (!ITEM_STATUSES.includes(input.status)) {
    throw new Error("status is invalid");
  }
  return input;
}

export function validateCreateAuthorityFromResearchItemInput(
  input: CreateAuthorityFromResearchItemInput
): CreateAuthorityFromResearchItemInput {
  assertNonEmptyString(input.matterId, "matterId");
  assertNonEmptyString(input.researchItemId, "researchItemId");
  assertNonEmptyString(input.selectedCandidateAuthority, "selectedCandidateAuthority");
  return {
    ...input,
    selectedCandidateAuthority: input.selectedCandidateAuthority.trim(),
  };
}
