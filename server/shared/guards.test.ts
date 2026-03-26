import test from "node:test";
import assert from "node:assert/strict";
import {
  canAttachAuthorityDownstream,
  canRunIntake,
  canRunProvenanceReview,
  canVerifyAuthority,
} from "./guards";

test("invalidated authority cannot run intake", () => {
  assert.equal(canRunIntake({ status: "invalidated" }), false);
});

test("intake-passed without excerpt cannot run provenance review", () => {
  assert.equal(
    canRunProvenanceReview({
      status: "candidate",
      retrievalStatus: "pass",
      verificationStatus: "intake_passed",
      excerptText: null,
    }),
    false
  );
});

test("blocked authority cannot attach downstream", () => {
  assert.equal(
    canAttachAuthorityDownstream({ status: "blocked", verificationStatus: "verified_with_warning" }),
    false
  );
});

test("verified_with_warning can attach downstream", () => {
  assert.equal(
    canAttachAuthorityDownstream({ status: "eligible", verificationStatus: "verified_with_warning" }),
    true
  );
});

test("verify guard fails without review fields", () => {
  const allowed = canVerifyAuthority(
    {
      status: "candidate",
      retrievalStatus: "pass",
      speakerClassification: "unknown",
      fitStatus: null,
    },
    []
  );
  assert.equal(allowed, false);
});
