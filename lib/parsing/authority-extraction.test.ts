import test from "node:test";
import assert from "node:assert/strict";
import { extractCandidateAuthorityNames } from "./authority-extraction.ts";

test("extracts v-pattern case names from messy text", () => {
  const result = extractCandidateAuthorityNames(
    "Check R. v. Jordan and maybe also Smith v Jones before drafting the memo."
  );

  assert.deepEqual(result, ["R. v. Jordan", "Smith v Jones"]);
});

test("extracts neutral citations without duplicates", () => {
  const result = extractCandidateAuthorityNames(
    "2016 SCC 27 is key. Repeat 2016 SCC 27 here. Also consider 2024 ONCA 10."
  );

  assert.deepEqual(result, ["2016 SCC 27", "2024 ONCA 10"]);
});
