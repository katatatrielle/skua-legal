import type { DefectSeverity, RestartScope, StageDetected } from "@prisma/client";
import { db } from "../../lib/db";
import { AuthorityNotFoundError } from "../shared/errors";

export type CreateAuthorityDefectInput = {
  authorityId: string;
  defectType: string;
  severity: DefectSeverity;
  description: string;
  restartScopeRecommended: RestartScope;
};

export async function createAuthorityDefect(input: CreateAuthorityDefectInput) {
  const authority = await db.authority.findUnique({
    where: { id: input.authorityId },
    select: { id: true, matterId: true },
  });
  if (!authority) throw new AuthorityNotFoundError(input.authorityId);

  return db.defect.create({
    data: {
      matterId: authority.matterId,
      authorityId: authority.id,
      artifactType: "authority",
      artifactId: authority.id,
      defectType: input.defectType,
      severity: input.severity,
      stageDetected: "intake",
      description: input.description,
      restartScopeRecommended: input.restartScopeRecommended,
    },
  });
}

export async function createOrReuseAuthorityDefect(params: {
  authorityId: string;
  defectType: string;
  severity: DefectSeverity;
  description: string;
  restartScopeRecommended: RestartScope;
  stageDetected?: StageDetected;
}) {
  const authority = await db.authority.findUnique({
    where: { id: params.authorityId },
    select: { id: true, matterId: true },
  });
  if (!authority) throw new AuthorityNotFoundError(params.authorityId);

  const openExisting = await db.defect.findFirst({
    where: {
      authorityId: params.authorityId,
      defectType: params.defectType,
      status: { in: ["open", "pending_human", "reopened"] },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (openExisting) return openExisting;

  const resolvedExisting = await db.defect.findFirst({
    where: {
      authorityId: params.authorityId,
      defectType: params.defectType,
      status: { in: ["resolved", "waived"] },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (resolvedExisting) {
    return db.defect.update({
      where: { id: resolvedExisting.id },
      data: {
        status: "reopened",
        reopenCount: { increment: 1 },
        description: params.description,
        severity: params.severity,
        stageDetected: params.stageDetected ?? "provenance_fit_review",
        restartScopeRecommended: params.restartScopeRecommended,
      },
    });
  }

  return db.defect.create({
    data: {
      matterId: authority.matterId,
      authorityId: authority.id,
      artifactType: "authority",
      artifactId: authority.id,
      defectType: params.defectType,
      severity: params.severity,
      stageDetected: params.stageDetected ?? "provenance_fit_review",
      description: params.description,
      restartScopeRecommended: params.restartScopeRecommended,
    },
  });
}

export async function ensureAuthorityDefect(
  authorityId: string,
  defectType: string,
  severity: DefectSeverity,
  description: string,
  stageDetected: "intake" | "provenance_fit_review"
) {
  return createOrReuseAuthorityDefect({
    authorityId,
    defectType,
    severity,
    description,
    stageDetected,
    restartScopeRecommended: "authority_only",
  });
}

export async function listOpenDefectsByAuthority(authorityId: string) {
  return db.defect.findMany({
    where: {
      authorityId,
      status: { in: ["open", "pending_human", "reopened"] },
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
  });
}
