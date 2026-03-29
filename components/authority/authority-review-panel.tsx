"use client";

import { useEffect, useState } from "react";
import { AuthorityRiskBadge, AuthorityStatusBadge, VerificationStatusBadge } from "./authority-status-badge";
import { DefectList } from "./defect-list";
import { IntakeChecksCard } from "./intake-checks-card";
import type { AuthorityReviewRecord } from "./types";
import { VerificationActions } from "./verification-actions";

interface AuthorityReviewPanelProps {
  authority: AuthorityReviewRecord | null;
  onRunIntake: (input: {
    authorityId: string;
    providedSourceText?: string;
    providedLocator?: string;
  }) => Promise<void>;
  onRunReview: (input: {
    authorityId: string;
    propositionUnderReview: string;
  }) => Promise<void>;
  onSetDecision: (input: {
    authorityId: string;
    decision: "verified" | "verified_with_warning" | "blocked" | "invalidated";
    userNote?: string;
  }) => Promise<void>;
  onSetPreferredSource: (input: { authorityId: string; researchItemId?: string | null }) => Promise<void>;
  onAddSourceItem: (input: {
    authorityId: string;
    rawText?: string;
    sourceUrl?: string;
    notes?: string;
  }) => Promise<void>;
  isMutating?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

function formatValue(value: string | null) {
  return value ?? "Not set";
}

function formatLabel(value: string | null) {
  return value ? value.replace(/_/g, " ") : "not set";
}

function getSummary(authority: AuthorityReviewRecord) {
  if (authority.status === "invalidated") return "This authority has been invalidated and should not be used.";
  if (authority.status === "blocked") return "This authority is blocked pending resolution of open issues.";
  if (authority.verificationStatus === "verified") return "This authority is verified and eligible for downstream use.";
  if (authority.verificationStatus === "verified_with_warning") {
    return "This authority is usable with warnings recorded by review.";
  }
  if (authority.verificationStatus === "fit_reviewed") return "Fit review is complete and ready for a final decision.";
  if (authority.verificationStatus === "provenance_reviewed") return "Provenance review is complete.";
  if (authority.verificationStatus === "intake_passed") return "Intake passed. Provenance review is next.";
  return "Ready for intake and provenance review.";
}

export function AuthorityReviewPanel({
  authority,
  onRunIntake,
  onRunReview,
  onSetDecision,
  onSetPreferredSource,
  onAddSourceItem,
  isMutating = false,
  isLoading = false,
  error = null,
}: AuthorityReviewPanelProps) {
  const [propositionUnderReview, setPropositionUnderReview] = useState("");
  const [newSourceText, setNewSourceText] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceNotes, setNewSourceNotes] = useState("");

  useEffect(() => {
    setPropositionUnderReview(authority?.propositionUnderReview ?? "");
    setNewSourceText("");
    setNewSourceUrl("");
    setNewSourceNotes("");
  }, [authority?.id, authority?.propositionUnderReview]);

