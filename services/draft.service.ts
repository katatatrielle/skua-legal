type JsonRecord = Record<string, unknown>;

export type DraftAuthority = {
  id: string;
  citedName: string;
  verificationStatus: string;
  fitStatus: string | null;
  excerptText: string | null;
  excerptLocation: string | null;
  propositionUnderReview: string | null;
};

export type ClaimSupportRecord = {
  id: string;
  claimText: string;
  excerptText: string;
  excerptLocation: string | null;
  fitStatus: string;
  verificationSummary: string | null;
  status: string;
  authority: {
    id: string;
    citedName: string;
  };
};

export type DraftSectionRecord = {
  id: string;
  text: string;
  status: string;
  updatedAt: string;
  claimSupportLinks: ClaimSupportRecord[];
};

export type OutlineNodeRecord = {
  id: string;
  title: string;
  proposition: string | null;
  nodeType: string;
  status: string;
  authorityLinks: Array<{
    authorityId: string;
    authority: DraftAuthority;
  }>;
  draftSections: DraftSectionRecord[];
};

function toStringOrNull(value: unknown) {
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function mapDraftAuthority(item: JsonRecord): DraftAuthority {
  return {
    id: String(item.id),
    citedName: String(item.citedName),
    verificationStatus: String(item.verificationStatus),
    fitStatus: toStringOrNull(item.fitStatus),
    excerptText: toStringOrNull(item.excerptText),
    excerptLocation: toStringOrNull(item.excerptLocation),
    propositionUnderReview: toStringOrNull(item.propositionUnderReview),
  };
}

function mapDraftSection(item: JsonRecord): DraftSectionRecord {
  return {
    id: String(item.id),
    text: String(item.text),
    status: String(item.status),
    updatedAt: String(item.updatedAt),
    claimSupportLinks: Array.isArray(item.claimSupportLinks)
      ? item.claimSupportLinks.map((link) => ({
          id: String((link as JsonRecord).id),
          claimText: String((link as JsonRecord).claimText),
          excerptText: String((link as JsonRecord).excerptText),
          excerptLocation: toStringOrNull((link as JsonRecord).excerptLocation),
          fitStatus: String((link as JsonRecord).fitStatus),
          verificationSummary: toStringOrNull((link as JsonRecord).verificationSummary),
          status: String((link as JsonRecord).status),
          authority: {
            id: String(((link as JsonRecord).authority as JsonRecord).id),
            citedName: String(((link as JsonRecord).authority as JsonRecord).citedName),
          },
        }))
      : [],
  };
}

function mapOutlineNode(item: JsonRecord): OutlineNodeRecord {
  return {
    id: String(item.id),
    title: String(item.title),
    proposition: toStringOrNull(item.proposition),
    nodeType: String(item.nodeType),
    status: String(item.status),
    authorityLinks: Array.isArray(item.authorityLinks)
      ? item.authorityLinks.map((link) => ({
          authorityId: String((link as JsonRecord).authorityId),
          authority: mapDraftAuthority((link as JsonRecord).authority as JsonRecord),
        }))
      : [],
    draftSections: Array.isArray(item.draftSections)
      ? item.draftSections.map((section) => mapDraftSection(section as JsonRecord))
      : [],
  };
}

export async function listOutlineNodesForMatter(matterId: string): Promise<OutlineNodeRecord[]> {
  const res = await fetch(`/api/matters/${matterId}/outline-nodes`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load outline nodes");
  const data = (await res.json()) as JsonRecord[];
  return data.map(mapOutlineNode);
}

export async function listDraftAuthoritiesForMatter(matterId: string): Promise<DraftAuthority[]> {
  const res = await fetch(`/api/matters/${matterId}/draft-authorities`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load draft-ready authorities");
  const data = (await res.json()) as JsonRecord[];
  return data.map(mapDraftAuthority);
}

export async function createOutlineNode(input: {
  matterId: string;
  title: string;
  proposition?: string;
  nodeType?: "issue" | "rule" | "analysis" | "counterargument" | "conclusion";
}): Promise<OutlineNodeRecord> {
  const res = await fetch(`/api/matters/${input.matterId}/outline-nodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      proposition: input.proposition,
      nodeType: input.nodeType,
    }),
  });
  if (!res.ok) throw new Error("Failed to create outline node");
  return mapOutlineNode((await res.json()) as JsonRecord);
}

export async function attachAuthorityToOutlineNode(input: {
  outlineNodeId: string;
  authorityId: string;
}): Promise<void> {
  const res = await fetch(`/api/outline-nodes/${input.outlineNodeId}/attach-authority`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authorityId: input.authorityId }),
  });
  if (!res.ok) throw new Error("Failed to attach authority");
}

export async function draftSectionFromOutlineNode(outlineNodeId: string): Promise<DraftSectionRecord> {
  const res = await fetch(`/api/outline-nodes/${outlineNodeId}/draft-section`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to draft section");
  return mapDraftSection((await res.json()) as JsonRecord);
}
