export function normalizeCitation(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[;,]+$/g, "")
    .replace(/\bv\.\b/gi, "v.");
}

export function uniqueNormalizedCitations(values: string[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const value of values) {
    const normalized = normalizeCitation(value);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    results.push(normalized);
  }

  return results;
}
