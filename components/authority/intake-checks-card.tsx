"use client";

import { useEffect, useState } from "react";
import type { AuthorityReviewRecord } from "./types";

interface IntakeChecksCardProps {
  authority: AuthorityReviewRecord;
  onRunIntake: (input: {
    authorityId: string;
    providedSourceText?: string;
    providedLocator?: string;
  }) => Promise<void>;
  isMutating?: boolean;
}

function pretty(value: string | null) {
  return value ? value.replace(/_/g, " ") : "not set";
}

export function IntakeChecksCard({
  authority,
  onRunIntake,
  isMutating = false,
}: IntakeChecksCardProps) {
  const [providedSourceText, setProvidedSourceText] = useState(authority.excerptText ?? "");
  const [providedLocator, setProvidedLocator] = useState(authority.excerptLocation ?? "");

  useEffect(() => {
    setProvidedSourceText(authority.excerptText ?? "");
    setProvidedLocator(authority.excerptLocation ?? "");
  }, [authority.id, authority.excerptLocation, authority.excerptText]);

  return (
    <section className="border rounded-lg bg-white p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Intake Checks</h2>
        <p className="mt-1 text-xs text-slate-500">
          Confirm existence, retrieval, locator coverage, and initial source excerpt. Leave the fields blank to use the selected preferred source.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatusTile label="Existence" value={pretty(authority.existenceStatus)} />
        <StatusTile label="Retrieval" value={pretty(authority.retrievalStatus)} />
        <StatusTile label="Pinpoint" value={pretty(authority.pinpointType)} />
      </div>

      <div className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Source text</span>
          <textarea
            value={providedSourceText}
            onChange={(event) => setProvidedSourceText(event.target.value)}
            rows={5}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Paste the exact excerpt or source text used for intake."
            data-testid="authority-source-text-input"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Locator</span>
          <input
            value={providedLocator}
            onChange={(event) => setProvidedLocator(event.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="e.g. para. 42 or p. 113"
            data-testid="authority-locator-input"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Running intake will refresh excerpt and defect state.</p>
        <button
          type="button"
          disabled={isMutating}
          className="rounded-md border px-3 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="run-intake-button"
          onClick={() =>
            onRunIntake({
              authorityId: authority.id,
              providedSourceText: providedSourceText.trim() || undefined,
              providedLocator: providedLocator.trim() || undefined,
            })
          }
        >
          {isMutating ? "Running..." : "Run intake"}
        </button>
      </div>
    </section>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 px-3 py-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium capitalize text-slate-900">{value}</div>
    </div>
  );
}
