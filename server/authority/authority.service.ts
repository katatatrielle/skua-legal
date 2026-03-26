import type { Authority, DefectSeverity } from "@prisma/client";
import { canRunIntake, canRunProvenanceReview, canVerifyAuthority } from "../../lib/guards";
import { db } from "../../lib/db";
import { ensureAuthorityDefect } from "../defects/defect.service";
import { runIntakeChecks } from "./intake.service";
import { runMockProvenanceFitReview } from "./verification.service";
import type {
  ListAuthoritiesForMatterInput,
  RunAuthorityIntakeChecksInput,
  RunAuthorityProvenanceReviewInput,
  SetAuthorityDecisionInput,
} from "./authority.validators";
import {
  validateListAuthoritiesForMatterInput,
  validateRunAuthorityIntakeChecksInput,
  validateRunAuthorityProvenanceReviewInput,
  validateSetAuthorityDecisionInput,
} from "./authority.validators";

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
  blocked: ["intake_passed", "provenance_reviewed", "fit_reviewed", "verified", "verified_with_warning", "invalidated"],
  invalidated: [],
};

function canTransition<T extends string>(map: Record<T, readonly T[]>, from: T, to: T): boolean {
  return map[from].includes(to);
}

export async function listAuthoritiesForMatter(input: ListAuthoritiesForMatterInput) {
  const validated = validateListAuthoritiesForMatterInput(input);

  const authorities = await db.authority.findMany({
    where: {
      matterId: validated.matterId,
      ...(validated.status ? { status: validated.status } : {}),
      ...(validated.verificationStatus ? { verificationStatus: validated.verificationStatus } : {}),
    },
    include: {
      defects: {
        where: { status: { in: ["open", "pending_human", "reopened"] } },
      },
    },
    orderBy: [{ verificationStatus: "asc" }, { updatedAt: "desc" }],
  });

  return authorities.sort((a, b) => statusRank(a) - statusRank(b));
}

function statusRank(authority: Authority): number {
  if (authority.verificationStatus === "not_started") return 0;
  if (authority.verificationStatus === "intake_passed") return 1;
  if (
    authority.verificationStatus === "verified_with_warning" ||
    authority.verificationStatus === "blocked"
  ) {
    return 2;
  }
  if (authority.verificationStatus === "verified") return 3;
  if (authority.verificationStatus === "invalidated") return 4;
  return 5;
}

export async function getAuthorityForReview(authorityId: string) {
  const authority = await db.authority.findUnique({
    where: { id: authorityId },
    include: {
      researchItemLinks: {
        include: {
          researchItem: true,
        },
      },
      defects: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!authority) throw new Error("Authority not found");
  return authority;
}

export async function runAuthorityIntakeChecks(input: RunAuthorityIntakeChecksInput) {
  const validated = validateRunAuthorityIntakeChecksInput(input);
  const authority = await db.authority.findUnique({ where: { id: validated.authorityId } });
  if (!authority) throw new Error("Authority not found");
  if (!canRunIntake(authority)) throw new Error("Authority is not eligible for intake");

  const intake = runIntakeChecks({
    citedName: authority.citedName,
    providedSourceText: validated.providedSourceText,
    providedLocator: validated.providedLocator,
  });

  const verificationStatus =
    intake.retrievalStatus === "pass" ? "intake_passed" : ("blocked" as const);
  const nextStatus = intake.retrievalStatus === "pass" ? "candidate" : ("blocked" as const);

  const updated = await db.authority.update({
    where: { id: authority.id },
    data: {
      existenceStatus: intake.existenceStatus,
      retrievalStatus: intake.retrievalStatus,
      pinpointType: intake.pinpointType === "unknown" ? "none" : intake.pinpointType,
      excerptText: intake.excerptText ?? authority.excerptText,
      excerptLocation: intake.excerptLocation ?? authority.excerptLocation,
      verificationStatus,
      status: nextStatus,
    },
  });

  if (intake.defect) {
    await ensureAuthorityDefect(
      authority.id,
      intake.defect.defectType,
      intake.defect.severity,
      intake.defect.description,
      "intake"
    );
  }

  return updated;
}

export async function runAuthorityProvenanceReview(input: RunAuthorityProvenanceReviewInput) {
  const validated = validateRunAuthorityProvenanceReviewInput(input);
  const authority = await db.authority.findUnique({ where: { id: validated.authorityId } });
  if (!authority) throw new Error("Authority not found");
  if (!canRunProvenanceReview(authority)) {
    throw new Error("Authority does not satisfy provenance review preconditions");
  }

  const review = await runMockProvenanceFitReview({
    authority,
    propositionUnderReview: validated.propositionUnderReview,
  });

  const updated = await db.authority.update({
    where: { id: authority.id },
    data: {
      propositionUnderReview: validated.propositionUnderReview,
      speakerClassification: review.speakerClassification,
      fitStatus: review.fitStatus,
      riskLevel: review.riskLevel,
      verificationStatus: "fit_reviewed",
    },
  });

  if (review.defectType) {
    await ensureAuthorityDefect(
      authority.id,
      review.defectType,
      review.riskLevel === "high" ? ("critical" as DefectSeverity) : "major",
      review.verificationSummary,
      "provenance_fit_review"
    );
  }

  return {
    authority: updated,
    review,
  };
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
  const authority = await db.authority.findUnique({
    where: { id: validated.authorityId },
    include: { defects: true },
  });
  if (!authority) throw new Error("Authority not found");

  const next = mapDecisionToState(validated.decision);
  if (!canTransition(VERIFICATION_STATUS_TRANSITIONS, authority.verificationStatus, next.verificationStatus)) {
    throw new Error(
      `Invalid verification status transition: ${authority.verificationStatus} -> ${next.verificationStatus}`
    );
  }
  if (!canTransition(AUTHORITY_STATUS_TRANSITIONS, authority.status, next.status)) {
    throw new Error(`Invalid authority status transition: ${authority.status} -> ${next.status}`);
  }
  if ((validated.decision === "verified" || validated.decision === "verified_with_warning") &&
      !canVerifyAuthority(authority, authority.defects)) {
    throw new Error("Authority is not eligible to verify");
  }

  const updated = await db.authority.update({
    where: { id: authority.id },
    data: {
      verificationStatus: next.verificationStatus,
      status: next.status,
    },
  });

  if (validated.decision === "blocked" || validated.decision === "invalidated") {
    const defectType = validated.decision === "blocked" ? "PROPOSITION_UNSUPPORTED" : "AUTH_NOT_FOUND";
    await ensureAuthorityDefect(
      authority.id,
      defectType,
      validated.decision === "invalidated" ? "critical" : "major",
      validated.userNote || `Authority marked as ${validated.decision}`,
      "provenance_fit_review"
    );
  }

  return updated;
}

export async function listAuthorityDefects(authorityId: string) {
  return db.defect.findMany({
    where: { authorityId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}
