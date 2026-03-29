import test from "node:test";
import assert from "node:assert/strict";

type OutlineNodeRecord = {
  id: string;
  matterId: string;
  title: string;
  status: string;
  taintStatus: string;
  authorityIds: string[];
  updatedAt: Date;
};

type DraftSectionRecord = {
  id: string;
  matterId: string;
  outlineNodeId: string;
  status: string;
  taintStatus: string;
  text: string;
  checkpointParent: string | null;
  updatedAt: Date;
};

type ClaimSupportLinkRecord = {
  id: string;
  draftSectionId: string;
  authorityId: string;
  status: string;
};

type DefectRecord = {
  id: string;
  matterId: string;
  authorityId: string | null;
  defectType: string;
  severity: string;
  description: string;
  status: string;
  restartScopeRecommended: string;
  restartScopeChosen: string | null;
  createdAt: Date;
  updatedAt: Date;
};

class FakeRestartDb {
  outlineNodes: OutlineNodeRecord[] = [
    {
      id: "node_1",
      matterId: "matter_1",
      title: "Accommodation rule",
      status: "ready",
      taintStatus: "clean",
      authorityIds: ["auth_1"],
      updatedAt: new Date(),
    },
  ];

  draftSections: DraftSectionRecord[] = [
    {
      id: "section_1",
      matterId: "matter_1",
      outlineNodeId: "node_1",
      status: "draft",
      taintStatus: "clean",
      text: "Clean section",
      checkpointParent: "checkpoint_1",
      updatedAt: new Date(),
    },
  ];

  claimSupportLinks: ClaimSupportLinkRecord[] = [
    {
      id: "support_1",
      draftSectionId: "section_1",
      authorityId: "auth_1",
      status: "verified",
    },
  ];

