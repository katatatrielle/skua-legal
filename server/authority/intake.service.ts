import type { IntakeResult } from "../../lib/types";

function detectPinpointType(text: string): IntakeResult["pinpointType"] {
  const hasParagraphMarkers = /(?:\bpara\.?\s*\d+\b|\[\d+\])/i.test(text);
  if (hasParagraphMarkers) return "paragraphs";

  const hasPageMarkers = /\b(?:p\.|pp\.)\s*\d+/i.test(text);
  if (hasPageMarkers) return "pages";

  return "none";
}

function extractExcerptLocation(text: string): string | undefined {
  const paragraphMatch = text.match(/(?:\bpara\.?\s*(\d+)\b|\[(\d+)\])/i);
  if (paragraphMatch) return `para ${paragraphMatch[1] ?? paragraphMatch[2]}`;

  const pageMatch = text.match(/\b(?:p\.|pp\.)\s*(\d+)/i);
  if (pageMatch) return `p. ${pageMatch[1]}`;

  return undefined;
}

export function runIntakeChecks(params: {
  citedName: string;
  providedSourceText?: string;
  providedLocator?: string;
}): IntakeResult {
  const sourceText = params.providedSourceText?.trim();
  const locator = params.providedLocator?.trim();

  if (sourceText) {
    return {
      existenceStatus: "pass",
      retrievalStatus: "pass",
      pinpointType: detectPinpointType(sourceText),
      excerptText: sourceText,
      excerptLocation: extractExcerptLocation(sourceText),
    };
  }

  if (locator) {
    return {
      existenceStatus: "ambiguous",
      retrievalStatus: "fail_no_text",
      pinpointType: "unknown",
      defect: {
        defectType: "TEXT_NOT_RETRIEVED",
        severity: "major",
        description: `Unable to retrieve source text from locator: ${locator}`,
      },
    };
  }

  return {
    existenceStatus: "ambiguous",
    retrievalStatus: "fail_no_text",
    pinpointType: "none",
    defect: {
      defectType: "AUTH_AMBIGUOUS_MATCH",
      severity: "major",
      description: `Citation-only intake for "${params.citedName}" is unresolved without source text`,
    },
  };
}
