import type { DefectSeverity, RestartScope } from "@prisma/client";
import { db } from "../../lib/db";

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
  if (!authority) throw new Error("Authority not found");

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

export async function ensureAuthorityDefect(
  authorityId: string,
  defectType: string,
  severity: DefectSeverity,
  description: string,
  stageDetected: "intake" | "provenance_fit_review"
) {
  const authority = await db.authority.findUnique({
    where: { id: authorityId },
    select: { id: true, matterId: true },
  });
  if (!authority) throw new Error("Authority not found");

  const existing = await db.defect.findFirst({
    where: {
      authorityId,
      defectType,
      status: { in: ["open", "pending_human", "reopened"] },
    },
  });
  if (existing) return existing;

  return db.defect.create({
    data: {
      matterId: authority.matterId,
      authorityId: authority.id,
      artifactType: "authority",
      artifactId: authority.id,
      defectType,
      severity,
      stageDetected,
      description,
      restartScopeRecommended: "authority_only",
    },
  });
}
