import type { AuthorityStatus, DefectSeverity, RestartScope, VerificationStatus } from "@prisma/client";
import type {
  AuthorityDecision,
  AuthorityListFilters,
  CreateAuthorityDefectInput,
  IntakeInput,
  ProvenanceReviewInput,
} from "./authority.types";

const AUTHORITY_STATUSES: AuthorityStatus[] = ["candidate", "eligible", "blocked", "invalidated"];
const VERIFICATION_STATUSES: VerificationStatus[] = [
  "not_started",
  "intake_passed",
  "provenance_reviewed",
  "fit_reviewed",
  "verified",
  "verified_with_warning",
  "blocked",
  "invalidated",
];
const DEFECT_SEVERITIES: DefectSeverity[] = ["critical", "major", "minor"];
const RESTART_SCOPES: RestartScope[] = ["none", "authority_only", "proposition", "outline_node", "section"];

export type ListAuthoritiesForMatterInput = {
  matterId: string;
  filters?: AuthorityListFilters;
};

export type RunAuthorityIntakeChecksInput = IntakeInput;

export type RunAuthorityProvenanceReviewInput = ProvenanceReviewInput;

export type SetAuthorityDecisionInput = {
  authorityId: string;
  decision: AuthorityDecision;
  userNote?: string;
};

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

export function validateListAuthoritiesForMatterInput(input: ListAuthoritiesForMatterInput) {
  assertNonEmptyString(input.matterId, "matterId");
  if (input.filters?.status?.some((s) => !AUTHORITY_STATUSES.includes(s))) {
    throw new Error("Invalid authority status filter");
  }
  if (input.filters?.verificationStatus?.some((s) => !VERIFICATION_STATUSES.includes(s))) {
    throw new Error("Invalid verification status filter");
  }
  return {
    ...input,
    matterId: input.matterId.trim(),
  };
}

export function validateRunAuthorityIntakeChecksInput(input: RunAuthorityIntakeChecksInput) {
  assertNonEmptyString(input.authorityId, "authorityId");
  const providedSourceText = input.providedSourceText?.trim() || undefined;
  const providedLocator = input.providedLocator?.trim() || undefined;
  return {
    authorityId: input.authorityId.trim(),
    providedSourceText,
    providedLocator,
  };
}

export function validateRunAuthorityProvenanceReviewInput(input: RunAuthorityProvenanceReviewInput) {
  assertNonEmptyString(input.authorityId, "authorityId");
  assertNonEmptyString(input.propositionUnderReview, "propositionUnderReview");
  const propositionUnderReview = input.propositionUnderReview.trim();
  if (propositionUnderReview.length < 8) {
    throw new Error("propositionUnderReview must be non-trivial");
  }
  return { authorityId: input.authorityId.trim(), propositionUnderReview };
}

export function validateSetAuthorityDecisionInput(input: SetAuthorityDecisionInput) {
  assertNonEmptyString(input.authorityId, "authorityId");
  if (!["verified", "verified_with_warning", "blocked", "invalidated"].includes(input.decision)) {
    throw new Error("Invalid authority decision");
  }
  return {
    ...input,
    userNote: input.userNote?.trim(),
  };
}

export function validateCreateAuthorityDefectInput(input: CreateAuthorityDefectInput) {
  assertNonEmptyString(input.authorityId, "authorityId");
  assertNonEmptyString(input.defectType, "defectType");
  assertNonEmptyString(input.description, "description");
  if (!DEFECT_SEVERITIES.includes(input.severity)) throw new Error("Invalid defect severity");
  if (!RESTART_SCOPES.includes(input.restartScopeRecommended)) throw new Error("Invalid restart scope");
  return {
    ...input,
    authorityId: input.authorityId.trim(),
    defectType: input.defectType.trim(),
    description: input.description.trim(),
  };
}
