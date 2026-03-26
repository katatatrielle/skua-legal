"use server";

import type {
  ListAuthoritiesForMatterInput,
  RunAuthorityIntakeChecksInput,
  RunAuthorityProvenanceReviewInput,
  SetAuthorityDecisionInput,
} from "./authority.validators";
import {
  getAuthorityForReview,
  listAuthoritiesForMatter,
  listAuthorityDefects,
  runAuthorityIntakeChecks,
  runAuthorityProvenanceReview,
  setAuthorityDecision,
} from "./authority.service";

export async function listAuthoritiesForMatterAction(input: ListAuthoritiesForMatterInput) {
  return listAuthoritiesForMatter(input);
}

export async function getAuthorityForReviewAction(authorityId: string) {
  return getAuthorityForReview(authorityId);
}

export async function runAuthorityIntakeChecksAction(input: RunAuthorityIntakeChecksInput) {
  return runAuthorityIntakeChecks(input);
}

export async function runAuthorityProvenanceReviewAction(input: RunAuthorityProvenanceReviewInput) {
  return runAuthorityProvenanceReview(input);
}

export async function setAuthorityDecisionAction(input: SetAuthorityDecisionInput) {
  return setAuthorityDecision(input);
}

export async function listAuthorityDefectsAction(authorityId: string) {
  return listAuthorityDefects(authorityId);
}
