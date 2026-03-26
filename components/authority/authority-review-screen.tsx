"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAuthorityForReview,
  listAuthoritiesForMatter,
  runAuthorityIntake,
  runAuthorityReview,
  setAuthorityDecision,
} from "../../services/authority.service";
import { AuthorityReviewPanel } from "./authority-review-panel";
import { AuthorityReviewQueue } from "./authority-review-queue";
import type { AuthorityQueueItem, AuthorityReviewRecord } from "./types";

interface AuthorityReviewScreenProps {
  matterId: string;
  matterTitle: string;
  matterDescription: string;
  initialAuthorityId?: string;
}

export function AuthorityReviewScreen({
  matterId,
  matterTitle,
  matterDescription,
  initialAuthorityId,
}: AuthorityReviewScreenProps) {
  const [queue, setQueue] = useState<AuthorityQueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialAuthorityId ?? null);
  const [selectedAuthority, setSelectedAuthority] = useState<AuthorityReviewRecord | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [loadingAuthority, setLoadingAuthority] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const refreshQueue = useCallback(async () => {
    setLoadingQueue(true);
    setQueueError(null);
    try {
      const nextQueue = await listAuthoritiesForMatter(matterId);
      setQueue(nextQueue);
      setSelectedId((current) => {
        if (current && nextQueue.some((item) => item.id === current)) {
          return current;
        }
        return nextQueue[0]?.id ?? null;
      });
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : "Failed to load authority queue");
    } finally {
      setLoadingQueue(false);
    }
  }, [matterId]);

  const refreshSelectedAuthority = useCallback(async (authorityId: string) => {
    setLoadingAuthority(true);
    setDetailError(null);
    try {
      const next = await getAuthorityForReview(authorityId);
      setSelectedAuthority(next);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load authority");
      setSelectedAuthority(null);
    } finally {
      setLoadingAuthority(false);
    }
  }, []);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedAuthority(null);
      return;
    }

    void refreshSelectedAuthority(selectedId);
    const url = new URL(window.location.href);
    url.searchParams.set("authorityId", selectedId);
    window.history.replaceState({}, "", url);
  }, [refreshSelectedAuthority, selectedId]);

  const runMutation = useCallback(
    async (action: () => Promise<AuthorityReviewRecord>, authorityId: string) => {
      setIsMutating(true);
      setMutationError(null);
      try {
        const updated = await action();
        setSelectedAuthority(updated);
        await refreshQueue();
        setSelectedId(authorityId);
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : "Failed to update authority");
      } finally {
        setIsMutating(false);
      }
    },
    [refreshQueue]
  );

  const counts = useMemo(
    () => ({
      total: queue.length,
      pending: queue.filter((item) => item.verificationStatus === "not_started").length,
      needsReview: queue.filter((item) =>
        ["intake_passed", "fit_reviewed", "blocked", "verified_with_warning"].includes(item.verificationStatus)
      ).length,
      verified: queue.filter((item) => item.verificationStatus === "verified").length,
    }),
    [queue]
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-lg border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Authority Review</div>
              <h1 className="mt-1 text-xl font-semibold text-slate-900">{matterTitle}</h1>
              <p className="mt-1 text-sm text-slate-500">{matterDescription}</p>
            </div>
            <a
              href={`/matters/${matterId}/research`}
              className="rounded-md border px-3 py-2 text-sm font-medium text-slate-900"
            >
              Back to research
            </a>
          </div>
          <div className="mt-3 text-sm text-slate-600">
          {counts.total} authorities | {counts.pending} not started | {counts.needsReview} active review |{" "}
          {counts.verified} verified
          </div>
        </header>

        {queueError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{queueError}</div>
        )}

        {mutationError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{mutationError}</div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <AuthorityReviewQueue
            items={queue}
            selectedId={selectedId}
            isLoading={loadingQueue}
            onSelect={setSelectedId}
          />
          <AuthorityReviewPanel
            authority={selectedAuthority}
            isLoading={loadingAuthority}
            isMutating={isMutating}
            error={detailError}
            onRunIntake={(input) => runMutation(() => runAuthorityIntake(input), input.authorityId)}
            onRunReview={(input) => runMutation(() => runAuthorityReview(input), input.authorityId)}
            onSetDecision={(input) => runMutation(() => setAuthorityDecision(input), input.authorityId)}
          />
        </div>
      </div>
    </div>
  );
}
