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

  return (
    <article
      className={`border rounded p-3 cursor-pointer ${isSelected ? "ring-2" : ""}`}
      onClick={() => onSelect(item.id)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase border rounded px-1.5 py-0.5">{item.sourceType}</span>
          <span className="text-xs border rounded px-1.5 py-0.5">{item.status}</span>
        </div>
        <span className="text-xs opacity-70">
          {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <p className="text-sm mt-2 whitespace-pre-wrap">{preview}</p>

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
