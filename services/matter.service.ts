export type MatterListItem = {
  id: string;
  title: string;
  courseOrContext: string | null;
  mainIssue: string | null;
  objective: string | null;
  status: string;
  updatedAt: string;
  counts: {
    researchItems: number;
    authorities: number;
    outlineNodes: number;
    draftSections: number;
  };
};

type JsonRecord = Record<string, unknown>;

function mapMatter(item: JsonRecord): MatterListItem {
  const count = (item._count as JsonRecord | undefined) ?? {};
  return {
    id: String(item.id),
    title: String(item.title),
    courseOrContext: typeof item.courseOrContext === "string" ? item.courseOrContext : null,
    mainIssue: typeof item.mainIssue === "string" ? item.mainIssue : null,
    objective: typeof item.objective === "string" ? item.objective : null,
    status: String(item.status),
    updatedAt: String(item.updatedAt),
    counts: {
      researchItems: Number(count.researchItems ?? 0),
      authorities: Number(count.authorities ?? 0),
      outlineNodes: Number(count.outlineNodes ?? 0),
      draftSections: Number(count.draftSections ?? 0),
    },
  };
}

export async function listMatters(): Promise<MatterListItem[]> {
  const res = await fetch("/api/matters", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to list matters");
  const data = (await res.json()) as JsonRecord[];
  return data.map(mapMatter);
}

export async function createMatter(input: {
  title: string;
  courseOrContext?: string;
  mainIssue?: string;
  objective?: string;
}): Promise<MatterListItem> {
  const res = await fetch("/api/matters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to create matter");
  return mapMatter((await res.json()) as JsonRecord);
}
