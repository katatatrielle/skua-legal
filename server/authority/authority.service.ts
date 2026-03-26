import type { Authority, VerificationStatus } from "@prisma/client";
import { db } from "../../lib/db.ts";
import {
  createOrReuseAuthorityDefect,
  createAuthorityDefect as createAuthorityDefectRecord,
  listOpenDefectsByAuthority,
} from "../defects/defect.service.ts";
import { requireAuthority, ensureMatterExists } from "../shared/db-helpers.ts";
import {
  AuthorityNotFoundError,
  AuthorityDecisionNotAllowedError,
  IntakeNotAllowedError,
  InvalidAuthorityStateError,
  ProvenanceReviewNotAllowedError,
} from "../shared/errors.ts";
import { canRunIntake, canRunProvenanceReview, canVerifyAuthority } from "../shared/guards.ts";
import type { ProvenanceReviewResult } from "./authority.types.ts";
import { runDeterministicIntake } from "./intake.service.ts";
import { mapProvenanceResultToDefect, runProvenanceFitReview } from "./verification.service.ts";
import type {
  ListAuthoritiesForMatterInput,
  RunAuthorityIntakeChecksInput,
  RunAuthorityProvenanceReviewInput,
  SetAuthorityDecisionInput,
} from "./authority.validators.ts";
import type { CreateAuthorityDefectInput } from "./authority.types.ts";
import {
  validateCreateAuthorityDefectInput,
  validateListAuthoritiesForMatterInput,
  validateRunAuthorityIntakeChecksInput,
  validateRunAuthorityProvenanceReviewInput,
  validateSetAuthorityDecisionInput,
} from "./authority.validators.ts";

const AUTHORITY_STATUS_TRANSITIONS: Record<Authority["status"], readonly Authority["status"][]> = {
  candidate: ["eligible", "blocked", "invalidated"],
  eligible: ["blocked", "invalidated"],
  blocked: ["candidate", "invalidated"],
  invalidated: [],
};

const VERIFICATION_STATUS_TRANSITIONS: Record<
  Authority["verificationStatus"],
  readonly Authority["verificationStatus"][]
> = {
  not_started: ["intake_passed", "blocked", "invalidated"],
  intake_passed: ["provenance_reviewed", "fit_reviewed", "blocked", "invalidated"],
  provenance_reviewed: ["fit_reviewed", "blocked", "invalidated"],
  fit_reviewed: ["verified", "verified_with_warning", "blocked", "invalidated"],
  verified: ["blocked", "invalidated"],
  verified_with_warning: ["verified", "blocked", "invalidated"],
  blocked: ["intake_passed", "invalidated"],
  invalidated: [],
};

function canTransition<T extends string>(map: Record<T, readonly T[]>, from: T, to: T): boolean {
  return map[from].includes(to);
}

