"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  attachAuthorityToOutlineNode,
  createOutlineNode,
  draftSectionFromOutlineNode,
  getMatterDiagnostics,
  getMatterRestartState,
  listDraftAuthoritiesForMatter,
  listOutlineNodesForMatter,
  restartFromDefect,
} from "../../services/draft.service";
import type {
  DraftAuthority,
  MatterDiagnostics,
  OutlineNodeRecord,
  RestartState,
} from "../../services/draft.service";

interface DraftWorkspaceProps {
  matterId: string;
  matterTitle: string;
  matterDescription: string;
}

const NODE_TYPES = ["issue", "rule", "analysis", "counterargument", "conclusion"] as const;

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function formatMoney(value: number) {
  return `$${value.toFixed(4)}`;
}

export function DraftWorkspace({ matterId, matterTitle, matterDescription }: DraftWorkspaceProps) {
  const [outlineNodes, setOutlineNodes] = useState<OutlineNodeRecord[]>([]);
  const [draftAuthorities, setDraftAuthorities] = useState<DraftAuthority[]>([]);
  const [diagnostics, setDiagnostics] = useState<MatterDiagnostics | null>(null);
  const [restartState, setRestartState] = useState<RestartState | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [proposition, setProposition] = useState("");
  const [nodeType, setNodeType] = useState<(typeof NODE_TYPES)[number]>("analysis");
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [nodes, authorities, nextDiagnostics, nextRestartState] = await Promise.all([
        listOutlineNodesForMatter(matterId),
        listDraftAuthoritiesForMatter(matterId),
        getMatterDiagnostics(matterId),
        getMatterRestartState(matterId),
      ]);
      setOutlineNodes(nodes);
      setDraftAuthorities(authorities);
      setDiagnostics(nextDiagnostics);
      setRestartState(nextRestartState);
      setSelectedNodeId((current) =>
        current && nodes.some((node) => node.id === current) ? current : nodes[0]?.id ?? null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load draft workspace");
    } finally {
      setIsLoading(false);
    }
  }, [matterId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedNode = useMemo(
    () => outlineNodes.find((node) => node.id === selectedNodeId) ?? null,
    [outlineNodes, selectedNodeId]
  );

  const selectedSection = selectedNode?.draftSections[0] ?? null;

  async function runMutation(action: () => Promise<void>) {
    setIsMutating(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft workspace update failed");
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-lg border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Draft Workspace</div>
              <h1 className="mt-1 text-xl font-semibold text-slate-900">{matterTitle}</h1>
              <p className="mt-1 text-sm text-slate-500">{matterDescription}</p>
            </div>
            <div className="flex gap-2">
              <a href={`/matters/${matterId}/research`} className="rounded-md border px-3 py-2 text-sm font-medium text-slate-900">
                Research
              </a>
              <a href={`/matters/${matterId}/authorities`} className="rounded-md border px-3 py-2 text-sm font-medium text-slate-900">
                Authorities
              </a>
            </div>
          </div>

          {diagnostics && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full border px-3 py-1" data-testid="diagnostics-model-runs">
                {diagnostics.modelRunCount} model runs
              </span>
              <span className="rounded-full border px-3 py-1" data-testid="diagnostics-cost">
                {formatMoney(diagnostics.totalEstimatedCostUsd)} total cost
              </span>
              <span className="rounded-full border px-3 py-1" data-testid="diagnostics-open-defects">
                {diagnostics.openDefectCount} open defects
              </span>
              <span className="rounded-full border px-3 py-1" data-testid="diagnostics-restarts">
                {diagnostics.restartCount} restarts
              </span>
              <span className="rounded-full border px-3 py-1" data-testid="diagnostics-checkpoint">
                Latest checkpoint: {diagnostics.latestCleanCheckpoint?.stage ?? "none"}
              </span>
            </div>
          )}
        </header>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {restartState && restartState.openDefects.length > 0 && (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-amber-950">Restart queue</h2>
                <p className="mt-1 text-xs text-amber-900">
                  Open authority defects can taint downstream outline and draft artifacts.
                </p>
              </div>
              <span className="rounded-full border border-amber-300 px-3 py-1 text-xs font-medium text-amber-900">
                {restartState.openDefects.length} open defects
              </span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {restartState.openDefects.map((defect) => (
                <article key={defect.id} className="rounded-md border border-amber-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{defect.defectType}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {defect.authorityName ?? "Authority"} | {defect.severity} | restart {defect.restartScopeChosen ?? defect.restartScopeRecommended}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {defect.affectedOutlineNodeCount} outline nodes | {defect.affectedDraftSectionCount} draft sections affected
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isMutating || !defect.restartEligible}
                      className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                      data-testid={`restart-defect-${defect.id}`}
                      onClick={() =>
                        runMutation(async () => {
                          await restartFromDefect({
                            defectId: defect.id,
                            chosenScope: (defect.restartScopeChosen ?? defect.restartScopeRecommended) as
                              | "none"
                              | "authority_only"
                              | "proposition"
                              | "outline_node"
                              | "section",
                          });
                        })
                      }
                    >
                      {defect.restartEligible ? "Restart from recommendation" : "No downstream artifacts"}
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{defect.description}</p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                    <div className="rounded border bg-slate-50 p-2">
                      <div className="font-semibold text-slate-700">Preserve</div>
                      <p className="mt-1">{defect.preserveDiscardSummary.preserve.join(", ")}</p>
                    </div>
                    <div className="rounded border bg-slate-50 p-2">
                      <div className="font-semibold text-slate-700">Discard</div>
                      <p className="mt-1">{defect.preserveDiscardSummary.discard.join(", ")}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)_360px]">
          <section className="rounded-lg border bg-white p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Outline nodes</h2>
              <p className="mt-1 text-xs text-slate-500">Create a node, attach verified authority, then generate one auditable section.</p>
            </div>

            <form
              className="space-y-3 rounded-md border bg-slate-50 p-3"
              onSubmit={async (event) => {
                event.preventDefault();
                await runMutation(async () => {
                  await createOutlineNode({
                    matterId,
                    title,
                    proposition,
                    nodeType,
                  });
                  setTitle("");
                  setProposition("");
                });
              }}
            >
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Node title"
                required
              />
              <textarea
                value={proposition}
                onChange={(event) => setProposition(event.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Claim or proposition this section needs to support"
              />
              <select
                value={nodeType}
                onChange={(event) => setNodeType(event.target.value as (typeof NODE_TYPES)[number])}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {NODE_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isMutating || !title.trim()}
                className="w-full rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Create outline node
              </button>
            </form>

            {isLoading && <p className="text-sm text-slate-500">Loading draft workspace...</p>}

            <div className="space-y-2" data-testid="outline-node-list">
              {outlineNodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`w-full rounded-md border p-3 text-left ${selectedNodeId === node.id ? "border-slate-900 bg-slate-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900">{node.title}</span>
                    <span className="text-[11px] uppercase tracking-wide text-slate-500">
                      {node.status} | {node.taintStatus}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-xs text-slate-600">{node.proposition ?? "No proposition recorded yet."}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {node.authorityLinks.length} attached authorities | {node.draftSections.length} drafted sections
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4 space-y-4">
            {!selectedNode ? (
              <p className="text-sm text-slate-500">Create or select an outline node to start drafting.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{selectedNode.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{selectedNode.proposition ?? "No proposition recorded yet."}</p>
                  </div>
                  <button
                    type="button"
                    disabled={isMutating}
                    className="rounded-md border px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
                    data-testid="draft-section-button"
                    onClick={() => runMutation(async () => { await draftSectionFromOutlineNode(selectedNode.id); })}
                  >
                    Draft section
                  </button>
                </div>

                {selectedNode.taintStatus !== "clean" && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-testid="node-taint-banner">
                    This node is {selectedNode.taintStatus}. Resolve or restart from the linked defect queue before trusting the output.
                  </div>
                )}

                <div className="rounded-md border bg-slate-50 p-3">
                  <h3 className="text-sm font-semibold text-slate-900">Attached authority set</h3>
                  {selectedNode.authorityLinks.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No authorities attached yet.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {selectedNode.authorityLinks.map((link) => (
                        <div key={link.authorityId} className="rounded-md border bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium text-slate-900">{link.authority.citedName}</div>
                            <span className="text-xs text-slate-500">{link.authority.verificationStatus}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">
                            {link.authority.excerptLocation ?? "no locator"} | {link.authority.fitStatus ?? "fit not set"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-md border bg-slate-50 p-3">
                  <h3 className="text-sm font-semibold text-slate-900">Draft output</h3>
                  {selectedSection ? (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full border px-2 py-1">{selectedSection.status}</span>
                        <span className="rounded-full border px-2 py-1">{selectedSection.taintStatus}</span>
                        {selectedSection.checkpointParent && (
                          <span className="rounded-full border px-2 py-1">checkpoint {selectedSection.checkpointParent}</span>
                        )}
                      </div>
                      {selectedSection.text ? (
                        <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-800" data-testid="draft-output">
                          {selectedSection.text}
                        </pre>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500" data-testid="draft-output-empty">
                          This section was cleared during restart. Attach or verify clean authorities, then draft again.
                        </p>
                      )}
                      <p className="mt-3 text-xs text-slate-500">
                        Updated {new Date(selectedSection.updatedAt).toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No drafted section yet. Attach authority and generate one.</p>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="rounded-lg border bg-white p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Citation inspector</h2>
              <p className="mt-1 text-xs text-slate-500">Every drafted section shows the exact authority support used to generate it.</p>
            </div>

            {selectedSection?.claimSupportLinks.length ? (
              <div className="space-y-3" data-testid="citation-inspector">
                {selectedSection.claimSupportLinks.map((link) => (
                  <article key={link.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-slate-900">{link.authority.citedName}</div>
                      <span className="text-xs text-slate-500">{link.status}</span>
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-700">
                      {link.claimLocation ?? "Claim"}: {link.claimText}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{link.excerptText}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {link.excerptLocation ?? "no locator"} | {link.fitStatus}
                    </p>
                    {link.verificationSummary && <p className="mt-2 text-xs text-slate-500">{link.verificationSummary}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Draft a section to inspect its support links.</p>
            )}

            <div className="rounded-md border bg-slate-50 p-3">
              <h3 className="text-sm font-semibold text-slate-900">Verified authorities</h3>
              <p className="mt-1 text-xs text-slate-500">Only eligible verified authorities can be attached downstream.</p>
              <div className="mt-3 space-y-2">
                {draftAuthorities.length === 0 && <p className="text-sm text-slate-500">No verified authorities available yet.</p>}
                {draftAuthorities.map((authority) => (
                  <div key={authority.id} className="rounded-md border bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{authority.citedName}</div>
                        <p className="mt-1 text-xs text-slate-500">
                          {authority.verificationStatus} | {authority.fitStatus ?? "fit not set"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!selectedNode || isMutating}
                        className="rounded-md border px-2 py-1 text-xs font-medium text-slate-900 disabled:opacity-50"
                        onClick={() =>
                          selectedNode
                            ? runMutation(async () => {
                                await attachAuthorityToOutlineNode({
                                  outlineNodeId: selectedNode.id,
                                  authorityId: authority.id,
                                });
                              })
                            : undefined
                        }
                      >
                        Attach
                      </button>
                    </div>
                    {authority.propositionUnderReview && (
                      <p className="mt-2 text-xs text-slate-600">{authority.propositionUnderReview}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {diagnostics && (
              <div className="rounded-md border bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-900">Matter diagnostics</h3>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recent model runs</p>
                    <div className="mt-2 space-y-2">
                      {diagnostics.recentModelRuns.length === 0 && (
                        <p className="text-sm text-slate-500">No model activity yet.</p>
                      )}
                      {diagnostics.recentModelRuns.map((run) => (
                        <div key={run.id} className="rounded-md border bg-white p-3 text-xs text-slate-600">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-900">{run.stage}</span>
                            <span>{run.status}</span>
                          </div>
                          <p className="mt-1">{run.provider} · {run.model}</p>
                          <p className="mt-1">
                            {run.latencyMs ? `${run.latencyMs}ms` : "no latency"} | {run.estimatedCostUsd !== null ? formatMoney(run.estimatedCostUsd) : "cost unavailable"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recent events</p>
                    <div className="mt-2 space-y-2" data-testid="diagnostics-events">
                      {diagnostics.recentEvents.length === 0 && (
                        <p className="text-sm text-slate-500">No event history yet.</p>
                      )}
                      {diagnostics.recentEvents.map((event) => (
                        <div key={event.id} className="rounded-md border bg-white p-3 text-xs text-slate-600">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-900">{event.eventType}</span>
                            <span>{formatTimestamp(event.createdAt)}</span>
                          </div>
                          <p className="mt-1">{event.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
