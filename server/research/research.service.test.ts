import test from "node:test";
import assert from "node:assert/strict";

type MatterRecord = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

type ResearchItemRecord = {
  id: string;
  matterId: string;
  rawText: string;
  sourceType: string;
  candidateAuthorityNames: string[] | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type AuthorityRecord = {
  id: string;
  matterId: string;
  citedName: string;
  normalizedName: string | null;
  status: string;
  verificationStatus: string;
  existenceStatus: string;
  retrievalStatus: string;
  createdAt: Date;
  updatedAt: Date;
};

type AuthorityResearchItemRecord = {
  id: string;
  authorityId: string;
  researchItemId: string;
  createdAt: Date;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function applySelect<T extends Record<string, unknown>>(record: T, select?: Record<string, boolean>) {
  if (!select) return clone(record);
  const output: Record<string, unknown> = {};
  for (const [key, enabled] of Object.entries(select)) {
    if (enabled) output[key] = clone(record[key as keyof T]);
  }
  return output;
}

class FakeResearchDb {
  private matterSeq = 1;
  private researchSeq = 1;
  private authoritySeq = 1;
  private linkSeq = 1;

  matters: MatterRecord[] = [];
  researchItems: ResearchItemRecord[] = [];
  authorities: AuthorityRecord[] = [];
  authorityResearchItems: AuthorityResearchItemRecord[] = [];

  seedMatter(title = "Research matter") {
    const now = new Date();
    const matter: MatterRecord = {
      id: `matter_${this.matterSeq++}`,
      title,
      createdAt: now,
      updatedAt: now,
    };
    this.matters.push(matter);
    return clone(matter);
  }

  matter = {
    findUnique: async (_args: any) => null,
  };

  researchItem = {
    create: async (_args: any) => null,
    findMany: async (_args: any) => [],
    findUnique: async (_args: any) => null,
    update: async (_args: any) => null,
    updateMany: async (_args: any) => ({ count: 0 }),
  };

  authority = {
    create: async (_args: any) => null,
  };

  async $transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    return callback(this);
  }

  constructor() {
    this.matter.findUnique = async ({ where, select }: any) => {
      const matter = this.matters.find((item) => item.id === where.id);
      return matter ? applySelect(matter, select) : null;
    };

    this.researchItem.create = async ({ data }: any) => {
      const now = new Date();
      const item: ResearchItemRecord = {
        id: `ri_${this.researchSeq++}`,
        matterId: data.matterId,
        rawText: data.rawText,
        sourceType: data.sourceType,
        candidateAuthorityNames: data.candidateAuthorityNames ?? [],
        notes: data.notes ?? null,
        status: data.status ?? "new",
        createdAt: now,
        updatedAt: now,
      };
      this.researchItems.push(item);
      return clone(item);
    };

    this.researchItem.findMany = async ({ where, select, orderBy }: any) => {
      let items = this.researchItems.filter((item) => {
        if (where?.matterId && item.matterId !== where.matterId) return false;
        if (where?.status && item.status !== where.status) return false;
        if (where?.id?.in && !where.id.in.includes(item.id)) return false;
        return true;
      });

      if (orderBy?.createdAt === "desc") {
        items = [...items].sort((a, b) => +b.createdAt - +a.createdAt);
      }

      return items.map((item) => applySelect(item, select));
    };

    this.researchItem.findUnique = async ({ where }: any) => {
      const item = this.researchItems.find((record) => record.id === where.id);
      return item ? clone(item) : null;
    };

    this.researchItem.update = async ({ where, data }: any) => {
      const index = this.researchItems.findIndex((record) => record.id === where.id);
      if (index === -1) throw new Error("Research item not found");

      const updated: ResearchItemRecord = {
        ...this.researchItems[index],
        ...data,
        updatedAt: new Date(),
      };
      this.researchItems[index] = updated;
      return clone(updated);
    };

    this.researchItem.updateMany = async ({ where, data }: any) => {
      const ids: string[] = where?.id?.in ?? [];
      let count = 0;
      this.researchItems = this.researchItems.map((item) => {
        if (!ids.includes(item.id)) return item;
        count += 1;
        return { ...item, ...data, updatedAt: new Date() };
      });
      return { count };
    };

    this.authority.create = async ({ data }: any) => {
      const now = new Date();
      const authority: AuthorityRecord = {
        id: `auth_${this.authoritySeq++}`,
        matterId: data.matterId,
        citedName: data.citedName,
        normalizedName: data.normalizedName ?? null,
        status: data.status ?? "candidate",
        verificationStatus: data.verificationStatus ?? "not_started",
        existenceStatus: data.existenceStatus ?? "ambiguous",
        retrievalStatus: data.retrievalStatus ?? "fail_no_text",
        createdAt: now,
        updatedAt: now,
      };
      this.authorities.push(authority);

      if (data.researchItemLinks?.create) {
        this.authorityResearchItems.push({
          id: `link_${this.linkSeq++}`,
          authorityId: authority.id,
          researchItemId: data.researchItemLinks.create.researchItemId,
          createdAt: now,
        });
      }

      return clone(authority);
    };
  }
}

const fakeDb = new FakeResearchDb();
(globalThis as typeof globalThis & { __db__?: unknown }).__db__ = fakeDb;

const researchService = await import("./research.service.ts");

test("creates a research item with extracted candidates", async () => {
  const matter = fakeDb.seedMatter();
  const item = await researchService.createResearchItem({
    matterId: matter.id,
    rawText: "Review Example v. Sample and 2024 ONCA 10 before drafting.",
    sourceType: "note",
    notes: "messy note",
  });

  assert.equal(item.status, "new");
  assert.ok(item.candidateAuthorityNames?.some((candidate) => candidate.includes("Example v. Sample")));
  assert.ok(item.candidateAuthorityNames?.includes("2024 ONCA 10"));
});

test("allows note-only research items by promoting notes into raw text", async () => {
  const matter = fakeDb.seedMatter();
  const item = await researchService.createResearchItem({
    matterId: matter.id,
    sourceType: "note",
    notes: "Quick note about Example v. Sample before full source retrieval.",
  });

  assert.match(item.rawText, /Quick note/);
  assert.equal(item.sourceType, "note");
});

test("marks research items processed and abandoned", async () => {
  const matter = fakeDb.seedMatter();
  const item = await researchService.createResearchItem({
    matterId: matter.id,
    rawText: "Sample v. Test",
    sourceType: "snippet",
  });

  const processed = await researchService.markResearchItemStatus({
    researchItemId: item.id,
    status: "processed",
  });
  assert.equal(processed.status, "processed");

  const abandoned = await researchService.markResearchItemStatus({
    researchItemId: item.id,
    status: "abandoned",
  });
  assert.equal(abandoned.status, "abandoned");
});

test("re-extracts candidate authorities from stored research text", async () => {
  const matter = fakeDb.seedMatter();
  const item = await researchService.createResearchItem({
    matterId: matter.id,
    rawText: "Initial note without clear citation",
    sourceType: "note",
    runExtraction: false,
  });

  await researchService.updateResearchItem({
    researchItemId: item.id,
    rawText: "Consider Example v. Updated and 2025 SCC 1",
    runExtractionOnTextChange: false,
  });

  const result = await researchService.extractCandidateAuthoritiesFromResearchItem(item.id);
  assert.ok(result.extracted.includes("Example v. Updated"));
  assert.ok(result.extracted.includes("2025 SCC 1"));
});

test("creates an authority from a research item and marks new items processed", async () => {
  const matter = fakeDb.seedMatter();
  const item = await researchService.createResearchItem({
    matterId: matter.id,
    rawText: "See Example v. Sample, [2024] 1 SCR 1.",
    sourceType: "case_citation",
  });

  const authority = await researchService.createAuthorityFromResearchItem({
    matterId: matter.id,
    researchItemId: item.id,
    selectedCandidateAuthority: "See Example v. Sample,",
  });

  assert.equal(authority.citedName, "Example v. Sample");
  assert.equal(authority.normalizedName, "Example v. Sample");
  assert.equal(authority.status, "candidate");
  assert.equal(authority.verificationStatus, "not_started");

  const storedItem = await fakeDb.researchItem.findUnique({ where: { id: item.id } });
  assert.equal(storedItem?.status, "processed");
  assert.equal(fakeDb.authorityResearchItems.length, 1);
  assert.equal(fakeDb.authorityResearchItems[0]?.researchItemId, item.id);
});
