import test from "node:test";
import assert from "node:assert/strict";

type MatterRecord = {
  id: string;
  title: string;
};

type ModelRunRecord = {
  id: string;
  matterId: string;
  stage: string;
  provider: string;
  model: string;
  status: string;
  estimatedCostUsd: number | null;
  latencyMs: number | null;
  createdAt: Date;
};

type MatterEventRecord = {
  id: string;
  matterId: string;
  eventType: string;
  summary: string;
  stage: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
};

type CheckpointRecord = {
  id: string;
  matterId: string;
  stage: string;
  status: string;
  createdAt: Date;
};

type DefectRecord = {
  id: string;
  matterId: string;
  status: string;
};

class FakeUsageDb {
  matters: MatterRecord[] = [{ id: "matter_1", title: "Matter" }];
  modelRuns: ModelRunRecord[] = [];
  matterEvents: MatterEventRecord[] = [];
  checkpoints: CheckpointRecord[] = [];
  defects: DefectRecord[] = [
    { id: "defect_1", matterId: "matter_1", status: "open" },
  ];

  private modelRunSeq = 1;
  private eventSeq = 1;
  private checkpointSeq = 1;

  matter = {
    findUnique: async ({ where }: any) => this.matters.find((matter) => matter.id === where.id) ?? null,
  };

  modelRun = {
    create: async ({ data }: any) => {
      const record: ModelRunRecord = {
        id: `run_${this.modelRunSeq++}`,
        matterId: data.matterId,
        stage: data.stage,
        provider: data.provider,
        model: data.model,
        status: data.status,
        estimatedCostUsd: data.estimatedCostUsd ?? null,
        latencyMs: data.latencyMs ?? null,
        createdAt: new Date(),
      };
      this.modelRuns.unshift(record);
      return record;
    },
    findMany: async ({ where }: any) => this.modelRuns.filter((run) => run.matterId === where.matterId),
  };

  matterEvent = {
    create: async ({ data }: any) => {
      const record: MatterEventRecord = {
        id: `event_${this.eventSeq++}`,
        matterId: data.matterId,
        eventType: data.eventType,
        summary: data.summary,
        stage: data.stage ?? null,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        createdAt: new Date(),
      };
      this.matterEvents.unshift(record);
      return record;
    },
    findMany: async ({ where }: any) => this.matterEvents.filter((event) => event.matterId === where.matterId),
  };

  checkpoint = {
    create: async ({ data }: any) => {
      const record: CheckpointRecord = {
        id: `checkpoint_${this.checkpointSeq++}`,
        matterId: data.matterId,
        stage: data.stage,
        status: data.status,
        createdAt: new Date(),
      };
      this.checkpoints.unshift(record);
      return record;
    },
    updateMany: async ({ where, data }: any) => {
      this.checkpoints = this.checkpoints.map((checkpoint) =>
        checkpoint.matterId === where.matterId && checkpoint.stage === where.stage && checkpoint.status === where.status
          ? { ...checkpoint, status: data.status }
          : checkpoint
      );
      return { count: 1 };
    },
    findMany: async ({ where }: any) =>
      this.checkpoints.filter(
        (checkpoint) => checkpoint.matterId === where.matterId && checkpoint.status === where.status
      ),
  };

  defect = {
    findMany: async ({ where }: any) => this.defects.filter((defect) => defect.matterId === where.matterId),
  };
}

const fakeDb = new FakeUsageDb();
(globalThis as typeof globalThis & { __db__?: unknown }).__db__ = fakeDb;

const usageService = await import("./usage.service.ts");

test("records model runs and aggregates diagnostics", async () => {
  await usageService.recordModelRun({
    matterId: "matter_1",
    stage: "section_drafting",
    provider: "heuristic",
    model: "heuristic-section-draft",
    status: "succeeded",
    estimatedCostUsd: 0.12,
    latencyMs: 15,
  });

  await usageService.recordMatterEvent({
    matterId: "matter_1",
    eventType: "section_drafted",
    summary: "Drafted section.",
    stage: "drafting",
  });

  await usageService.recordMatterEvent({
    matterId: "matter_1",
    eventType: "restart_executed",
    summary: "Restarted section.",
    stage: "claim_verification",
  });

  await usageService.createCheckpoint({
    matterId: "matter_1",
    stage: "section_clean",
  });

  const diagnostics = await usageService.listMatterDiagnostics("matter_1");
  assert.equal(diagnostics.modelRunCount, 1);
  assert.equal(diagnostics.totalEstimatedCostUsd, 0.12);
  assert.equal(diagnostics.openDefectCount, 1);
  assert.equal(diagnostics.restartCount, 1);
  assert.equal(diagnostics.latestCleanCheckpoint?.stage, "section_clean");
  assert.equal(diagnostics.recentEvents[0]?.eventType, "restart_executed");
});
