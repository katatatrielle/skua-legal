"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAuthorityFromResearchItem,
  createResearchItem,
  listAuthoritiesForMatter,
  listResearchItemsForMatter,
  markResearchItemStatus,
  reExtractCandidates,
} from "../../services/research.service";
import {
  AuthorityStatusBadge,
  VerificationStatusBadge,
} from "../authority/authority-status-badge";
import type { AuthorityQueueItem } from "../authority/types";
import { CandidateAuthorityPanel } from "./candidate-authority-panel";
import { ResearchItemCard } from "./research-item-card";
import { ResearchItemForm } from "./research-item-form";
import type { ResearchItem, ResearchItemStatus, SourceType } from "./types";

interface ResearchInboxProps {
  matterId: string;
  matterTitle: string;
  matterDescription: string;
}

export function ResearchInbox({ matterId, matterTitle, matterDescription }: ResearchInboxProps) {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [authorities, setAuthorities] = useState<AuthorityQueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ResearchItemStatus | "all">("all");
  const [loading, setLoading] = useState(false);

  const refreshItems = useCallback(async () => {
    setLoading(true);
    try {
      const filter = statusFilter === "all" ? undefined : statusFilter;
      const [nextItems, nextAuthorities] = await Promise.all([
        listResearchItemsForMatter(matterId, filter),
        listAuthoritiesForMatter(matterId),
      ]);
      setItems(nextItems);
      setAuthorities(nextAuthorities);
    } finally {
      setLoading(false);
    }
  }, [matterId, statusFilter]);

  useEffect(() => {
    void refreshItems();
  }, [refreshItems]);

  const handleSubmit = useCallback(
    async (data: { rawText?: string; sourceType: SourceType; sourceUrl?: string; notes: string }) => {
      const item = await createResearchItem({
        matterId,
        rawText: data.rawText,
        sourceType: data.sourceType,
        sourceUrl: data.sourceUrl,
        notes: data.notes,
      });
      await refreshItems();
      setSelectedId(item.id);
    },
    [matterId, refreshItems]
  );

  const handleReExtract = useCallback(
    async (id: string) => {
      await reExtractCandidates(id);
      await refreshItems();
    },
    [refreshItems]
  );

  const handleMarkProcessed = useCallback(
    async (id: string) => {
      await markResearchItemStatus(id, "processed");
      await refreshItems();
    },
    [refreshItems]
  );

  const handleMarkAbandoned = useCallback(
    async (id: string) => {
      await markResearchItemStatus(id, "abandoned");
      await refreshItems();
    },
    [refreshItems]
  );

  const handleCreateAuthority = useCallback(
    async (researchItemId: string, citedName: string) => {
      await createAuthorityFromResearchItem(matterId, researchItemId, citedName);
      await refreshItems();
      setSelectedId(null);
    },
    [matterId, refreshItems]
  );

  const handleCreateAuthorityAndOpenReview = useCallback(
    async (researchItemId: string, citedName: string) => {
      const authority = await createAuthorityFromResearchItem(matterId, researchItemId, citedName);
      await refreshItems();
      window.location.href = `/matters/${matterId}/authorities?authorityId=${authority.id}`;
    },
    [matterId, refreshItems]
  );

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;
  const statusCounts = useMemo(
    () => ({
      all: items.length,
      new: items.filter((i) => i.status === "new").length,
      processed: items.filter((i) => i.status === "processed").length,
      abandoned: items.filter((i) => i.status === "abandoned").length,
    }),
    [items]
  );
  const createdAuthorityCount = authorities.length;

  return (
    <div className="p-6 space-y-6">
      <header className="border rounded p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{matterTitle}</h1>
            <p className="text-sm opacity-70 mt-1">{matterDescription}</p>
            <div className="text-sm mt-3">
              {statusCounts.all} research items | {createdAuthorityCount} created authorities
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/matters/${matterId}/authorities`} className="rounded-md border px-3 py-2 text-sm font-medium">
              Authority review
            </a>
            <a href={`/matters/${matterId}/draft`} className="rounded-md border px-3 py-2 text-sm font-medium">
              Draft workspace
            </a>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <section className="border rounded p-4">
            <h2 className="text-sm font-semibold mb-3">Quick Add</h2>
            <ResearchItemForm onSubmit={handleSubmit} />
          </section>

          <div className="flex gap-2">
            {(["all", "new", "processed", "abandoned"] as const).map((status) => (
              <button
                key={status}
                type="button"
                className={`text-xs border rounded px-2 py-1 ${
                  statusFilter === status ? "bg-black text-white" : ""
                }`}
                onClick={() => setStatusFilter(status)}
              >
                {status} ({statusCounts[status]})
              </button>
            ))}
          </div>

          <section className="space-y-3">
            <div className="border rounded p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Raw Research Inbox</h2>
                  <p className="text-xs opacity-70 mt-1">
                    Capture notes, snippets, and citations before turning them into authorities.
                  </p>
                </div>
                <span className="text-xs border rounded px-2 py-1">
                  {statusCounts.all} items
                </span>
              </div>
            </div>
            {loading && <p className="text-sm opacity-70">Loading...</p>}
            {!loading && items.length === 0 && (
              <p className="text-sm opacity-70">No research items yet. Paste your first item above.</p>
            )}
            {items.map((item) => (
              <ResearchItemCard
                key={item.id}
                item={item}
                isSelected={item.id === selectedId}
                onSelect={setSelectedId}
                onReExtract={handleReExtract}
                onMarkProcessed={handleMarkProcessed}
                onMarkAbandoned={handleMarkAbandoned}
              />
            ))}
          </section>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <section className="border rounded p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Created Authorities</h2>
                <p className="text-xs opacity-70 mt-1">
                  Authorities created from inbox items are tracked separately from raw research.
                </p>
              </div>
              <span className="text-xs border rounded px-2 py-1">
                {createdAuthorityCount}
              </span>
            </div>

            {authorities.length === 0 ? (
              <p className="text-sm opacity-70">
                No authorities created yet. Select a research item and create one from a candidate string.
              </p>
            ) : (
              <div className="space-y-2">
                {authorities.map((authority) => (
                  <article key={authority.id} className="border rounded p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-medium">{authority.citedName}</h3>
                        <p className="text-xs opacity-70 mt-1">Ready for review workflow</p>
                      </div>
                      <a
                        href={`/matters/${matterId}/authorities?authorityId=${authority.id}`}
                        className="text-xs border rounded px-2 py-1 whitespace-nowrap"
                      >
                        Open review
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <AuthorityStatusBadge status={authority.status} />
                      <VerificationStatusBadge status={authority.verificationStatus} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <CandidateAuthorityPanel
            selectedItem={selectedItem}
            onCreateAuthority={handleCreateAuthority}
            onCreateAuthorityAndOpenReview={handleCreateAuthorityAndOpenReview}
          />
        </div>
      </div>
    </div>
  );
}
