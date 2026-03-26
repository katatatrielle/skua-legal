import type {
  AuthorityQueueItem,
  AuthorityReviewRecord,
  DefectRecord,
} from "../components/authority/types";

type JsonRecord = Record<string, unknown>;

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function mapDefect(defect: JsonRecord): DefectRecord {
  return {
    id: String(defect.id),
    defectType: String(defect.defectType),
    severity: defect.severity as DefectRecord["severity"],
    description: String(defect.description),
    status: defect.status as DefectRecord["status"],
    stageDetected: String(defect.stageDetected),
    restartScopeRecommended: String(defect.restartScopeRecommended),
    createdAt: String(defect.createdAt),
    updatedAt: String(defect.updatedAt),
  };
}

function mapQueueItem(item: JsonRecord): AuthorityQueueItem {
  return {
    id: String(item.id),
    citedName: String(item.citedName),
    normalizedName: toStringOrNull(item.normalizedName),
    status: item.status as AuthorityQueueItem["status"],
    verificationStatus: item.verificationStatus as AuthorityQueueItem["verificationStatus"],
    riskLevel: (item.riskLevel as AuthorityQueueItem["riskLevel"]) ?? null,
    updatedAt: String(item.updatedAt),
    defectCount: Number(item.defectCount ?? 0),
    latestOpenDefectSeverity:
      (item.latestOpenDefectSeverity as AuthorityQueueItem["latestOpenDefectSeverity"]) ?? null,
    linkedResearchItemCount: Number(item.linkedResearchItemCount ?? 0),
  };
}

function mapReviewRecord(item: JsonRecord): AuthorityReviewRecord {
  return {
    id: String(item.id),
    matterId: String(item.matterId),
    citedName: String(item.citedName),
    normalizedName: toStringOrNull(item.normalizedName),
    jurisdiction: toStringOrNull(item.jurisdiction),
    court: toStringOrNull(item.court),
    date: toStringOrNull(item.date),
    sourceDatabase: toStringOrNull(item.sourceDatabase),
    existenceStatus: item.existenceStatus as AuthorityReviewRecord["existenceStatus"],
    retrievalStatus: item.retrievalStatus as AuthorityReviewRecord["retrievalStatus"],
    pinpointType: item.pinpointType as AuthorityReviewRecord["pinpointType"],
    excerptText: toStringOrNull(item.excerptText),
    excerptLocation: toStringOrNull(item.excerptLocation),
    speakerClassification: item.speakerClassification as AuthorityReviewRecord["speakerClassification"],
    propositionUnderReview: toStringOrNull(item.propositionUnderReview),
    fitStatus: (item.fitStatus as AuthorityReviewRecord["fitStatus"]) ?? null,
    riskLevel: (item.riskLevel as AuthorityReviewRecord["riskLevel"]) ?? null,
    verificationStatus: item.verificationStatus as AuthorityReviewRecord["verificationStatus"],
    status: item.status as AuthorityReviewRecord["status"],
    createdAt: String(item.createdAt),
    updatedAt: String(item.updatedAt),
    researchItemLinks: Array.isArray(item.researchItemLinks)
      ? item.researchItemLinks.map((link) => ({
          id: String((link as JsonRecord).id),
          researchItemId: String((link as JsonRecord).researchItemId),
          createdAt: String((link as JsonRecord).createdAt),
          researchItem: {
            id: String(((link as JsonRecord).researchItem as JsonRecord).id),
            rawText: String(((link as JsonRecord).researchItem as JsonRecord).rawText),
            sourceType: String(((link as JsonRecord).researchItem as JsonRecord).sourceType),
            notes: toStringOrNull(((link as JsonRecord).researchItem as JsonRecord).notes),
            status: String(((link as JsonRecord).researchItem as JsonRecord).status),
            candidateAuthorityNames: Array.isArray(
              ((link as JsonRecord).researchItem as JsonRecord).candidateAuthorityNames
            )
              ? ((((link as JsonRecord).researchItem as JsonRecord).candidateAuthorityNames as unknown[]) || []).map(
                  String
                )
              : [],
            createdAt: String(((link as JsonRecord).researchItem as JsonRecord).createdAt),
            updatedAt: String(((link as JsonRecord).researchItem as JsonRecord).updatedAt),
          },
        }))
      : [],
    defects: Array.isArray(item.defects) ? item.defects.map((defect) => mapDefect(defect as JsonRecord)) : [],
  };
}

async function expectOk(res: Response, fallback: string) {
  if (res.ok) return;
  let message = fallback;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    // Ignore parse failures and keep fallback.
  }
  throw new Error(message);
}

export async function listAuthoritiesForMatter(matterId: string): Promise<AuthorityQueueItem[]> {
  const res = await fetch(`/api/matters/${matterId}/authorities`, { cache: "no-store" });
  await expectOk(res, "Failed to load authorities");
  const data = (await res.json()) as JsonRecord[];
  return data.map(mapQueueItem);
}

export async function getAuthorityForReview(authorityId: string): Promise<AuthorityReviewRecord> {
  const res = await fetch(`/api/authorities/${authorityId}`, { cache: "no-store" });
  await expectOk(res, "Failed to load authority");
  return mapReviewRecord((await res.json()) as JsonRecord);
}

export async function runAuthorityIntake(input: {
  authorityId: string;
  providedSourceText?: string;
  providedLocator?: string;
}): Promise<AuthorityReviewRecord> {
  const res = await fetch(`/api/authorities/${input.authorityId}/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      providedSourceText: input.providedSourceText,
      providedLocator: input.providedLocator,
    }),
  });
  await expectOk(res, "Failed to run intake");
  const data = (await res.json()) as { authority: JsonRecord };
  return mapReviewRecord(data.authority);
}

export async function runAuthorityReview(input: {
  authorityId: string;
  propositionUnderReview: string;
}): Promise<AuthorityReviewRecord> {
  const res = await fetch(`/api/authorities/${input.authorityId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propositionUnderReview: input.propositionUnderReview }),
  });
  await expectOk(res, "Failed to run provenance review");
  const data = (await res.json()) as { authority: JsonRecord };
  return mapReviewRecord(data.authority);
}

export async function setAuthorityDecision(input: {
  authorityId: string;
  decision: "verified" | "verified_with_warning" | "blocked" | "invalidated";
  userNote?: string;
}): Promise<AuthorityReviewRecord> {
  const res = await fetch(`/api/authorities/${input.authorityId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: input.decision, userNote: input.userNote }),
  });
  await expectOk(res, "Failed to record decision");
  const data = (await res.json()) as { authority: JsonRecord };
  return mapReviewRecord(data.authority);
}

export async function listAuthorityDefects(authorityId: string): Promise<DefectRecord[]> {
  const res = await fetch(`/api/authorities/${authorityId}/defects`, { cache: "no-store" });
  await expectOk(res, "Failed to load defects");
  const data = (await res.json()) as JsonRecord[];
  return data.map(mapDefect);
}
