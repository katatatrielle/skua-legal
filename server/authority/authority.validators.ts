import type { AuthorityStatus, DefectSeverity, RestartScope, VerificationStatus } from "@prisma/client";

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
  status?: AuthorityStatus;
  verificationStatus?: VerificationStatus;
};

export type RunAuthorityIntakeChecksInput = {
  authorityId: string;
  providedSourceText?: string;
  providedLocator?: string;
};

export type RunAuthorityProvenanceReviewInput = {
  authorityId: string;
  propositionUnderReview: string;
};

export type SetAuthorityDecisionInput = {
  authorityId: string;
  decision: "verified" | "verified_with_warning" | "blocked" | "invalidated";
  userNote?: string;
};

export type CreateAuthorityDefectInput = {
  authorityId: string;
  defectType: string;
  severity: DefectSeverity;
  description: string;
  restartScopeRecommended: RestartScope;
};

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

export function validateListAuthoritiesForMatterInput(input: ListAuthoritiesForMatterInput) {
  assertNonEmptyString(input.matterId, "matterId");
  if (input.status && !AUTHORITY_STATUSES.includes(input.status)) throw new Error("Invalid authority status");
  if (input.verificationStatus && !VERIFICATION_STATUSES.includes(input.verificationStatus)) {
    throw new Error("Invalid verification status");
  }
  return input;
}

export function validateRunAuthorityIntakeChecksInput(input: RunAuthorityIntakeChecksInput) {
  assertNonEmptyString(input.authorityId, "authorityId");
  return {
    ...input,
    providedSourceText: input.providedSourceText?.trim(),
    providedLocator: input.providedLocator?.trim(),
  };
}

export function validateRunAuthorityProvenanceReviewInput(input: RunAuthorityProvenanceReviewInput) {
  assertNonEmptyString(input.authorityId, "authorityId");
  assertNonEmptyString(input.propositionUnderReview, "propositionUnderReview");
  return { ...input, propositionUnderReview: input.propositionUnderReview.trim() };
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
  return input;
}
