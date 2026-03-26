import test from "node:test";
import assert from "node:assert/strict";
import { runDeterministicIntake } from "./intake.service.ts";

test("Mode A: detects paragraph markers", async () => {
  const result = await runDeterministicIntake({
    citedName: "R v Test",
    providedSourceText: "[12] The rule applies.\n[13] Further analysis.",
  });
  assert.equal(result.existenceStatus, "pass");
  assert.equal(result.retrievalStatus, "pass");
  assert.equal(result.pinpointType, "paragraphs");
});

test("Mode A: detects page markers", async () => {
  const result = await runDeterministicIntake({
    citedName: "R v Test",
    providedSourceText: "p. 4 The analysis appears here.",
  });
  assert.equal(result.pinpointType, "pages");
});

test("Mode A: no markers returns none", async () => {
  const result = await runDeterministicIntake({
    citedName: "R v Test",
    providedSourceText: "No pinpoint markers in this text block.",
  });
  assert.equal(result.pinpointType, "none");
});

test("Mode B: locator success behaves like text mode", async () => {
  const result = await runDeterministicIntake({
    citedName: "R v Test",
    providedLocator: "text:[8] Locator body text.",
  });
  assert.equal(result.retrievalStatus, "pass");
  assert.equal(result.pinpointType, "paragraphs");
});

test("Mode B: locator failure returns fail_no_text", async () => {
  const result = await runDeterministicIntake({
    citedName: "R v Test",
    providedLocator: "https://example.com/not-supported",
  });
  assert.equal(result.retrievalStatus, "fail_no_text");
  assert.equal(result.defect?.defectType, "TEXT_NOT_RETRIEVED");
});

test("Mode B: explicit missing locator returns not found defect", async () => {
  const result = await runDeterministicIntake({
    citedName: "R v Missing",
    providedLocator: "missing:R v Missing",
  });
  assert.equal(result.existenceStatus, "fail_not_found");
  assert.equal(result.retrievalStatus, "fail_no_text");
  assert.equal(result.defect?.defectType, "AUTH_NOT_FOUND");
});

test("Mode C: citation only returns ambiguous and fail_no_text", async () => {
  const result = await runDeterministicIntake({
    citedName: "R v Test",
  });
  assert.equal(result.existenceStatus, "ambiguous");
  assert.equal(result.retrievalStatus, "fail_no_text");
  assert.equal(result.defect?.defectType, "AUTH_AMBIGUOUS_MATCH");
});
