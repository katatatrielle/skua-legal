"use server";

import type { ResearchItemStatus } from "@prisma/client";
import {
  createAuthorityFromResearchItem,
  createResearchItem,
  extractCandidateAuthoritiesFromResearchItem,
  listResearchItemsForMatter,
  markResearchItemStatus,
  mergeResearchItemsIntoAuthority,
  updateResearchItem,
} from "./research.service";
import type {
  CreateAuthorityFromResearchItemInput,
  CreateResearchItemInput,
  MarkResearchItemStatusInput,
  UpdateResearchItemInput,
} from "./research.validators";

export async function createResearchItemAction(input: CreateResearchItemInput) {
  return createResearchItem(input);
}

export async function listResearchItemsForMatterAction(matterId: string, status?: ResearchItemStatus) {
  return listResearchItemsForMatter(matterId, status);
}

export async function updateResearchItemAction(input: UpdateResearchItemInput) {
  return updateResearchItem(input);
}

export async function markResearchItemStatusAction(input: MarkResearchItemStatusInput) {
  return markResearchItemStatus(input);
}

export async function extractCandidateAuthoritiesFromResearchItemAction(researchItemId: string) {
  return extractCandidateAuthoritiesFromResearchItem(researchItemId);
}

export async function createAuthorityFromResearchItemAction(input: CreateAuthorityFromResearchItemInput) {
  return createAuthorityFromResearchItem(input);
}

export async function mergeResearchItemsIntoAuthorityAction(
  matterId: string,
  researchItemIds: string[],
  citedName: string
) {
  return mergeResearchItemsIntoAuthority(matterId, researchItemIds, citedName);
}
