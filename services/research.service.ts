import type { Authority, ResearchItem, ResearchItemStatus, SourceType } from "../components/research/types";
export { listAuthoritiesForMatter } from "./authority.service";

type JsonRecord = Record<string, unknown>;

function mapResearchItem(item: JsonRecord): ResearchItem {
  return {
    id: String(item.id),
    matterId: String(item.matterId),
    rawText: String(item.rawText),
    sourceType: item.sourceType as SourceType,
    notes: (item.notes as string | null | undefined) ?? null,
    status: item.status as ResearchItemStatus,
    candidateAuthorityNames: Array.isArray(item.candidateAuthorityNames)
      ? item.candidateAuthorityNames.map(String)
      : [],
    createdAt: String(item.createdAt),
    updatedAt: String(item.updatedAt),
  };
}

export async function listResearchItemsForMatter(
  matterId: string,
  status?: ResearchItemStatus
): Promise<ResearchItem[]> {
  const query = status ? `?status=${status}` : "";
  const res = await fetch(`/api/matters/${matterId}/research-items${query}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to list research items");
  const data = (await res.json()) as JsonRecord[];
  return data.map(mapResearchItem);
}

export async function createResearchItem(input: {
  matterId: string;
  rawText: string;
  sourceType: SourceType;
  notes?: string;
}): Promise<ResearchItem> {
  const res = await fetch(`/api/matters/${input.matterId}/research-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to create research item");
  return mapResearchItem((await res.json()) as JsonRecord);
}

export async function markResearchItemStatus(
  researchItemId: string,
  status: ResearchItemStatus
): Promise<ResearchItem> {
  const res = await fetch(`/api/research-items/${researchItemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update research status");
  return mapResearchItem((await res.json()) as JsonRecord);
}

export async function reExtractCandidates(researchItemId: string): Promise<ResearchItem> {
  const res = await fetch(`/api/research-items/${researchItemId}/extract-authorities`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to re-extract candidates");
  return mapResearchItem((await res.json()) as JsonRecord);
}

export async function createAuthorityFromResearchItem(
  matterId: string,
  researchItemId: string,
  citedName: string
): Promise<Authority> {
  const res = await fetch(`/api/research-items/${researchItemId}/create-authority`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matterId, selectedCandidateAuthority: citedName }),
  });
  if (!res.ok) throw new Error("Failed to create authority");
  return (await res.json()) as Authority;
}
