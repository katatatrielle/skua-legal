import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSourcePlaceholder,
  isPlaceholderSourceText,
  normalizeSourceUrl,
  retrieveSourceFromUrl,
} from "./source-retrieval.service.ts";

test("retrieves usable text from a supported source URL", async () => {
  const result = await retrieveSourceFromUrl(
    "https://www.canlii.org/en/on/onca/doc/2024/2024onca10/2024onca10.html",
    async () =>
      new Response(
        "<html><body><main><h1>Example v Sample</h1><p>[12] The court held the duty was engaged.</p><p>[13] The employer failed to show undue hardship.</p></main></body></html>",
        { status: 200 }
      )
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.sourceDatabase, "canlii");
    assert.match(result.rawText, /Example v Sample/);
    assert.match(result.rawText, /\[12\]/);
  }
});

test("returns retrieval failure when source text is not usable", async () => {
  const result = await retrieveSourceFromUrl(
    "https://example.com/short",
    async () => new Response("<html><body>short</body></html>", { status: 200 })
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /usable source text/i);
  }
});

test("placeholder helper marks URL-only source text", () => {
  const placeholder = buildSourcePlaceholder("https://example.com/source");
  assert.equal(isPlaceholderSourceText(placeholder), true);
  assert.equal(isPlaceholderSourceText("actual excerpt text"), false);
});

test("normalizes source URLs by removing fragments", () => {
  assert.equal(
    normalizeSourceUrl("https://example.com/case#para42"),
    "https://example.com/case"
  );
});
