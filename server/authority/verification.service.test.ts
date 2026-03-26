import test from "node:test";
import assert from "node:assert/strict";
import { mapProvenanceResultToDefect } from "./verification.service.ts";

test("maps unsupported propositions to critical provenance defect", () => {
  const defect = mapProvenanceResultToDefect({
    speakerClassification: "court_holding",
    fitStatus: "does_not_support",
    riskLevel: "high",
    verificationSummary: "The proposition is unsupported.",
  });

  assert.deepEqual(defect, {
    defectType: "PROPOSITION_UNSUPPORTED",
    severity: "critical",
  });
});

test("maps quoted authority with non-low risk to adopted-source defect", () => {
  const defect = mapProvenanceResultToDefect({
    speakerClassification: "quoted_authority",
    fitStatus: "partial_support",
    riskLevel: "medium",
    verificationSummary: "Quoted source not clearly adopted.",
  });

  assert.deepEqual(defect, {
    defectType: "NONADOPTED_QUOTED_SOURCE",
    severity: "major",
  });
});
