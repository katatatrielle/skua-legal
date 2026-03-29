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
  claimLocation: string | null;
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
  taintStatus: string;
  checkpointParent: string | null;
  updatedAt: string;
  claimSupportLinks: ClaimSupportRecord[];
};

export type OutlineNodeRecord = {
  id: string;
  title: string;
  proposition: string | null;
  nodeType: string;
  status: string;
  taintStatus: string;
  authorityLinks: Array<{
    authorityId: string;
    authority: DraftAuthority;
  }>;
  draftSections: DraftSectionRecord[];
};

export type MatterDiagnostics = {
  matterId: string;
  modelRunCount: number;
  totalEstimatedCostUsd: number;
  openDefectCount: number;
  restartCount: number;
  latestCleanCheckpoint: {
    id: string;
    stage: string;
    createdAt: string;
  } | null;
  recentModelRuns: Array<{
    id: string;
    stage: string;
    provider: string;
    model: string;
    status: string;
    estimatedCostUsd: number | null;
    latencyMs: number | null;
    createdAt: string;
  }>;
  recentEvents: Array<{
    id: string;
    eventType: string;
    summary: string;
    stage: string | null;
    entityType: string | null;
    entityId: string | null;
    createdAt: string;
  }>;
};

export type RestartState = {
  matterId: string;
  latestCleanCheckpoint: {
    id: string;
    stage: string;
    createdAt: string;
  } | null;
  openDefects: Array<{
    id: string;
    defectType: string;
    severity: string;
    description: string;
    status: string;
    authorityId: string | null;
    authorityName: string | null;
    restartScopeRecommended: string;
    restartScopeChosen: string | null;
    restartEligible: boolean;
    affectedOutlineNodeCount: number;
    affectedDraftSectionCount: number;
    preserveDiscardSummary: {
      preserve: string[];
      discard: string[];
    };
    createdAt: string;
    updatedAt: string;
  }>;
  taintedOutlineNodes: Array<{
    id: string;
    title: string;
    status: string;
    taintStatus: string;
    updatedAt: string;
  }>;
  taintedDraftSections: Array<{
    id: string;
    outlineNodeId: string;
    status: string;
    taintStatus: string;
    updatedAt: string;
  }>;
};

export type RestartResult = {
  defectId: string;
  chosenScope: string;
  preserveDiscardSummary: {
    preserve: string[];
    discard: string[];
  };
  affectedOutlineNodeIds: string[];
  affectedDraftSectionIds: string[];
  restartState: RestartState;
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

function mapClaimSupport(link: JsonRecord): ClaimSupportRecord {
  return {
    id: String(link.id),
    claimText: String(link.claimText),
    claimLocation: toStringOrNull(link.claimLocation),
    excerptText: String(link.excerptText),
    excerptLocation: toStringOrNull(link.excerptLocation),
    fitStatus: String(link.fitStatus),
    verificationSummary: toStringOrNull(link.verificationSummary),
    status: String(link.status),
    authority: {
      id: String(((link.authority as JsonRecord) ?? {}).id),
      citedName: String(((link.authority as JsonRecord) ?? {}).citedName),
    },
  };
}

function mapDraftSection(item: JsonRecord): DraftSectionRecord {
  return {
    id: String(item.id),
    text: String(item.text ?? ""),
    status: String(item.status),
    taintStatus: String(item.taintStatus ?? "clean"),
    checkpointParent: toStringOrNull(item.checkpointParent),
    updatedAt: String(item.updatedAt),
    claimSupportLinks: Array.isArray(item.claimSupportLinks)
      ? item.claimSupportLinks.map((link) => mapClaimSupport(link as JsonRecord))
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
    taintStatus: String(item.taintStatus ?? "clean"),
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

async function expectOk(res: Response, fallback: string) {
  if (res.ok) return;
  let message = fallback;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    // Ignore parse failure.
  }
  throw new Error(message);
}

export async function listOutlineNodesForMatter(matterId: string): Promise<OutlineNodeRecord[]> {
  const res = await fetch(`/api/matters/${matterId}/outline-nodes`, { cache: "no-store" });
  await expectOk(res, "Failed to load outline nodes");
  const data = (await res.json()) as JsonRecord[];
  return data.map(mapOutlineNode);
}

export async function listDraftAuthoritiesForMatter(matterId: string): Promise<DraftAuthority[]> {
  const res = await fetch(`/api/matters/${matterId}/draft-authorities`, { cache: "no-store" });
  await expectOk(res, "Failed to load draft-ready authorities");
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
  await expectOk(res, "Failed to create outline node");
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
  await expectOk(res, "Failed to attach authority");
}

export async function draftSectionFromOutlineNode(outlineNodeId: string): Promise<DraftSectionRecord> {
  const res = await fetch(`/api/outline-nodes/${outlineNodeId}/draft-section`, {
    method: "POST",
  });
  await expectOk(res, "Failed to draft section");
  return mapDraftSection((await res.json()) as JsonRecord);
}

export async function getMatterDiagnostics(matterId: string): Promise<MatterDiagnostics> {
  const res = await fetch(`/api/matters/${matterId}/diagnostics`, { cache: "no-store" });
  await expectOk(res, "Failed to load matter diagnostics");
  return (await res.json()) as MatterDiagnostics;
}

export async function getMatterRestartState(matterId: string): Promise<RestartState> {
  const res = await fetch(`/api/matters/${matterId}/restart-state`, { cache: "no-store" });
  await expectOk(res, "Failed to load restart state");
  return (await res.json()) as RestartState;
}

export async function restartFromDefect(input: {
  defectId: string;
  chosenScope?: "none" | "authority_only" | "proposition" | "outline_node" | "section";
}): Promise<RestartResult> {
  const res = await fetch(`/api/defects/${input.defectId}/restart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chosenScope: input.chosenScope }),
  });
  await expectOk(res, "Failed to restart from defect");
  return (await res.json()) as RestartResult;
}
