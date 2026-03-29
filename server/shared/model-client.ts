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

export type DraftPromptPayload = {
  matterTitle: string;
  matterDescription?: string | null;
  nodeTitle: string;
  proposition?: string | null;
  authorities: Array<{
    id: string;
    citedName: string;
    excerptText: string;
    excerptLocation?: string | null;
    fitStatus: ProvenanceModelResponse["fitStatus"] | "partial_support";
    verificationStatus: "verified" | "verified_with_warning";
    propositionUnderReview?: string | null;
  }>;
};

export type DraftClaimSupport = {
  claimText: string;
  claimLocation: string | null;
  authorityId: string;
  excerptText: string;
  excerptLocation: string | null;
  fitStatus: ProvenanceModelResponse["fitStatus"];
  verificationSummary: string;
  status: "verified" | "warning" | "blocked";
};

export type DraftModelResponse = {
  draftText: string;
  claims: DraftClaimSupport[];
};

export type ModelUsage = {
  provider: "heuristic" | "openai";
  model: string;
  reasoningEffort: string | null;
  latencyMs: number;
  requestTokens: number | null;
  responseTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  fallbackUsed: boolean;
};

export type ModelExecution<T> = {
  output: T;
  usage: ModelUsage;
};

type OpenAIConfig = {
  apiKey?: string;
  baseUrl: string;
  model: string;
  reasoningEffort: string;
  project?: string;
  organization?: string;
};

const SPEAKER_CLASSIFICATIONS = [
  "court_holding",
  "dicta",
  "quoted_authority",
  "party_submission",
  "procedural_history",
  "background_fact",
  "unknown",
] as const;

const FIT_STATUSES = [
  "supports",
  "supports_narrower_only",
  "partial_support",
  "does_not_support",
  "misleading_if_isolated",
] as const;

const RISK_LEVELS = ["low", "medium", "high"] as const;
const CLAIM_SUPPORT_STATUSES = ["verified", "warning", "blocked"] as const;

const PROVENANCE_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["speakerClassification", "fitStatus", "riskLevel", "verificationSummary"],
  properties: {
    speakerClassification: {
      type: "string",
      enum: [...SPEAKER_CLASSIFICATIONS],
    },
    fitStatus: {
      type: "string",
      enum: [...FIT_STATUSES],
    },
    riskLevel: {
      type: "string",
      enum: [...RISK_LEVELS],
    },
    verificationSummary: {
      type: "string",
      minLength: 1,
    },
  },
} as const;

const DRAFT_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["draftText", "claims"],
  properties: {
    draftText: {
      type: "string",
      minLength: 1,
    },
    claims: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "claimText",
          "claimLocation",
          "authorityId",
          "excerptText",
          "excerptLocation",
          "fitStatus",
          "verificationSummary",
          "status",
        ],
        properties: {
          claimText: { type: "string", minLength: 1 },
          claimLocation: { type: ["string", "null"] },
          authorityId: { type: "string", minLength: 1 },
          excerptText: { type: "string", minLength: 1 },
          excerptLocation: { type: ["string", "null"] },
          fitStatus: { type: "string", enum: [...FIT_STATUSES] },
          verificationSummary: { type: "string", minLength: 1 },
          status: { type: "string", enum: [...CLAIM_SUPPORT_STATUSES] },
        },
      },
    },
  },
} as const;

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

