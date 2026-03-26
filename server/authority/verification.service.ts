import type { Authority } from "@prisma/client";
import type { ProvenanceReviewResult } from "../../lib/types";

export async function runMockProvenanceFitReview(params: {
  authority: Authority;
  propositionUnderReview: string;
}): Promise<ProvenanceReviewResult> {
  const proposition = params.propositionUnderReview.toLowerCase();
  const excerpt = (params.authority.excerptText ?? "").toLowerCase();

  let fitStatus: ProvenanceReviewResult["fitStatus"] = "partial_support";
  let riskLevel: ProvenanceReviewResult["riskLevel"] = "medium";
  let speakerClassification: ProvenanceReviewResult["speakerClassification"] = "unknown";
  let defectType: string | undefined;

  if (excerpt.includes("held") || excerpt.includes("holding")) {
    speakerClassification = "court_holding";
  } else if (excerpt.includes("dicta")) {
    speakerClassification = "dicta";
    defectType = "DICTA_NOT_HOLDING";
  } else if (excerpt.includes("argues") || excerpt.includes("submits")) {
    speakerClassification = "party_submission";
    defectType = "COUNSEL_ARG_AS_LAW";
  }

  if (excerpt.includes(proposition.slice(0, Math.min(32, proposition.length)))) {
    fitStatus = "supports";
    riskLevel = "low";
  } else if (speakerClassification === "court_holding") {
    fitStatus = "supports_narrower_only";
    riskLevel = "medium";
    defectType = defectType ?? "SUPPORTS_NARROWER_ONLY";
  } else {
    fitStatus = "does_not_support";
    riskLevel = "high";
    defectType = defectType ?? "PROPOSITION_UNSUPPORTED";
  }

  return {
    speakerClassification,
    fitStatus,
    riskLevel,
    verificationSummary:
      fitStatus === "supports"
        ? "Excerpt appears to support the proposition as written."
        : "Excerpt does not cleanly support the proposition without qualification.",
    defectType,
  };
}
