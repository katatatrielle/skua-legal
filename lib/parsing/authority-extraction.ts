import { uniqueNormalizedCitations } from "./citation-normalization.ts";

const NEUTRAL_CITATION_REGEX =
  /\b\d{4}\s+(?:ONCA|ONSC|SCC|ABCA|ABQB|BCCA|BCSC|CanLII)\s+\d+\b/gi;
const V_PATTERN_REGEX =
  /\b[A-Z][\w'.-]*(?:\s+[A-Z][\w'.-]*)*\s+v\.?\s+[A-Z][\w'.-]*(?:\s+[A-Z][\w'.-]*)*\b/g;
const COMMON_REPORTER_REGEX = /\b[A-Z][\w'.-]+(?:\s+[A-Z][\w'.-]+)*,\s*\[\d{4}\]\s+\d+\s+[A-Z.]+\s+\d+\b/g;

export function extractCandidateAuthorityNames(rawText: string): string[] {
  const matches = [
    ...(rawText.match(NEUTRAL_CITATION_REGEX) ?? []),
    ...(rawText.match(V_PATTERN_REGEX) ?? []),
    ...(rawText.match(COMMON_REPORTER_REGEX) ?? []),
  ];

  return uniqueNormalizedCitations(matches);
}
