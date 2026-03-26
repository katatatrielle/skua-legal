import type { AuthorityStatus, DefectSeverity, RiskLevel, VerificationStatus } from "./types";

const BASE_BADGE = "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium";

function toneClasses(tone: "slate" | "blue" | "amber" | "green" | "red") {
  switch (tone) {
    case "blue":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "green":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "red":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function AuthorityStatusBadge({ status }: { status: AuthorityStatus }) {
  const tone =
    status === "eligible" ? "green" : status === "blocked" ? "amber" : status === "invalidated" ? "red" : "slate";

  return <span className={`${BASE_BADGE} ${toneClasses(tone)}`}>{formatLabel(status)}</span>;
}

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  const tone =
    status === "verified"
      ? "green"
      : status === "verified_with_warning" || status === "fit_reviewed"
        ? "amber"
        : status === "blocked" || status === "invalidated"
          ? "red"
          : "blue";

  return <span className={`${BASE_BADGE} ${toneClasses(tone)}`}>{formatLabel(status)}</span>;
}

export function AuthorityRiskBadge({ risk }: { risk: RiskLevel | null }) {
  if (!risk) {
    return <span className={`${BASE_BADGE} ${toneClasses("slate")}`}>risk pending</span>;
  }

  const tone = risk === "low" ? "green" : risk === "medium" ? "amber" : "red";
  return <span className={`${BASE_BADGE} ${toneClasses(tone)}`}>{risk} risk</span>;
}

export function DefectSeverityBadge({ severity }: { severity: DefectSeverity }) {
  const tone = severity === "minor" ? "blue" : severity === "major" ? "amber" : "red";
  return <span className={`${BASE_BADGE} ${toneClasses(tone)}`}>{severity}</span>;
}