  if (isLoading) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-slate-500">Loading authority details...</div>;
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  }

  if (!authority) {
    return (
      <div className="rounded-lg border bg-white p-6 text-sm text-slate-500">
        Select an authority from the queue to begin review.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="border rounded-lg bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{authority.citedName}</h1>
            {authority.normalizedName && authority.normalizedName !== authority.citedName && (
              <p className="mt-1 text-sm text-slate-500">{authority.normalizedName}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <AuthorityStatusBadge status={authority.status} />
            <VerificationStatusBadge status={authority.verificationStatus} />
            <AuthorityRiskBadge risk={authority.riskLevel} />
          </div>
        </div>

        <p className="text-sm text-slate-600">{getSummary(authority)}</p>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetadataTile label="Jurisdiction" value={formatValue(authority.jurisdiction)} />
          <MetadataTile label="Court" value={formatValue(authority.court)} />
          <MetadataTile label="Date" value={formatValue(authority.date)} />
          <MetadataTile label="Source DB" value={formatValue(authority.sourceDatabase)} />
          <MetadataTile label="Speaker" value={formatLabel(authority.speakerClassification)} />
          <MetadataTile label="Fit status" value={formatLabel(authority.fitStatus)} />
          <MetadataTile label="Updated" value={new Date(authority.updatedAt).toLocaleString()} />
          <MetadataTile label="Created" value={new Date(authority.createdAt).toLocaleString()} />
        </div>
      </section>

      <section className="border rounded-lg bg-white p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Linked Research</h2>
          <p className="mt-1 text-xs text-slate-500">
            Choose the preferred source text for intake, or add a new excerpt or URL-backed source.
          </p>
        </div>

        {authority.preferredSourceResearchItem ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Preferred source: {authority.preferredSourceResearchItem.sourceType}
            {authority.preferredSourceResearchItem.sourceUrl ? ` from ${authority.preferredSourceResearchItem.sourceUrl}` : ""}
          </div>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            No preferred source selected yet. Citation-only intake will stay blocked until you choose or add usable source text.
          </div>
        )}

        {authority.researchItemLinks.length === 0 && (
          <p className="text-sm text-slate-500">No linked research items found.</p>
        )}

        {authority.researchItemLinks.map((link) => (
          <article key={link.id} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded border px-2 py-1">{link.researchItem.sourceType}</span>
                <span className="rounded border px-2 py-1">{link.researchItem.status}</span>
                {authority.preferredSourceResearchItemId === link.researchItemId && (
                  <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-800">
                    preferred source
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={isMutating}
                className="rounded-md border px-2 py-1 text-xs font-medium text-slate-900 disabled:opacity-50"
                onClick={() => onSetPreferredSource({ authorityId: authority.id, researchItemId: link.researchItemId })}
              >
                {authority.preferredSourceResearchItemId === link.researchItemId ? "Selected" : "Use for intake"}
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{link.researchItem.rawText}</p>
            {link.researchItem.notes && <p className="mt-2 text-xs text-slate-500">{link.researchItem.notes}</p>}
            {link.researchItem.sourceUrl && (
              <a
                href={link.researchItem.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-xs text-slate-700 underline underline-offset-2"
              >
                {link.researchItem.sourceUrl}
              </a>
            )}
          </article>
        ))}

        <div className="rounded-md border bg-slate-50 p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Add source</h3>
            <p className="mt-1 text-xs text-slate-500">
              Paste source text, a source URL, or both. The new item will be linked and selected for intake.
            </p>
          </div>
          <textarea
            value={newSourceText}
            onChange={(event) => setNewSourceText(event.target.value)}
            rows={4}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Paste source excerpt or judgment text"
          />
          <input
            value={newSourceUrl}
            onChange={(event) => setNewSourceUrl(event.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Optional source URL"
          />
          <input
            value={newSourceNotes}
            onChange={(event) => setNewSourceNotes(event.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Optional source notes"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={isMutating || (!newSourceText.trim() && !newSourceUrl.trim())}
              className="rounded-md border px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
              onClick={() =>
                onAddSourceItem({
                  authorityId: authority.id,
                  rawText: newSourceText.trim() || undefined,
                  sourceUrl: newSourceUrl.trim() || undefined,
                  notes: newSourceNotes.trim() || undefined,
                })
              }
            >
              Add source and select
            </button>
          </div>
        </div>
      </section>

      <IntakeChecksCard authority={authority} onRunIntake={onRunIntake} isMutating={isMutating} />

      <section className="border rounded-lg bg-white p-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Provenance Review</h2>
          <p className="mt-1 text-xs text-slate-500">
            Record the proposition under review and run provenance plus fit analysis.
          </p>
        </div>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Proposition under review</span>
          <textarea
            value={propositionUnderReview}
            onChange={(event) => setPropositionUnderReview(event.target.value)}
            rows={4}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="What proposition does this authority need to support?"
            data-testid="proposition-under-review-input"
          />
        </label>

        <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
          <div>
            <span className="font-medium">Current fit status:</span> {formatLabel(authority.fitStatus)}
          </div>
          <div className="mt-1">
            <span className="font-medium">Speaker classification:</span> {formatLabel(authority.speakerClassification)}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={isMutating || !propositionUnderReview.trim()}
            className="rounded-md border px-3 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="run-provenance-review-button"
            onClick={() =>
              onRunReview({
                authorityId: authority.id,
                propositionUnderReview: propositionUnderReview.trim(),
              })
            }
          >
            {isMutating ? "Running..." : "Run provenance review"}
          </button>
        </div>
      </section>

      <section className="border rounded-lg bg-white p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Source Excerpt</h2>
          <p className="mt-1 text-xs text-slate-500">Most recent excerpt and locator captured for this authority.</p>
        </div>

        <div className="rounded-md border bg-slate-50 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Locator</div>
          <div className="mt-1 text-sm text-slate-900">{formatValue(authority.excerptLocation)}</div>
        </div>

        <div className="rounded-md border bg-slate-50 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Excerpt</div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{formatValue(authority.excerptText)}</p>
        </div>
      </section>

      <VerificationActions authority={authority} onSetDecision={onSetDecision} isMutating={isMutating} />

      <DefectList defects={authority.defects} />
    </div>
  );
}

function MetadataTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 px-3 py-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
