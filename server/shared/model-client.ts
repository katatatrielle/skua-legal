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

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
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

function getOpenAIConfig() {
  return {
    apiKey: env("OPENAI_API_KEY"),
    baseUrl: env("OPENAI_BASE_URL") ?? "https://api.openai.com/v1",
    model: env("OPENAI_PROVENANCE_MODEL") ?? "gpt-5",
    reasoningEffort: env("OPENAI_REASONING_EFFORT") ?? "medium",
    project: env("OPENAI_PROJECT"),
    organization: env("OPENAI_ORGANIZATION"),
  };
}

function buildOpenAIInput(payload: ProvenancePromptPayload) {
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

function parseStructuredResponse(raw: unknown): ProvenanceModelResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Model response was not an object");
  }

  const response = raw as Record<string, unknown>;
  const text = extractJsonText(response);
  if (!text) throw new Error("Model response did not include output_text");

  const parsed = JSON.parse(text) as Record<string, unknown>;

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

async function runOpenAIProvenanceModel(
  payload: ProvenancePromptPayload
): Promise<ProvenanceModelResponse> {
  const config = getOpenAIConfig();
  if (!config.apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };

  if (config.project) headers["OpenAI-Project"] = config.project;
  if (config.organization) headers["OpenAI-Organization"] = config.organization;

  const res = await fetch(`${config.baseUrl}/responses`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      reasoning: { effort: config.reasoningEffort },
      input: buildOpenAIInput(payload),
      max_output_tokens: 400,
      text: {
        format: {
          type: "json_schema",
          name: "provenance_review",
          strict: true,
          schema: PROVENANCE_RESPONSE_SCHEMA,
        },
      },
    }),
  });

  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      typeof body.error === "object" &&
      body.error &&
      typeof (body.error as { message?: unknown }).message === "string"
        ? ((body.error as { message: string }).message)
        : `OpenAI Responses API request failed with status ${res.status}`;
    throw new Error(message);
  }

  return parseStructuredResponse(body);
}

export async function runProvenanceModel(payload: ProvenancePromptPayload): Promise<ProvenanceModelResponse> {
  if (!shouldUseOpenAIProvider()) {
    return heuristicReview(payload);
  }

  try {
    return await runOpenAIProvenanceModel(payload);
  } catch (error) {
    if (!shouldFallbackToHeuristic()) throw error;
    return heuristicReview(payload);
  }
}
