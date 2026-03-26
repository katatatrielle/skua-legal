import type { DefectRecord } from "./types";
import { DefectSeverityBadge } from "./authority-status-badge";

interface DefectListProps {
  defects: DefectRecord[];
}

export function DefectList({ defects }: DefectListProps) {
  return (
    <section className="border rounded p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Defects</h3>
        <p className="text-xs opacity-70 mt-1">Blocked reasons stay visible.</p>
      </div>

      {defects.length === 0 && <p className="text-sm opacity-70">No defects on this authority yet.</p>}

      {defects.map((defect) => (
        <article key={defect.id} className="border rounded p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase border rounded px-2 py-1">{defect.defectType}</span>
            <DefectSeverityBadge severity={defect.severity} />
            <span className="text-xs border rounded px-2 py-1">{defect.status}</span>
          </div>
          <p className="text-sm">{defect.description}</p>
          <div className="text-xs opacity-70">
            stage: {defect.stageDetected} | restart: {defect.restartScopeRecommended}
          </div>
        </article>
      ))}
    </section>
  );
}
