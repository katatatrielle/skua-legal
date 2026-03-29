"use client";

import { useState } from "react";
import { createMatter } from "../../services/matter.service";
import type { MatterListItem } from "../../services/matter.service";

interface MatterHomeProps {
  initialMatters: MatterListItem[];
  setupError?: string | null;
}

export function MatterHome({ initialMatters, setupError = null }: MatterHomeProps) {
  const [matters, setMatters] = useState(initialMatters);
  const [title, setTitle] = useState("");
  const [courseOrContext, setCourseOrContext] = useState("");
  const [mainIssue, setMainIssue] = useState("");
  const [objective, setObjective] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const matter = await createMatter({
        title,
        courseOrContext,
        mainIssue,
        objective,
      });
      setMatters((current) => [matter, ...current]);
      setTitle("");
      setCourseOrContext("");
      setMainIssue("");
      setObjective("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create matter");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">CleanRoom Law</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Single-window trust workflow</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600">
          Create a matter, collect research, verify authorities against real source text, and move clean support into
          drafting without bouncing across tabs.
        </p>
      </section>

      {setupError && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Setup required</p>
          <h2 className="mt-2 text-xl font-semibold text-amber-950">Database connection needed</h2>
          <p className="mt-2 text-sm text-amber-900">{setupError}</p>
          <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-amber-200 bg-white p-4 text-sm text-slate-800">
{`cp .env.example .env
npm install
npm run db:push
npm run db:seed:dev
npm run dev`}
          </pre>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Create matter</h2>
          <p className="mt-2 text-sm text-slate-600">Start from a blank matter instead of seeding the database manually.</p>
          <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-md border px-3 py-2"
                placeholder="Duty to accommodate memo"
                data-testid="matter-title-input"
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Course or context</span>
              <input
                value={courseOrContext}
                onChange={(event) => setCourseOrContext(event.target.value)}
                className="rounded-md border px-3 py-2"
                placeholder="Employment law seminar"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Main issue</span>
              <textarea
                value={mainIssue}
                onChange={(event) => setMainIssue(event.target.value)}
                rows={4}
                className="rounded-md border px-3 py-2"
                placeholder="What issue are you trying to resolve?"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Objective</span>
              <input
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                className="rounded-md border px-3 py-2"
                placeholder="Produce a defensible first memo section"
              />
            </label>
            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="w-full rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              data-testid="create-matter-button"
            >
              {submitting ? "Creating..." : "Create matter"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Your matters</h2>
              <p className="mt-2 text-sm text-slate-600">Open research, authority review, or drafting from one landing page.</p>
            </div>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
              {matters.length} matters
            </span>
          </div>

          {matters.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              No matters yet. Create one here, or keep `npm run db:seed:dev` for smoke-test data.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {matters.map((matter) => (
                <article key={matter.id} className="rounded-lg border border-slate-200 p-4" data-testid={`matter-card-${matter.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{matter.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {matter.mainIssue ?? matter.courseOrContext ?? matter.objective ?? "Open the matter workflow."}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                      {matter.status}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-full border px-2 py-1">{matter.counts.researchItems} research items</span>
                    <span className="rounded-full border px-2 py-1">{matter.counts.authorities} authorities</span>
                    <span className="rounded-full border px-2 py-1">{matter.counts.outlineNodes} outline nodes</span>
                    <span className="rounded-full border px-2 py-1">{matter.counts.draftSections} sections</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href={`/matters/${matter.id}/research`}
                      className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                    >
                      Research
                    </a>
                    <a
                      href={`/matters/${matter.id}/authorities`}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900"
                    >
                      Authorities
                    </a>
                    <a
                      href={`/matters/${matter.id}/draft`}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900"
                    >
                      Draft
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
