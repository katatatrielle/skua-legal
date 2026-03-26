import type { IntakeResult } from "./authority.types.ts";

const MAX_EXCERPT_LENGTH = 1600;

export function detectParagraphMarkers(text: string): boolean {
  return /(?:\[\d+\]|\bparas?\.?\s*\d+(?:\s*[-–]\s*\d+)?)/i.test(text);
}

export function detectPageMarkers(text: string): boolean {
  return /(?:\bpage\s+\d+\b|\bpp?\.?\s*\d+(?:\s*[-–]\s*\d+)?)/i.test(text);
}

function detectPinpointType(text: string): IntakeResult["pinpointType"] {
  if (detectParagraphMarkers(text)) return "paragraphs";
  if (detectPageMarkers(text)) return "pages";
  return "none";
}

function firstParagraphRange(text: string): string | undefined {
  const all = [...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
  if (all.length === 0) return undefined;
  const start = all[0];
  const end = all[Math.min(2, all.length - 1)];
  return start === end ? `paras ${start}` : `paras ${start}-${end}`;
}

function firstPageRange(text: string): string | undefined {
  const m = text.match(/\b(?:page|pp?\.?)\s*(\d+)(?:\s*[-–]\s*(\d+))?/i);
  if (!m) return undefined;
  if (!m[2]) return `p ${m[1]}`;
  return `pp ${m[1]}-${m[2]}`;
}

export function extractExcerpt(text: string): { excerptText?: string; excerptLocation?: string } {
  const pinpointType = detectPinpointType(text);
  const clean = text.trim();
  if (!clean) return {};
  if (clean.length <= MAX_EXCERPT_LENGTH) {
    return {
      excerptText: clean,
      excerptLocation:
        pinpointType === "paragraphs"
          ? firstParagraphRange(clean)
          : pinpointType === "pages"
            ? firstPageRange(clean)
            : undefined,
    };
  }

  return {
    excerptText: clean.slice(0, MAX_EXCERPT_LENGTH).trim(),
    excerptLocation:
      pinpointType === "paragraphs"
        ? firstParagraphRange(clean)
        : pinpointType === "pages"
          ? firstPageRange(clean)
          : undefined,
  };
}

async function fetchLocatorText(locator: string): Promise<string | null> {
  if (locator.startsWith("text:")) return locator.slice(5).trim() || null;
  if (locator.startsWith("missing:")) return "__AUTHORITY_NOT_FOUND__";
  return null;
}

export async function runDeterministicIntake(params: {
  citedName: string;
  normalizedName?: string | null;
  providedSourceText?: string;
  providedLocator?: string;
}): Promise<IntakeResult> {
  const sourceText = params.providedSourceText?.trim();
  const locator = params.providedLocator?.trim();

  if (sourceText) {
    const { excerptText, excerptLocation } = extractExcerpt(sourceText);
    return {
      existenceStatus: "pass",
      retrievalStatus: "pass",
      pinpointType: detectPinpointType(sourceText),
      excerptText,
      excerptLocation,
    };
  }

  if (locator) {
    const fetchedText = await fetchLocatorText(locator);
    if (fetchedText === "__AUTHORITY_NOT_FOUND__") {
      return {
        existenceStatus: "fail_not_found",
        retrievalStatus: "fail_no_text",
        pinpointType: "unknown",
        defect: {
          defectType: "AUTH_NOT_FOUND",
          severity: "critical",
          description: `Authority could not be found for "${params.normalizedName ?? params.citedName}"`,
        },
      };
    }

    if (!fetchedText) {
      return {
        existenceStatus: "ambiguous",
        retrievalStatus: "fail_no_text",
        pinpointType: "unknown",
        defect: {
          defectType: "TEXT_NOT_RETRIEVED",
          severity: "major",
          description: `Locator could not be retrieved for "${params.normalizedName ?? params.citedName}"`,
        },
      };
    }

    const { excerptText, excerptLocation } = extractExcerpt(fetchedText);
    return {
      existenceStatus: "pass",
      retrievalStatus: "pass",
      pinpointType: detectPinpointType(fetchedText),
      excerptText,
      excerptLocation,
    };
  }

  return {
    existenceStatus: "ambiguous",
    retrievalStatus: "fail_no_text",
    pinpointType: "unknown",
    defect: {
      defectType: "AUTH_AMBIGUOUS_MATCH",
      severity: "major",
      description: `Citation-only intake for "${params.normalizedName ?? params.citedName}" remains ambiguous until source text or a resolvable locator is supplied`,
    },
  };
}