function heuristicDraft(payload: DraftPromptPayload): DraftModelResponse {
  const proposition = payload.proposition?.trim() || `${payload.nodeTitle} should be supported by clean authorities only.`;

  const claims = payload.authorities.map((authority, index) => {
    const excerptText = authority.excerptText.trim() || authority.citedName;
    const claimText =
      authority.propositionUnderReview?.trim() ||
      (index === 0 ? proposition : `Additional support from ${authority.citedName} reinforces the section.`);
    const status: DraftClaimSupport["status"] =
      authority.fitStatus === "supports" && authority.verificationStatus === "verified" ? "verified" : "warning";

    return {
      claimText,
      claimLocation: `Paragraph ${index + 1}`,
      authorityId: authority.id,
      excerptText,
      excerptLocation: authority.excerptLocation ?? null,
      fitStatus: authority.fitStatus,
      verificationSummary:
        status === "verified"
          ? `Verified support from ${authority.citedName}.`
          : `Use ${authority.citedName} cautiously because the support is narrower or warning-level.`,
      status,
    };
  });

  const draftText = claims
    .map(
      (claim, index) =>
        `${index === 0 ? `${payload.nodeTitle}. ` : ""}${claim.claimLocation}. ${claim.claimText}\n\n${payload.authorities[index]?.citedName}: ${claim.excerptText}`
    )
    .join("\n\n");

  return {
    draftText,
    claims,
  };
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function estimateCostUsd(requestTokens: number | null, responseTokens: number | null): number | null {
  const inputRate = parseNumber(env("OPENAI_INPUT_COST_PER_1K_TOKENS"));
  const outputRate = parseNumber(env("OPENAI_OUTPUT_COST_PER_1K_TOKENS"));
  if (inputRate === null || outputRate === null) return null;

  const inputCost = ((requestTokens ?? 0) / 1000) * inputRate;
  const outputCost = ((responseTokens ?? 0) / 1000) * outputRate;
  return Number((inputCost + outputCost).toFixed(6));
}

function shouldUseOpenAIProvider(): boolean {
  const provider = env("MODEL_PROVIDER");
  if (provider === "heuristic") return false;
  if (provider && provider !== "openai") return false;
  return Boolean(env("OPENAI_API_KEY"));
}

function shouldFallbackToHeuristic(): boolean {
  return env("MODEL_CLIENT_FALLBACK") !== "disabled";
}

function getOpenAIConfig(kind: "provenance" | "draft"): OpenAIConfig {
  const modelEnv = kind === "provenance" ? "OPENAI_PROVENANCE_MODEL" : "OPENAI_DRAFT_MODEL";
  const effortEnv =
    kind === "provenance" ? "OPENAI_REASONING_EFFORT" : "OPENAI_DRAFT_REASONING_EFFORT";

  return {
    apiKey: env("OPENAI_API_KEY"),
    baseUrl: env("OPENAI_BASE_URL") ?? "https://api.openai.com/v1",
    model: env(modelEnv) ?? "gpt-5",
    reasoningEffort: env(effortEnv) ?? env("OPENAI_REASONING_EFFORT") ?? "medium",
    project: env("OPENAI_PROJECT"),
    organization: env("OPENAI_ORGANIZATION"),
  };
}

function buildOpenAIProvenanceInput(payload: ProvenancePromptPayload) {
  const authoritySummary = [
    `Cited name: ${payload.authority.citedName}`,
    `Normalized name: ${payload.authority.normalizedName ?? "unknown"}`,
    `Jurisdiction: ${payload.authority.jurisdiction ?? "unknown"}`,
    `Court/body: ${payload.authority.courtOrBody ?? "unknown"}`,
    `Date: ${payload.authority.date ?? "unknown"}`,
    `Excerpt location: ${payload.excerptLocation ?? "unknown"}`,
    `Surrounding context: ${payload.surroundingContext ?? "none"}`,
  ].join("\n");

  return [
    {
      role: "system",
      content: [
        {
          type: "input_text",
          text:
            "You are a legal provenance reviewer. Return only JSON matching the schema. " +
            "Classify who is speaking in the excerpt, assess whether the excerpt supports the proposition, " +
            "assign a risk level, and summarize the support limits cautiously.",
        },
      ],
    },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: [
            "Authority metadata:",
            authoritySummary,
            "",
            `Proposition under review: ${payload.propositionUnderReview}`,
            "",
            "Exact excerpt:",
            payload.excerptText,
          ].join("\n"),
        },
      ],
    },
  ];
}

function buildOpenAIDraftInput(payload: DraftPromptPayload) {
  const authorityInventory = payload.authorities
    .map((authority) =>
      [
        `Authority ID: ${authority.id}`,
        `Cited name: ${authority.citedName}`,
        `Verification status: ${authority.verificationStatus}`,
        `Fit status: ${authority.fitStatus}`,
        `Excerpt location: ${authority.excerptLocation ?? "unknown"}`,
        `Proposition under review: ${authority.propositionUnderReview ?? "none"}`,
        `Excerpt: ${authority.excerptText}`,
      ].join("\n")
    )
    .join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: [
        {
          type: "input_text",
          text:
            "You draft one cautious legal memo section at a time. Use only the supplied authorities. " +
            "Return only JSON matching the schema. The draft must remain narrowly supported. " +
            "Every material claim must map to one supplied authority ID and must not invent support.",
        },
      ],
    },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: [
            `Matter title: ${payload.matterTitle}`,
            `Matter context: ${payload.matterDescription ?? "none"}`,
            `Outline node title: ${payload.nodeTitle}`,
            `Outline proposition: ${payload.proposition ?? "none"}`,
            "",
            "Available authorities:",
            authorityInventory,
          ].join("\n"),
        },
      ],
    },
  ];
}

function extractJsonText(responseBody: Record<string, unknown>): string | null {
  const outputText = responseBody.output_text;
  if (typeof outputText === "string" && outputText.trim()) return outputText;

  const output = responseBody.output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const chunk of content) {
      if (!chunk || typeof chunk !== "object") continue;
      const typedChunk = chunk as { type?: unknown; text?: unknown };
      if (
        (typedChunk.type === "output_text" || typedChunk.type === "text") &&
        typeof typedChunk.text === "string" &&
        typedChunk.text.trim()
      ) {
        return typedChunk.text;
      }
    }
  }

  return null;
}

