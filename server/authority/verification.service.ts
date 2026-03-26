import type { Authority } from "@prisma/client";
import {
  runProvenanceModel,
  type ProvenanceModelResponse,
  type ProvenancePromptPayload,
} from "../shared/model-client.ts";
import type { ProvenanceReviewResult } from "./authority.types.ts";

export function buildProvenancePromptPayload(params: {
  authority: Authority;
  propositionUnderReview: string;
}): ProvenancePromptPayload {
  return {
    authority: {
      citedName: params.authority.citedName,
      normalizedName: params.authority.normalizedName,
      jurisdiction: params.authority.jurisdiction,
      courtOrBody: params.authority.court,
      date: params.authority.date?.toISOString() ?? null,
    },
    propositionUnderReview: params.propositionUnderReview,
    excerptText: params.authority.excerptText ?? "",
    excerptLocation: params.authority.excerptLocation,
    surroundingContext: null,
  };
}

function parseModelResult(raw: ProvenanceModelResponse): ProvenanceReviewResult {
  return {
    speakerClassification: raw.speakerClassification,
    fitStatus: raw.fitStatus,
    riskLevel: raw.riskLevel,
    verificationSummary: raw.verificationSummary,
  };
}

export async function runProvenanceFitReview(params: {
  authority: Authority;
  propositionUnderReview: string;
}): Promise<ProvenanceReviewResult> {
  const payload = buildProvenancePromptPayload(params);
  const modelResult = await runProvenanceModel(payload);
  return parseModelResult(modelResult);
}

export function mapProvenanceResultToDefect(
  result: ProvenanceReviewResult
): { defectType: string; severity: "critical" | "major" | "minor" } | null {
  if (result.speakerClassification === "party_submission") {
    return { defectType: "COUNSEL_ARG_AS_LAW", severity: "major" };
  }
  if (result.speakerClassification === "quoted_authority" && result.riskLevel !== "low") {
    return { defectType: "NONADOPTED_QUOTED_SOURCE", severity: "major" };
  }
  if (result.fitStatus === "does_not_support") {
    return { defectType: "PROPOSITION_UNSUPPORTED", severity: "critical" };
  }
  if (result.fitStatus === "supports_narrower_only") {
    return { defectType: "SUPPORTS_NARROWER_ONLY", severity: "major" };
  }
  if (result.speakerClassification === "dicta") {
    return { defectType: "DICTA_NOT_HOLDING", severity: "major" };
  }
  if (result.speakerClassification === "procedural_history") {
    return { defectType: "PROCEDURAL_NOT_SUBSTANTIVE", severity: "major" };
  }
  return null;
}