export async function listAuthoritiesForMatter(input: ListAuthoritiesForMatterInput) {
  const validated = validateListAuthoritiesForMatterInput(input);
  await ensureMatterExists(db, validated.matterId);

  const authorities = await db.authority.findMany({
    where: {
      matterId: validated.matterId,
      ...(validated.filters?.status?.length ? { status: { in: validated.filters.status } } : {}),
      ...(validated.filters?.verificationStatus?.length
        ? { verificationStatus: { in: validated.filters.verificationStatus } }
        : {}),
    },
    select: {
      id: true,
      citedName: true,
      normalizedName: true,
      status: true,
      verificationStatus: true,
      riskLevel: true,
      updatedAt: true,
      defects: {
        where: { status: { in: ["open", "pending_human", "reopened"] } },
        orderBy: [{ createdAt: "desc" }],
        select: { severity: true },
      },
      researchItemLinks: { select: { id: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return authorities
    .map((a) => ({
      id: a.id,
      citedName: a.citedName,
      normalizedName: a.normalizedName,
      status: a.status,
      verificationStatus: a.verificationStatus,
      riskLevel: a.riskLevel,
      updatedAt: a.updatedAt,
      defectCount: a.defects.length,
      latestOpenDefectSeverity: a.defects[0]?.severity ?? null,
      linkedResearchItemCount: a.researchItemLinks.length,
    }))
    .sort((a, b) => statusRank(a.verificationStatus) - statusRank(b.verificationStatus) || +b.updatedAt - +a.updatedAt);
}

function statusRank(status: VerificationStatus): number {
  if (status === "not_started") return 0;
  if (status === "intake_passed") return 1;
  if (status === "provenance_reviewed" || status === "fit_reviewed") return 2;
  if (status === "verified_with_warning" || status === "blocked") return 3;
  if (status === "verified") return 4;
  if (status === "invalidated") return 5;
  return 6;
}

export async function getAuthorityForReview(authorityId: string) {
  const trimmed = authorityId.trim();
  const authority = await db.authority.findUnique({
    where: { id: trimmed },
    include: {
      researchItemLinks: {
        include: {
          researchItem: true,
        },
      },
      defects: {
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!authority) {
    throw new AuthorityNotFoundError(trimmed);
  }
  return authority;
}

export async function runAuthorityIntakeChecks(input: RunAuthorityIntakeChecksInput) {
  const validated = validateRunAuthorityIntakeChecksInput(input);
  const authority = await requireAuthority(db, validated.authorityId);
  if (!canRunIntake(authority)) throw new IntakeNotAllowedError(validated.authorityId);

  const intake = await runDeterministicIntake({
    citedName: authority.citedName,
    normalizedName: authority.normalizedName,
    providedSourceText: validated.providedSourceText,
    providedLocator: validated.providedLocator,
  });

  const result = await db.$transaction(async (tx) => {
    const hasHardFailure = intake.retrievalStatus !== "pass";
    const nextStatus =
      intake.existenceStatus === "fail_not_found"
        ? "invalidated"
        : hasHardFailure
          ? "blocked"
          : "candidate";
    const nextVerificationStatus =
      intake.existenceStatus === "fail_not_found"
        ? "invalidated"
        : hasHardFailure
          ? "blocked"
          : "intake_passed";

    const updated = await tx.authority.update({
      where: { id: authority.id },
      data: {
        existenceStatus: intake.existenceStatus,
        retrievalStatus: intake.retrievalStatus,
        pinpointType: intake.pinpointType === "unknown" ? "none" : intake.pinpointType,
        excerptText: intake.excerptText ?? null,
        excerptLocation: intake.excerptLocation ?? null,
        speakerClassification: "unknown",
        propositionUnderReview: null,
        fitStatus: null,
        riskLevel: null,
        status: nextStatus,
        verificationStatus: nextVerificationStatus,
      },
    });

    if (intake.defect) {
      await createOrReuseAuthorityDefect({
        authorityId: authority.id,
        defectType: intake.defect.defectType,
        severity: intake.defect.severity,
        description: intake.defect.description,
        restartScopeRecommended: "authority_only",
        stageDetected: "intake",
      }, tx);
    }

    const defects = await tx.defect.findMany({
      where: { authorityId: authority.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return { authority: updated, defects };
  });

  return {
    authority: result.authority,
    intakeResult: intake,
    defects: result.defects,
  };
}

export async function runAuthorityProvenanceReview(input: RunAuthorityProvenanceReviewInput) {
  const validated = validateRunAuthorityProvenanceReviewInput(input);
  const authority = await requireAuthority(db, validated.authorityId);
  if (!canRunProvenanceReview(authority)) {
    throw new ProvenanceReviewNotAllowedError(validated.authorityId);
  }

  const review: ProvenanceReviewResult = await runProvenanceFitReview({
    authority,
    propositionUnderReview: validated.propositionUnderReview,
  });

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.authority.update({
      where: { id: authority.id },
      data: {
        propositionUnderReview: validated.propositionUnderReview,
        speakerClassification: review.speakerClassification,
        fitStatus: review.fitStatus,
        riskLevel: review.riskLevel,
        verificationStatus: "fit_reviewed",
      },
    });

    const mappedDefect = mapProvenanceResultToDefect(review);
    if (mappedDefect) {
      await createOrReuseAuthorityDefect({
        authorityId: authority.id,
        defectType: mappedDefect.defectType,
        severity: mappedDefect.severity,
        description: review.verificationSummary,
        restartScopeRecommended: "proposition",
        stageDetected: "provenance_fit_review",
      }, tx);
    }

    const defects = await tx.defect.findMany({
      where: { authorityId: authority.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return { authority: updated, defects };
  });

  return { authority: result.authority, reviewResult: review, defects: result.defects };
}

function mapDecisionToState(decision: SetAuthorityDecisionInput["decision"]) {
  switch (decision) {
    case "verified":
      return { verificationStatus: "verified" as const, status: "eligible" as const };
    case "verified_with_warning":
      return { verificationStatus: "verified_with_warning" as const, status: "eligible" as const };
    case "blocked":
      return { verificationStatus: "blocked" as const, status: "blocked" as const };
    case "invalidated":
      return { verificationStatus: "invalidated" as const, status: "invalidated" as const };
  }
}

export async function setAuthorityDecision(input: SetAuthorityDecisionInput) {
  const validated = validateSetAuthorityDecisionInput(input);
  const authority = await requireAuthority(db, validated.authorityId);
  const openDefects = await listOpenDefectsByAuthority(authority.id);

  const next = mapDecisionToState(validated.decision);
  if (!canTransition(VERIFICATION_STATUS_TRANSITIONS, authority.verificationStatus, next.verificationStatus)) {
    throw new InvalidAuthorityStateError(
      `Invalid verification status transition: ${authority.verificationStatus} -> ${next.verificationStatus}`
    );
  }
  if (!canTransition(AUTHORITY_STATUS_TRANSITIONS, authority.status, next.status)) {
    throw new InvalidAuthorityStateError(
      `Invalid authority status transition: ${authority.status} -> ${next.status}`
    );
  }
  if (
    (validated.decision === "verified" || validated.decision === "verified_with_warning") &&
    !canVerifyAuthority(authority, openDefects)
  ) {
    throw new AuthorityDecisionNotAllowedError("Authority is not eligible for verification");
  }
  if (validated.decision === "verified" && authority.fitStatus !== "supports") {
    throw new AuthorityDecisionNotAllowedError(
      "Decision 'verified' requires fitStatus='supports'. Use verified_with_warning for narrower support."
    );
  }
  if (
    validated.decision === "verified_with_warning" &&
    (!authority.fitStatus || authority.fitStatus === "does_not_support")
  ) {
    throw new AuthorityDecisionNotAllowedError(
      "Decision 'verified_with_warning' requires at least partial support."
    );
  }

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.authority.update({
      where: { id: authority.id },
      data: {
        verificationStatus: next.verificationStatus,
        status: next.status,
      },
    });

    if (validated.decision === "blocked" || validated.decision === "invalidated") {
      const defectType = validated.decision === "blocked" ? "PROPOSITION_UNSUPPORTED" : "AUTH_INVALIDATED";
      await createOrReuseAuthorityDefect({
        authorityId: authority.id,
        defectType,
        severity: validated.decision === "invalidated" ? "critical" : "major",
        description: validated.userNote || `Authority marked as ${validated.decision}`,
        restartScopeRecommended: "authority_only",
        stageDetected: "provenance_fit_review",
      }, tx);
    }

    const defects = await tx.defect.findMany({
      where: { authorityId: authority.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return { authority: updated, defects };
  });

  return result;
}

export async function listAuthorityDefects(authorityId: string) {
  return db.defect.findMany({
    where: { authorityId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function createAuthorityDefect(input: CreateAuthorityDefectInput) {
  const validated = validateCreateAuthorityDefectInput(input);
  return createAuthorityDefectRecord(validated);
}
