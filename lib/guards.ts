import type { Authority, Defect } from "@prisma/client";

export function canRunIntake(authority: Authority): boolean {
  return authority.status !== "invalidated";
}

export function canRunProvenanceReview(authority: Authority): boolean {
  if (authority.verificationStatus !== "intake_passed") {
    return false;
  }

  return Boolean(authority.excerptText && authority.excerptText.trim().length > 0);
}

export function canVerifyAuthority(authority: Authority, defects: Defect[]): boolean {
  if (authority.verificationStatus !== "fit_reviewed") {
    return false;
  }

  return !defects.some((defect) => defect.status === "open" && defect.severity === "critical");
}

export function canAttachAuthorityDownstream(authority: Authority): boolean {
  return (
    authority.status === "eligible" &&
    (authority.verificationStatus === "verified" ||
      authority.verificationStatus === "verified_with_warning")
  );
}
