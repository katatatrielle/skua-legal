import test from "node:test";
import assert from "node:assert/strict";

type MatterRecord = {
  id: string;
  title: string;
  courseOrContext: string | null;
  mainIssue: string | null;
  objective: string | null;
  status: string;
  updatedAt: Date;
};

class FakeMatterDb {
  private seq = 1;
  matters: MatterRecord[] = [];

  matter = {
    findMany: async (_args: any) => [],
    create: async (_args: any) => null,
  };

  constructor() {
    this.matter.findMany = async () =>
      this.matters.map((matter) => ({
        ...matter,
        _count: {
          researchItems: 0,
          authorities: 0,
          outlineNodes: 0,
          draftSections: 0,
        },
      }));

    this.matter.create = async ({ data }: any) => {
      const record: MatterRecord = {
        id: `matter_${this.seq++}`,
        title: data.title,
        courseOrContext: data.courseOrContext ?? null,
        mainIssue: data.mainIssue ?? null,
        objective: data.objective ?? null,
        status: data.status ?? "researching",
        updatedAt: new Date(),
      };
      this.matters.push(record);
      return record;
    };
  }
}

const fakeDb = new FakeMatterDb();
(globalThis as typeof globalThis & { __db__?: unknown }).__db__ = fakeDb as unknown;

const matterService = await import("./matter.service.ts");

test("creates a matter with normalized fields", async () => {
  const matter = await matterService.createMatter({
    title: "  Duty to Accommodate Memo  ",
    courseOrContext: " Employment law ",
    mainIssue: " Whether the employer had a duty to accommodate ",
  });

  assert.equal(matter.title, "Duty to Accommodate Memo");
  assert.equal(matter.courseOrContext, "Employment law");
  assert.equal(matter.mainIssue, "Whether the employer had a duty to accommodate");
  assert.deepEqual(matter.counts, {
    researchItems: 0,
    authorities: 0,
    outlineNodes: 0,
    draftSections: 0,
  });
});

test("lists matters with normalized counts", async () => {
  const matters = await matterService.listMatters();

  assert.ok(matters.length >= 1);
  assert.equal(typeof matters[0].updatedAt, "string");
  assert.deepEqual(Object.keys(matters[0].counts).sort(), [
    "authorities",
    "draftSections",
    "outlineNodes",
    "researchItems",
  ]);
});
