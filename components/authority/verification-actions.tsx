"use client";

import { useEffect, useState } from "react";
import type { AuthorityReviewRecord } from "./types";

type Decision = "verified" | "verified_with_warning" | "blocked" | "invalidated";

interface VerificationActionsProps {
  authority: AuthorityReviewRecord;
  onSetDecision: (input: {
    authorityId: string;
    decision: Decision;
    userNote?: string;
  }) => Promise<void>;
  isMutating?: boolean;
}

const DECISIONS: Array<{ value: Decision; label: string }> = [
  { value: "verified", label: "Verify" },
  { value: "verified_with_warning", label: "Verify with warning" },
  { value: "blocked", label: "Block" },
  { value: "invalidated", label: "Invalidate" },
];

export function VerificationActions({
  authority,
  onSetDecision,
  isMutating = false,
}: VerificationActionsProps) {
  const [userNote, setUserNote] = useState("");

  useEffect(() => {
    setUserNote("");
  }, [authority.id]);

  return (
    <section className="border rounded-lg bg-white p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Decision</h2>
        <p className="mt-1 text-xs text-slate-500">
          Record the final authority state after intake and provenance review.
        </p>
      </div>

      <label className="grid gap-1 text-sm">
        <span className="font-medium text-slate-700">Note</span>
        <textarea
          value={userNote}
          onChange={(event) => setUserNote(event.target.value)}
          rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Optional rationale for blocking, invalidating, or warning."
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {DECISIONS.map((decision) => (
          <button
            key={decision.value}
            type="button"
            disabled={isMutating}
            className="rounded-md border px-3 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid={`decision-${decision.value}`}
            onClick={() =>
              onSetDecision({
                authorityId: authority.id,
                decision: decision.value,
                userNote: userNote.trim() || undefined,
              })
            }
          >
            {decision.label}
          </button>
        ))}
      </div>
    </section>
  );
}
