"use client";

import { useCallback, useState } from "react";
import type { SourceType } from "./types";

interface ResearchItemFormProps {
  onSubmit: (data: { rawText?: string; sourceType: SourceType; sourceUrl?: string; notes: string }) => Promise<void>;
}

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "snippet", label: "Snippet" },
  { value: "case_citation", label: "Case Citation" },
  { value: "link", label: "Link" },
  { value: "proposition", label: "Proposition" },
];

export function ResearchItemForm({ onSubmit }: ResearchItemFormProps) {
  const [rawText, setRawText] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("note");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async () => {
    if (!rawText.trim() && !sourceUrl.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        rawText: rawText.trim() || undefined,
        sourceType,
        sourceUrl: sourceUrl.trim() || undefined,
        notes: notes.trim(),
      });
      setRawText("");
      setSourceUrl("");
      setNotes("");
    } finally {
      setSubmitting(false);
    }
  }, [notes, onSubmit, rawText, sourceType, sourceUrl]);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await submit();
      }}
    >
      <div className="flex items-center gap-2">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as SourceType)}
        >
          {SOURCE_TYPES.map((st) => (
            <option key={st.value} value={st.value}>
              {st.label}
            </option>
          ))}
        </select>
        <span className="text-xs opacity-70">Ctrl/Cmd+Enter to submit</span>
      </div>

      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            await submit();
          }
        }}
        placeholder="Paste research text, citation, or excerpt here. Leave blank if you're adding a URL-backed source only."
        className="w-full min-h-[120px] border rounded p-2 text-sm"
        data-testid="research-raw-text-input"
      />

      <input
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        placeholder="Optional source URL, e.g. a CanLII decision link"
        className="w-full border rounded p-2 text-sm"
        data-testid="research-source-url-input"
      />

      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes..."
        className="w-full border rounded p-2 text-sm"
        data-testid="research-notes-input"
      />

      <button
        type="submit"
        disabled={(!rawText.trim() && !sourceUrl.trim()) || submitting}
        className="w-full border rounded p-2 text-sm disabled:opacity-60"
        data-testid="research-submit-button"
      >
        {submitting ? "Adding..." : "Add to Inbox"}
      </button>
    </form>
  );
}
