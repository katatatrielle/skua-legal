import type { Authority } from "@prisma/client";
import type { OpenDefectSummary } from "../authority/authority.types.ts";

export function canRunIntake(authority: Pick<Authority, "status">): boolean {
  return authority.status !== "invalidated";
}

export function canRunProvenanceReview(
  authority: Pick<Authority, "verificationStatus" | "excerptText" | "retrievalStatus" | "status">
): boolean {
  if (authority.status === "invalidated") return false;
  if (authority.retrievalStatus !== "pass") return false;
  if (!authority.excerptText?.trim()) return false;

  return (
    authority.verificationStatus === "intake_passed" ||
    authority.verificationStatus === "provenance_reviewed" ||
    authority.verificationStatus === "fit_reviewed" ||
    authority.verificationStatus === "verified" ||
    authority.verificationStatus === "verified_with_warning"
  );
}

export function canVerifyAuthority(
  authority: Pick<
    Authority,
    "retrievalStatus" | "speakerClassification" | "fitStatus" | "status" | "verificationStatus"
  >,
  openDefects: OpenDefectSummary[]
): boolean {
  if (authority.status === "invalidated") return false;
  if (authority.status === "blocked") return false;
  if (authority.retrievalStatus !== "pass") return false;
  if (authority.verificationStatus !== "fit_reviewed") return false;
  if (authority.speakerClassification === "unknown") return false;
  if (!authority.fitStatus) return false;

  const hasCriticalOpenDefect = openDefects.some(
    (d) => d.status !== "resolved" && d.status !== "waived" && d.severity === "critical"
  );
  return !hasCriticalOpenDefect;
}

export function canAttachAuthorityDownstream(
  authority: Pick<Authority, "status" | "verificationStatus">
): boolean {
  return (
    authority.status === "eligible" &&
    (authority.verificationStatus === "verified" ||
      authority.verificationStatus === "verified_with_warning")
  );
}