function isEnumValue<T extends readonly string[]>(values: T, candidate: unknown): candidate is T[number] {
  return typeof candidate === "string" && (values as readonly string[]).includes(candidate);
}

function parseStructuredResponse(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") {
    throw new Error("Model response was not an object");
  }

  const response = raw as Record<string, unknown>;
  const text = extractJsonText(response);
  if (!text) throw new Error("Model response did not include output_text");
  return JSON.parse(text) as Record<string, unknown>;
}

function parseProvenanceResponse(raw: unknown): ProvenanceModelResponse {
  const parsed = parseStructuredResponse(raw);

  if (!isEnumValue(SPEAKER_CLASSIFICATIONS, parsed.speakerClassification)) {
    throw new Error("Invalid speakerClassification in model response");
  }
  if (!isEnumValue(FIT_STATUSES, parsed.fitStatus)) {
    throw new Error("Invalid fitStatus in model response");
  }
  if (!isEnumValue(RISK_LEVELS, parsed.riskLevel)) {
    throw new Error("Invalid riskLevel in model response");
  }
  if (typeof parsed.verificationSummary !== "string" || !parsed.verificationSummary.trim()) {
    throw new Error("Invalid verificationSummary in model response");
  }

  return {
    speakerClassification: parsed.speakerClassification,
    fitStatus: parsed.fitStatus,
    riskLevel: parsed.riskLevel,
    verificationSummary: parsed.verificationSummary.trim(),
  };
}

function parseDraftResponse(raw: unknown): DraftModelResponse {
  const parsed = parseStructuredResponse(raw);

  if (typeof parsed.draftText !== "string" || !parsed.draftText.trim()) {
    throw new Error("Invalid draftText in model response");
  }
  if (!Array.isArray(parsed.claims) || parsed.claims.length === 0) {
    throw new Error("Invalid claims array in model response");
  }

  const claims = parsed.claims.map((claim) => {
    if (!claim || typeof claim !== "object") {
      throw new Error("Invalid claim in model response");
    }

    const typedClaim = claim as Record<string, unknown>;
    if (typeof typedClaim.claimText !== "string" || !typedClaim.claimText.trim()) {
      throw new Error("Invalid claimText in model response");
    }
    if (typedClaim.claimLocation !== null && typeof typedClaim.claimLocation !== "string") {
      throw new Error("Invalid claimLocation in model response");
    }
    if (typeof typedClaim.authorityId !== "string" || !typedClaim.authorityId.trim()) {
      throw new Error("Invalid authorityId in model response");
    }
    if (typeof typedClaim.excerptText !== "string" || !typedClaim.excerptText.trim()) {
      throw new Error("Invalid excerptText in model response");
    }
    if (typedClaim.excerptLocation !== null && typeof typedClaim.excerptLocation !== "string") {
      throw new Error("Invalid excerptLocation in model response");
    }
    if (!isEnumValue(FIT_STATUSES, typedClaim.fitStatus)) {
      throw new Error("Invalid fitStatus in draft model response");
    }
    if (typeof typedClaim.verificationSummary !== "string" || !typedClaim.verificationSummary.trim()) {
      throw new Error("Invalid verificationSummary in draft model response");
    }
    if (!isEnumValue(CLAIM_SUPPORT_STATUSES, typedClaim.status)) {
      throw new Error("Invalid status in draft model response");
    }

    return {
      claimText: typedClaim.claimText.trim(),
      claimLocation: typedClaim.claimLocation,
      authorityId: typedClaim.authorityId.trim(),
      excerptText: typedClaim.excerptText.trim(),
      excerptLocation: typedClaim.excerptLocation,
      fitStatus: typedClaim.fitStatus,
      verificationSummary: typedClaim.verificationSummary.trim(),
      status: typedClaim.status,
    };
  });

  return {
    draftText: parsed.draftText.trim(),
    claims,
  };
}

function parseUsage(raw: Record<string, unknown>): Omit<ModelUsage, "provider" | "model" | "reasoningEffort" | "latencyMs" | "fallbackUsed"> {
  const usage = raw.usage;
  const usageRecord = usage && typeof usage === "object" ? (usage as Record<string, unknown>) : {};
  const requestTokens = parseNumber(usageRecord.input_tokens ?? usageRecord.prompt_tokens);
  const responseTokens = parseNumber(usageRecord.output_tokens ?? usageRecord.completion_tokens);
  const totalTokens = parseNumber(usageRecord.total_tokens) ?? (
    requestTokens !== null || responseTokens !== null ? (requestTokens ?? 0) + (responseTokens ?? 0) : null
  );

  return {
    requestTokens,
    responseTokens,
    totalTokens,
    estimatedCostUsd: estimateCostUsd(requestTokens, responseTokens),
  };
}

