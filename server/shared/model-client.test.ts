import test from "node:test";
import assert from "node:assert/strict";
import {
  runDraftingModel,
  runProvenanceModel,
  type DraftPromptPayload,
  type ProvenancePromptPayload,
} from "./model-client.ts";

const SAMPLE_PAYLOAD: ProvenancePromptPayload = {
  authority: {
    citedName: "Example v. Sample",
    normalizedName: "Example v. Sample",
    jurisdiction: "Canada",
    courtOrBody: "SCC",
    date: "2024-01-01",
  },
  propositionUnderReview: "The court held that employers owe a duty of care in these circumstances.",
  excerptText: "[12] The court held that employers owe a duty of care in these circumstances.",
  excerptLocation: "para 12",
  surroundingContext: null,
};

const SAMPLE_DRAFT_PAYLOAD: DraftPromptPayload = {
  matterTitle: "Demo Matter",
  matterDescription: "Testing section drafting",
  nodeTitle: "Accommodation documentation rule",
  proposition: "Employers must document accommodation efforts before asserting undue hardship.",
  authorities: [
    {
      id: "auth_1",
      citedName: "Example v. Sample",
      excerptText: "[12] The court held that employers must document accommodation efforts before asserting undue hardship.",
      excerptLocation: "para 12",
      fitStatus: "supports",
      verificationStatus: "verified",
      propositionUnderReview:
        "Employers must document accommodation efforts before asserting undue hardship.",
    },
  ],
};

function snapshotEnv() {
  return {
    MODEL_PROVIDER: process.env.MODEL_PROVIDER,
    MODEL_CLIENT_FALLBACK: process.env.MODEL_CLIENT_FALLBACK,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_PROVENANCE_MODEL: process.env.OPENAI_PROVENANCE_MODEL,
    OPENAI_DRAFT_MODEL: process.env.OPENAI_DRAFT_MODEL,
    OPENAI_REASONING_EFFORT: process.env.OPENAI_REASONING_EFFORT,
    OPENAI_DRAFT_REASONING_EFFORT: process.env.OPENAI_DRAFT_REASONING_EFFORT,
    OPENAI_INPUT_COST_PER_1K_TOKENS: process.env.OPENAI_INPUT_COST_PER_1K_TOKENS,
    OPENAI_OUTPUT_COST_PER_1K_TOKENS: process.env.OPENAI_OUTPUT_COST_PER_1K_TOKENS,
    OPENAI_PROJECT: process.env.OPENAI_PROJECT,
    OPENAI_ORGANIZATION: process.env.OPENAI_ORGANIZATION,
  };
}

function restoreEnv(env: ReturnType<typeof snapshotEnv>) {
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

test("uses heuristic review when no OpenAI config is present", async () => {
  const env = snapshotEnv();
  delete process.env.MODEL_PROVIDER;
  delete process.env.OPENAI_API_KEY;

  try {
    const result = await runProvenanceModel(SAMPLE_PAYLOAD);
    assert.equal(result.speakerClassification, "court_holding");
    assert.equal(result.fitStatus, "supports");
    assert.equal(result.riskLevel, "low");
  } finally {
    restoreEnv(env);
  }
});

test("uses OpenAI Responses API when configured", async () => {
  const env = snapshotEnv();
  const originalFetch = globalThis.fetch;

  process.env.MODEL_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_BASE_URL = "https://example.test/v1";
  process.env.OPENAI_PROVENANCE_MODEL = "gpt-5";
  process.env.OPENAI_REASONING_EFFORT = "medium";

  globalThis.fetch = (async (input, init) => {
    assert.equal(String(input), "https://example.test/v1/responses");
    assert.equal(init?.method, "POST");

    const headers = init?.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer test-key");

    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    assert.equal(body.model, "gpt-5");
    assert.deepEqual(body.reasoning, { effort: "medium" });

    return new Response(
      JSON.stringify({
        output_text: JSON.stringify({
          speakerClassification: "dicta",
          fitStatus: "partial_support",
          riskLevel: "medium",
          verificationSummary: "The excerpt helps but does not fully support the proposition.",
        }),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }) as typeof fetch;

  try {
    const result = await runProvenanceModel(SAMPLE_PAYLOAD);
    assert.deepEqual(result, {
      speakerClassification: "dicta",
      fitStatus: "partial_support",
      riskLevel: "medium",
      verificationSummary: "The excerpt helps but does not fully support the proposition.",
    });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(env);
  }
});

test("falls back to heuristic when OpenAI request fails", async () => {
  const env = snapshotEnv();
  const originalFetch = globalThis.fetch;

  process.env.MODEL_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "test-key";
  delete process.env.MODEL_CLIENT_FALLBACK;

  globalThis.fetch = (async () => {
    throw new Error("network failure");
  }) as typeof fetch;

  try {
    const result = await runProvenanceModel(SAMPLE_PAYLOAD);
    assert.equal(result.speakerClassification, "court_holding");
    assert.equal(result.fitStatus, "supports");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(env);
  }
});

test("surfaces provider errors when fallback is disabled", async () => {
  const env = snapshotEnv();
  const originalFetch = globalThis.fetch;

  process.env.MODEL_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "test-key";
  process.env.MODEL_CLIENT_FALLBACK = "disabled";

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        error: { message: "bad request" },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }) as typeof fetch;

  try {
    await assert.rejects(runProvenanceModel(SAMPLE_PAYLOAD), /bad request/);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(env);
  }
});

test("uses heuristic drafting when no OpenAI config is present", async () => {
  const env = snapshotEnv();
  delete process.env.MODEL_PROVIDER;
  delete process.env.OPENAI_API_KEY;

  try {
    const result = await runDraftingModel(SAMPLE_DRAFT_PAYLOAD);
    assert.match(result.draftText, /Accommodation documentation rule/);
    assert.equal(result.claims.length, 1);
    assert.equal(result.claims[0]?.authorityId, "auth_1");
  } finally {
    restoreEnv(env);
  }
});

test("uses OpenAI Responses API for section drafting when configured", async () => {
  const env = snapshotEnv();
  const originalFetch = globalThis.fetch;

  process.env.MODEL_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_BASE_URL = "https://example.test/v1";
  process.env.OPENAI_DRAFT_MODEL = "gpt-5";
  process.env.OPENAI_DRAFT_REASONING_EFFORT = "medium";

  globalThis.fetch = (async (input, init) => {
    assert.equal(String(input), "https://example.test/v1/responses");
    assert.equal(init?.method, "POST");

    return new Response(
      JSON.stringify({
        output_text: JSON.stringify({
          draftText: "Accommodation documentation rule. Paragraph 1. Employers must document accommodation efforts.",
          claims: [
            {
              claimText: "Employers must document accommodation efforts.",
              claimLocation: "Paragraph 1",
              authorityId: "auth_1",
              excerptText:
                "[12] The court held that employers must document accommodation efforts before asserting undue hardship.",
              excerptLocation: "para 12",
              fitStatus: "supports",
              verificationSummary: "Direct support from a court holding.",
              status: "verified",
            },
          ],
        }),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }) as typeof fetch;

  try {
    const result = await runDraftingModel(SAMPLE_DRAFT_PAYLOAD);
    assert.match(result.draftText, /Accommodation documentation rule/);
    assert.equal(result.claims[0]?.status, "verified");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(env);
  }
});
