import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "../../lib/db.ts";
import { ensureMatterExists } from "../shared/db-helpers.ts";

type DbClient = PrismaClient | Prisma.TransactionClient | Record<string, unknown>;

type ModelRunCreateInput = {
  matterId: string;
  authorityId?: string | null;
  outlineNodeId?: string | null;
  draftSectionId?: string | null;
  stage: string;
  provider: string;
  model: string;
  reasoningEffort?: string | null;
  status: "succeeded" | "failed";
  latencyMs?: number | null;
  requestTokens?: number | null;
  responseTokens?: number | null;
  totalTokens?: number | null;
  estimatedCostUsd?: number | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
};

type MatterEventCreateInput = {
  matterId: string;
  eventType: string;
  summary: string;
  stage?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
};

function hasCreate(client: DbClient, key: "modelRun" | "matterEvent" | "checkpoint") {
  return Boolean((client as Record<string, any>)[key]?.create);
}

function hasFindMany(client: DbClient, key: "modelRun" | "matterEvent" | "checkpoint" | "defect") {
  return Boolean((client as Record<string, any>)[key]?.findMany);
}

export async function recordModelRun(input: ModelRunCreateInput, client: DbClient = db) {
  if (!hasCreate(client, "modelRun")) return null;

  return (client as Record<string, any>).modelRun.create({
    data: {
      matterId: input.matterId,
      authorityId: input.authorityId ?? null,
      outlineNodeId: input.outlineNodeId ?? null,
      draftSectionId: input.draftSectionId ?? null,
      stage: input.stage,
      provider: input.provider,
      model: input.model,
      reasoningEffort: input.reasoningEffort ?? null,
      status: input.status,
      latencyMs: input.latencyMs ?? null,
      requestTokens: input.requestTokens ?? null,
      responseTokens: input.responseTokens ?? null,
      totalTokens: input.totalTokens ?? null,
      estimatedCostUsd: input.estimatedCostUsd ?? null,
      errorMessage: input.errorMessage ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function recordMatterEvent(input: MatterEventCreateInput, client: DbClient = db) {
  if (!hasCreate(client, "matterEvent")) return null;

  return (client as Record<string, any>).matterEvent.create({
    data: {
      matterId: input.matterId,
      eventType: input.eventType,
      summary: input.summary,
      stage: input.stage ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function createCheckpoint(params: {
  matterId: string;
  stage: "authority_clean" | "outline_clean" | "section_clean";
  linkDraftSectionId?: string | null;
}, client: DbClient = db) {
  if (!hasCreate(client, "checkpoint")) return null;

  const tx = client as Record<string, any>;
  if (tx.checkpoint.updateMany) {
    await tx.checkpoint.updateMany({
      where: {
        matterId: params.matterId,
        stage: params.stage,
        status: "clean",
      },
      data: { status: "superseded" },
    });
  }

  const checkpoint = await tx.checkpoint.create({
    data: {
      matterId: params.matterId,
      stage: params.stage,
      status: "clean",
    },
  });

  if (params.linkDraftSectionId && tx.draftSection?.update) {
    await tx.draftSection.update({
      where: { id: params.linkDraftSectionId },
      data: { checkpointParent: checkpoint.id },
    });
  }

  return checkpoint;
}

export async function listMatterDiagnostics(matterId: string) {
  await ensureMatterExists(db, matterId);

  const modelRunsPromise = hasFindMany(db, "modelRun")
    ? (db as Record<string, any>).modelRun.findMany({
        where: { matterId },
        orderBy: [{ createdAt: "desc" }],
        take: 20,
      })
    : Promise.resolve([]);

  const matterEventsPromise = hasFindMany(db, "matterEvent")
    ? (db as Record<string, any>).matterEvent.findMany({
        where: { matterId },
        orderBy: [{ createdAt: "desc" }],
        take: 20,
      })
    : Promise.resolve([]);

  const checkpointsPromise = hasFindMany(db, "checkpoint")
    ? (db as Record<string, any>).checkpoint.findMany({
        where: { matterId, status: "clean" },
        orderBy: [{ createdAt: "desc" }],
        take: 1,
      })
    : Promise.resolve([]);

  const openDefectsPromise = hasFindMany(db, "defect")
    ? (db as Record<string, any>).defect.findMany({
        where: {
          matterId,
          status: { in: ["open", "pending_human", "reopened"] },
        },
      })
    : Promise.resolve([]);

  const [modelRuns, matterEvents, checkpoints, openDefects] = await Promise.all([
    modelRunsPromise,
    matterEventsPromise,
    checkpointsPromise,
    openDefectsPromise,
  ]);

  const totalEstimatedCostUsd = (modelRuns as Array<Record<string, unknown>>).reduce((sum, run) => {
    const value = typeof run.estimatedCostUsd === "number" ? run.estimatedCostUsd : 0;
    return sum + value;
  }, 0);

  const restartCount = (matterEvents as Array<Record<string, unknown>>).filter(
    (event) => event.eventType === "restart_executed"
  ).length;

  const latestCleanCheckpoint = (checkpoints as Array<Record<string, unknown>>)[0]
    ? {
        id: String((checkpoints as Array<Record<string, unknown>>)[0].id),
        stage: String((checkpoints as Array<Record<string, unknown>>)[0].stage),
        createdAt: new Date((checkpoints as Array<Record<string, unknown>>)[0].createdAt as string | Date).toISOString(),
      }
    : null;

  return {
    matterId,
    modelRunCount: (modelRuns as unknown[]).length,
    totalEstimatedCostUsd: Number(totalEstimatedCostUsd.toFixed(6)),
    openDefectCount: (openDefects as unknown[]).length,
    restartCount,
    latestCleanCheckpoint,
    recentModelRuns: (modelRuns as Array<Record<string, unknown>>).map((run) => ({
      id: String(run.id),
      stage: String(run.stage),
      provider: String(run.provider),
      model: String(run.model),
      status: String(run.status),
      estimatedCostUsd: typeof run.estimatedCostUsd === "number" ? run.estimatedCostUsd : null,
      latencyMs: typeof run.latencyMs === "number" ? run.latencyMs : null,
      createdAt: new Date(run.createdAt as string | Date).toISOString(),
    })),
    recentEvents: (matterEvents as Array<Record<string, unknown>>).map((event) => ({
      id: String(event.id),
      eventType: String(event.eventType),
      summary: String(event.summary),
      stage: typeof event.stage === "string" ? event.stage : null,
      entityType: typeof event.entityType === "string" ? event.entityType : null,
      entityId: typeof event.entityId === "string" ? event.entityId : null,
      createdAt: new Date(event.createdAt as string | Date).toISOString(),
    })),
  };
}