async function runOpenAIStructuredModel<T>(params: {
  kind: "provenance" | "draft";
  input: unknown;
  schemaName: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
  parse: (raw: unknown) => T;
}): Promise<ModelExecution<T>> {
  const config = getOpenAIConfig(params.kind);
  if (!config.apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };

  if (config.project) headers["OpenAI-Project"] = config.project;
  if (config.organization) headers["OpenAI-Organization"] = config.organization;

  const startedAt = Date.now();
  const res = await fetch(`${config.baseUrl}/responses`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      reasoning: { effort: config.reasoningEffort },
      input: params.input,
      max_output_tokens: params.maxOutputTokens,
      text: {
        format: {
          type: "json_schema",
          name: params.schemaName,
          strict: true,
          schema: params.schema,
        },
      },
    }),
  });

  const body = (await res.json()) as Record<string, unknown>;
  const latencyMs = Date.now() - startedAt;

  if (!res.ok) {
    const message =
      typeof body.error === "object" &&
      body.error &&
      typeof (body.error as { message?: unknown }).message === "string"
        ? (body.error as { message: string }).message
        : `OpenAI Responses API request failed with status ${res.status}`;
    throw new Error(message);
  }

  return {
    output: params.parse(body),
    usage: {
      provider: "openai",
      model: config.model,
      reasoningEffort: config.reasoningEffort,
      latencyMs,
      fallbackUsed: false,
      ...parseUsage(body),
    },
  };
}

export async function runProvenanceModelWithTelemetry(
  payload: ProvenancePromptPayload
): Promise<ModelExecution<ProvenanceModelResponse>> {
  if (!shouldUseOpenAIProvider()) {
    return {
      output: heuristicReview(payload),
      usage: {
        provider: "heuristic",
        model: "heuristic-provenance-review",
        reasoningEffort: null,
        latencyMs: 0,
        requestTokens: null,
        responseTokens: null,
        totalTokens: null,
        estimatedCostUsd: 0,
        fallbackUsed: false,
      },
    };
  }

  try {
    return await runOpenAIStructuredModel({
      kind: "provenance",
      input: buildOpenAIProvenanceInput(payload),
      schemaName: "provenance_review",
      schema: PROVENANCE_RESPONSE_SCHEMA,
      maxOutputTokens: 400,
      parse: parseProvenanceResponse,
    });
  } catch (error) {
    if (!shouldFallbackToHeuristic()) throw error;

    return {
      output: heuristicReview(payload),
      usage: {
        provider: "heuristic",
        model: "heuristic-provenance-review",
        reasoningEffort: null,
        latencyMs: 0,
        requestTokens: null,
        responseTokens: null,
        totalTokens: null,
        estimatedCostUsd: 0,
        fallbackUsed: true,
      },
    };
  }
}

export async function runDraftingModelWithTelemetry(
  payload: DraftPromptPayload
): Promise<ModelExecution<DraftModelResponse>> {
  if (!shouldUseOpenAIProvider()) {
    return {
      output: heuristicDraft(payload),
      usage: {
        provider: "heuristic",
        model: "heuristic-section-draft",
        reasoningEffort: null,
        latencyMs: 0,
        requestTokens: null,
        responseTokens: null,
        totalTokens: null,
        estimatedCostUsd: 0,
        fallbackUsed: false,
      },
    };
  }

  try {
    return await runOpenAIStructuredModel({
      kind: "draft",
      input: buildOpenAIDraftInput(payload),
      schemaName: "section_draft",
      schema: DRAFT_RESPONSE_SCHEMA,
      maxOutputTokens: 1200,
      parse: parseDraftResponse,
    });
  } catch (error) {
    if (!shouldFallbackToHeuristic()) throw error;

    return {
      output: heuristicDraft(payload),
      usage: {
        provider: "heuristic",
        model: "heuristic-section-draft",
        reasoningEffort: null,
        latencyMs: 0,
        requestTokens: null,
        responseTokens: null,
        totalTokens: null,
        estimatedCostUsd: 0,
        fallbackUsed: true,
      },
    };
  }
}

export async function runProvenanceModel(payload: ProvenancePromptPayload): Promise<ProvenanceModelResponse> {
  const result = await runProvenanceModelWithTelemetry(payload);
  return result.output;
}

export async function runDraftingModel(payload: DraftPromptPayload): Promise<DraftModelResponse> {
  const result = await runDraftingModelWithTelemetry(payload);
  return result.output;
}
