"use client";

import type { ResearchItem } from "./types";

interface ResearchItemCardProps {
  item: ResearchItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onReExtract: (id: string) => Promise<void>;
  onMarkProcessed: (id: string) => Promise<void>;
  onMarkAbandoned: (id: string) => Promise<void>;
}

export function ResearchItemCard({
  item,
  isSelected,
  onSelect,
  onReExtract,
  onMarkProcessed,
  onMarkAbandoned,
}: ResearchItemCardProps) {
  const preview = item.rawText.length > 180 ? `${item.rawText.slice(0, 180)}...` : item.rawText;
  const sourceLabel =
    item.sourceUrl && item.sourceType === "link"
      ? "URL-backed source"
      : item.sourceType === "case_citation"
        ? "Citation-only candidate"
        : item.sourceType === "snippet"
          ? "Source text / excerpt"
          : item.sourceType === "note"
            ? "Research note"
            : "Proposition";
  const actionLabel =
    item.sourceType === "case_citation"
      ? "needs source"
      : item.status === "processed"
        ? "reviewed"
        : item.sourceType === "snippet" || item.sourceType === "link"
          ? "ready for intake"
          : "raw";

  return (
    <article
      className={`border rounded p-3 cursor-pointer ${isSelected ? "ring-2" : ""}`}
      onClick={() => onSelect(item.id)}
      data-testid={`research-item-${item.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase border rounded px-1.5 py-0.5">{item.sourceType}</span>
          <span className="text-xs border rounded px-1.5 py-0.5">{item.status}</span>
          <span className="text-xs border rounded px-1.5 py-0.5">{actionLabel}</span>
        </div>
        <span className="text-xs opacity-70">
          {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <p className="mt-2 text-xs font-medium uppercase tracking-wide opacity-60">{sourceLabel}</p>
      <p className="text-sm mt-2 whitespace-pre-wrap">{preview}</p>
      {item.sourceUrl && (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex text-xs text-slate-700 underline underline-offset-2"
          onClick={(event) => event.stopPropagation()}
        >
          {item.sourceUrl}
        </a>
      )}

      {item.candidateAuthorityNames.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.candidateAuthorityNames.map((name, i) => (
            <span key={`${item.id}-${i}`} className="text-xs border rounded px-2 py-0.5">
              {name}
            </span>
          ))}
        </div>
      )}

      {item.notes && <p className="text-xs mt-2 opacity-80">{item.notes}</p>}

      {item.status === "new" && (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            className="text-xs border rounded px-2 py-1"
            onClick={async (e) => {
              e.stopPropagation();
              await onReExtract(item.id);
            }}
          >
            Re-extract
          </button>
          <button
            type="button"
            className="text-xs border rounded px-2 py-1"
            onClick={async (e) => {
              e.stopPropagation();
              await onMarkProcessed(item.id);
            }}
          >
            Processed
          </button>
          <button
            type="button"
            className="text-xs border rounded px-2 py-1"
            onClick={async (e) => {
              e.stopPropagation();
              await onMarkAbandoned(item.id);
            }}
          >
            Abandon
          </button>
        </div>
      )}
    </article>
  );
}
