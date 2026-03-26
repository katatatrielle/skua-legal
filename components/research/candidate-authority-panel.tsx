"use client";

import { useMemo, useState } from "react";
import type { ResearchItem } from "./types";

interface CandidateAuthorityPanelProps {
  selectedItem: ResearchItem | null;
  onCreateAuthority: (researchItemId: string, citedName: string) => Promise<void>;
  onCreateAuthorityAndOpenReview: (researchItemId: string, citedName: string) => Promise<void>;
}

export function CandidateAuthorityPanel({
  selectedItem,
  onCreateAuthority,
  onCreateAuthorityAndOpenReview,
}: CandidateAuthorityPanelProps) {
  const [customName, setCustomName] = useState("");
  const candidates = useMemo(() => selectedItem?.candidateAuthorityNames ?? [], [selectedItem]);

  if (!selectedItem) {
    return (
      <section className="border rounded p-4">
        <p className="text-sm opacity-70">Select a research item to see candidate authorities.</p>
      </section>
    );
  }

  return (
    <section className="border rounded p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Candidate Authorities</h3>
        <p className="text-xs opacity-70 mt-1">From selected research item</p>
      </div>

      {candidates.length > 0 ? (
        <div className="space-y-2">
          {candidates.map((name, i) => (
            <div key={`${name}-${i}`} className="flex items-center justify-between gap-2 border rounded p-2">
              <span className="text-sm">{name}</span>
              <button
                type="button"
                className="text-xs border rounded px-2 py-1"
                onClick={async () => onCreateAuthority(selectedItem.id, name)}
              >
                Create
              </button>
              <button
                type="button"
                className="text-xs border rounded px-2 py-1"
                onClick={async () => onCreateAuthorityAndOpenReview(selectedItem.id, name)}
              >
                Create + Open Review
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs opacity-70">No extracted candidates. Add one manually below.</p>
      )}

      <div className="space-y-2">
        <p className="text-xs uppercase opacity-70">Manual Entry</p>
        <div className="flex gap-2">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="flex-1 border rounded p-2 text-sm"
            placeholder="e.g. Marbury v. Madison"
            onKeyDown={async (e) => {
              if (e.key === "Enter" && customName.trim()) {
                await onCreateAuthority(selectedItem.id, customName.trim());
                setCustomName("");
              }
            }}
          />
          <button
            type="button"
            className="text-xs border rounded px-2 py-1"
            disabled={!customName.trim()}
            onClick={async () => {
              await onCreateAuthorityAndOpenReview(selectedItem.id, customName.trim());
              setCustomName("");
            }}
          >
            Create + Review
          </button>
        </div>
      </div>
    </section>
  );
}
