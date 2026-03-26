export type ProvenancePromptPayload = {
  authority: {
    citedName: string;
    normalizedName?: string | null;
    jurisdiction?: string | null;
    courtOrBody?: string | null;
    date?: string | null;
  };
  propositionUnderReview: string;
  excerptText: string;
  excerptLocation?: string | null;
  surroundingContext?: string | null;
};

export type ProvenanceModelResponse = {
  speakerClassification:
    | "court_holding"
    | "dicta"
    | "quoted_authority"
    | "party_submission"
    | "procedural_history"
    | "background_fact"
    | "unknown";
  fitStatus:
    | "supports"
    | "supports_narrower_only"
    | "partial_support"
    | "does_not_support"
    | "misleading_if_isolated";
  riskLevel: "low" | "medium" | "high";
  verificationSummary: string;
};

function heuristicReview(payload: ProvenancePromptPayload): ProvenanceModelResponse {
  const excerpt = payload.excerptText.toLowerCase();
  const proposition = payload.propositionUnderReview.toLowerCase();

  let speakerClassification: ProvenanceModelResponse["speakerClassification"] = "unknown";
  if (/(held|holding|we conclude)/i.test(excerpt)) speakerClassification = "court_holding";
  else if (/(dicta|obiter)/i.test(excerpt)) speakerClassification = "dicta";
  else if (/(counsel|argues|submits)/i.test(excerpt)) speakerClassification = "party_submission";
  else if (/(procedural history|background)/i.test(excerpt)) speakerClassification = "procedural_history";

  let fitStatus: ProvenanceModelResponse["fitStatus"] = "partial_support";
  let riskLevel: ProvenanceModelResponse["riskLevel"] = "medium";

  if (excerpt.includes(proposition.slice(0, Math.min(40, proposition.length)))) {
    fitStatus = "supports";
    riskLevel = "low";
  } else if (speakerClassification === "court_holding") {
    fitStatus = "supports_narrower_only";
    riskLevel = "medium";
  } else {
    fitStatus = "does_not_support";
    riskLevel = "high";
  }

  return {
    speakerClassification,
    fitStatus,
    riskLevel,
    verificationSummary:
      fitStatus === "supports"
        ? "The excerpt supports the proposition as written in the court's own voice."
        : "The excerpt does not fully support the proposition without qualification.",
  };
}

export async function runProvenanceModel(payload: ProvenancePromptPayload): Promise<ProvenanceModelResponse> {
  const result = heuristicReview(payload);
  // Strict JSON boundary in case this is swapped to an external model client later.
  return JSON.parse(JSON.stringify(result)) as ProvenanceModelResponse;
}
