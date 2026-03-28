const MAX_EXTRACTED_TEXT_LENGTH = 20_000;

export type RetrievedSource =
  | {
      ok: true;
      sourceUrl: string;
      rawText: string;
      sourceDatabase: "canlii" | "generic";
    }
  | {
      ok: false;
      sourceUrl: string;
      reason: string;
    };

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function collapseWhitespace(text: string): string {
  return text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function stripHtml(html: string): string {
  return collapseWhitespace(
    decodeEntities(
      html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6|br)>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
    )
  ).slice(0, MAX_EXTRACTED_TEXT_LENGTH);
}

export function normalizeSourceUrl(sourceUrl: string): string {
  const parsed = new URL(sourceUrl.trim());
  parsed.hash = "";
  return parsed.toString();
}

function detectSourceDatabase(sourceUrl: string): "canlii" | "generic" {
  return new URL(sourceUrl).hostname.includes("canlii.org") ? "canlii" : "generic";
}

export async function retrieveSourceFromUrl(
  sourceUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<RetrievedSource> {
  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeSourceUrl(sourceUrl);
  } catch {
    return { ok: false, sourceUrl, reason: "Invalid URL" };
  }

  const response = await fetchImpl(normalizedUrl, {
    headers: {
      "User-Agent": "cleanroom-law-source-fetcher/0.1",
      Accept: "text/html,application/xhtml+xml",
    },
  }).catch(() => null);

  if (!response || !response.ok) {
    return { ok: false, sourceUrl: normalizedUrl, reason: "Unable to retrieve source URL" };
  }

  const html = await response.text();
  const rawText = stripHtml(html);
  if (rawText.length < 80) {
    return { ok: false, sourceUrl: normalizedUrl, reason: "Retrieved page did not contain usable source text" };
  }

  return {
    ok: true,
    sourceUrl: normalizedUrl,
    rawText,
    sourceDatabase: detectSourceDatabase(normalizedUrl),
  };
}

export function buildSourcePlaceholder(sourceUrl: string) {
  return `Source URL only: ${sourceUrl}`;
}

export function isPlaceholderSourceText(rawText: string) {
  return rawText.trim().startsWith("Source URL only:");
}
