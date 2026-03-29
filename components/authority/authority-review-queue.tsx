"use client";

import { AuthorityRiskBadge, AuthorityStatusBadge, DefectSeverityBadge, VerificationStatusBadge } from "./authority-status-badge";
import type { AuthorityQueueItem } from "./types";

interface AuthorityReviewQueueProps {
  items: AuthorityQueueItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AuthorityReviewQueue({
  items,
  selectedId,
  onSelect,
  isLoading = false,
}: AuthorityReviewQueueProps) {
  return (
    <section className="h-full border rounded-lg bg-white">
      <div className="border-b px-4 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Authority Queue</h2>
        <p className="mt-1 text-xs text-slate-500">
          {items.length} authorities awaiting intake, review, or final decision.
        </p>
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        {isLoading && <p className="px-4 py-6 text-sm text-slate-500">Loading authorities...</p>}

        {!isLoading && items.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-500">No authorities found for this matter yet.</p>
        )}

        {!isLoading &&
          items.map((item) => {
            const isSelected = item.id === selectedId;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`block w-full border-b px-4 py-4 text-left transition ${
                  isSelected ? "bg-slate-50" : "bg-white hover:bg-slate-50/70"
                }`}
                data-testid={`authority-queue-item-${item.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900">{item.citedName}</div>
                    {item.normalizedName && item.normalizedName !== item.citedName && (
                      <div className="mt-1 text-xs text-slate-500">{item.normalizedName}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-[11px] text-slate-500">{formatDate(item.updatedAt)}</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <AuthorityStatusBadge status={item.status} />
                  <VerificationStatusBadge status={item.verificationStatus} />
                  <AuthorityRiskBadge risk={item.riskLevel} />
                  {item.latestOpenDefectSeverity && <DefectSeverityBadge severity={item.latestOpenDefectSeverity} />}
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>{item.linkedResearchItemCount} linked research items</span>
                  <span>{item.defectCount} open defects</span>
                </div>
              </button>
            );
          })}
      </div>
    </section>
  );
}