  defects: DefectRecord[] = [
    {
      id: "defect_1",
      matterId: "matter_1",
      authorityId: "auth_1",
      defectType: "AUTH_INVALIDATED",
      severity: "critical",
      description: "Authority invalidated after drafting.",
      status: "open",
      restartScopeRecommended: "section",
      restartScopeChosen: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  checkpoints = [
    {
      id: "checkpoint_1",
      matterId: "matter_1",
      stage: "section_clean",
      status: "clean",
      createdAt: new Date(),
    },
  ];

  matterEvents: Array<Record<string, unknown>> = [];

  defect = {
    findMany: async ({ where }: any) =>
      this.defects.filter((defect) => defect.matterId === where.matterId),
    findUnique: async ({ where }: any) => this.defects.find((defect) => defect.id === where.id) ?? null,
    update: async ({ where, data }: any) => {
      const defect = this.defects.find((record) => record.id === where.id);
      if (!defect) throw new Error("Defect not found");
      Object.assign(defect, data, { updatedAt: new Date() });
      return defect;
    },
  };

  checkpoint = {
    findMany: async ({ where }: any) =>
      this.checkpoints.filter((checkpoint) => checkpoint.matterId === where.matterId && checkpoint.status === where.status),
    create: async ({ data }: any) => {
      const checkpoint = {
        id: `checkpoint_${this.checkpoints.length + 1}`,
        matterId: data.matterId,
        stage: data.stage,
        status: data.status,
        createdAt: new Date(),
      };
      this.checkpoints.unshift(checkpoint);
      return checkpoint;
    },
    updateMany: async ({ where, data }: any) => {
      this.checkpoints = this.checkpoints.map((checkpoint) =>
        checkpoint.matterId === where.matterId && checkpoint.stage === where.stage && checkpoint.status === where.status
          ? { ...checkpoint, status: data.status }
          : checkpoint
      );
      return { count: 1 };
    },
  };

  outlineNode = {
    findMany: async ({ where, include, select }: any) => {
      const nodes = this.outlineNodes.filter((node) => {
        if (where?.matterId && node.matterId !== where.matterId) return false;
        if (where?.taintStatus?.in && !where.taintStatus.in.includes(node.taintStatus)) return false;
        if (where?.authorityLinks?.some?.authorityId && !node.authorityIds.includes(where.authorityLinks.some.authorityId)) {
          return false;
        }
        return true;
      });

      return nodes.map((node) => {
        if (select) {
          return {
            id: node.id,
            title: node.title,
            status: node.status,
            taintStatus: node.taintStatus,
            updatedAt: node.updatedAt,
          };
        }

        if (include?.draftSections) {
          return {
            ...node,
            draftSections: this.draftSections.filter((section) => section.outlineNodeId === node.id),
          };
        }

        return node;
      });
    },
    update: async ({ where, data }: any) => {
      const node = this.outlineNodes.find((record) => record.id === where.id);
      if (!node) throw new Error("Node not found");
      Object.assign(node, data, { updatedAt: new Date() });
      return node;
    },
    updateMany: async ({ where, data }: any) => {
      this.outlineNodes = this.outlineNodes.map((node) =>
        where.id.in.includes(node.id) ? { ...node, ...data, updatedAt: new Date() } : node
      );
      return { count: 1 };
    },
  };

  draftSection = {
    findMany: async ({ where, select }: any) => {
      const sections = this.draftSections.filter((section) => {
        if (where?.matterId && section.matterId !== where.matterId) return false;
        if (where?.outlineNodeId?.in && !where.outlineNodeId.in.includes(section.outlineNodeId)) return false;
        if (where?.taintStatus?.in && !where.taintStatus.in.includes(section.taintStatus)) return false;
        return true;
      });

      return sections.map((section) =>
        select
          ? {
              id: section.id,
              outlineNodeId: section.outlineNodeId,
              status: section.status,
              taintStatus: section.taintStatus,
              updatedAt: section.updatedAt,
            }
          : section
      );
    },
    update: async ({ where, data }: any) => {
      const section = this.draftSections.find((record) => record.id === where.id);
      if (!section) throw new Error("Section not found");
      Object.assign(section, data, { updatedAt: new Date() });
      return section;
    },
    updateMany: async ({ where, data }: any) => {
      this.draftSections = this.draftSections.map((section) =>
        where.id.in.includes(section.id) ? { ...section, ...data, updatedAt: new Date() } : section
      );
      return { count: 1 };
    },
  };

  claimSupportLink = {
    updateMany: async ({ where, data }: any) => {
      this.claimSupportLinks = this.claimSupportLinks.map((link) =>
        link.authorityId === where.authorityId && where.draftSectionId.in.includes(link.draftSectionId)
          ? { ...link, ...data }
          : link
      );
      return { count: 1 };
    },
    deleteMany: async ({ where }: any) => {
      this.claimSupportLinks = this.claimSupportLinks.filter((link) => !where.draftSectionId.in.includes(link.draftSectionId));
      return { count: 1 };
    },
  };

  matterEvent = {
    create: async ({ data }: any) => {
      this.matterEvents.unshift({
        ...data,
        id: `event_${this.matterEvents.length + 1}`,
        createdAt: new Date(),
      });
      return this.matterEvents[0];
    },
    findMany: async ({ where }: any) => this.matterEvents.filter((event) => event.matterId === where.matterId),
  };

  async $transaction<T>(callback: (tx: this) => Promise<T>) {
    return callback(this);
  }
}

const fakeDb = new FakeRestartDb();
(globalThis as typeof globalThis & { __db__?: unknown }).__db__ = fakeDb;

const restartService = await import("./restart.service.ts");

test("propagates taint from an authority defect to linked artifacts", async () => {
  const result = await restartService.propagateAuthorityTaint({
    matterId: "matter_1",
    authorityId: "auth_1",
    severity: "critical",
    defectId: "defect_1",
    defectType: "AUTH_INVALIDATED",
  });

  assert.equal(result.taintStatus, "tainted");
  assert.equal(fakeDb.outlineNodes[0]?.taintStatus, "tainted");
  assert.equal(fakeDb.outlineNodes[0]?.status, "blocked");
  assert.equal(fakeDb.draftSections[0]?.taintStatus, "tainted");
  assert.equal(fakeDb.draftSections[0]?.status, "invalidated");
  assert.equal(fakeDb.claimSupportLinks[0]?.status, "blocked");
});

test("summarizes restart state and marks downstream-eligible defects", async () => {
  const state = await restartService.getMatterRestartState("matter_1");

  assert.equal(state.openDefects.length, 1);
  assert.equal(state.openDefects[0]?.restartEligible, true);
  assert.equal(state.openDefects[0]?.affectedOutlineNodeCount, 1);
  assert.equal(state.openDefects[0]?.affectedDraftSectionCount, 1);
  assert.equal(state.taintedOutlineNodes.length, 1);
  assert.equal(state.taintedDraftSections.length, 1);
});
