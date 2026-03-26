"use client";

import { useCallback, useState } from "react";
import type { SourceType } from "./types";

interface ResearchItemFormProps {
  onSubmit: (data: { rawText: string; sourceType: SourceType; notes: string }) => Promise<void>;
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
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async () => {
    if (!rawText.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ rawText: rawText.trim(), sourceType, notes: notes.trim() });
      setRawText("");
      setNotes("");
    } finally {
      setSubmitting(false);
    }
  }, [notes, onSubmit, rawText, sourceType]);

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
        placeholder="Paste research text, citation, or notes here..."
        className="w-full min-h-[120px] border rounded p-2 text-sm"
      />

      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes..."
        className="w-full border rounded p-2 text-sm"
      />

      <button
        type="submit"
        disabled={!rawText.trim() || submitting}
        className="w-full border rounded p-2 text-sm disabled:opacity-60"
      >
        {submitting ? "Adding..." : "Add to Inbox"}
      </button>
    </form>
  );
}
