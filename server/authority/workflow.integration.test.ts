import test from "node:test";
import assert from "node:assert/strict";

type MatterRecord = {
  id: string;
  title: string;
  courseOrContext: string | null;
  assignmentType: string | null;
  mainIssue: string | null;
  objective: string | null;
  status: string;
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
  authorityType: string;
  citedName: string;
  normalizedName: string | null;
  jurisdiction: string | null;
  court: string | null;
  date: Date | null;
  sourceDatabase: string | null;
  existenceStatus: string;
  retrievalStatus: string;
  pinpointType: string;
  excerptText: string | null;
  excerptLocation: string | null;
  speakerClassification: string;
  propositionUnderReview: string | null;
  fitStatus: string | null;
  riskLevel: string | null;
  verificationStatus: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type AuthorityResearchItemRecord = {
  id: string;
  authorityId: string;
  researchItemId: string;
  createdAt: Date;
};

type DefectRecord = {
  id: string;
  matterId: string;
  authorityId: string | null;
  artifactType: string;
  artifactId: string;
  defectType: string;
  severity: string;
  stageDetected: string;
  description: string;
  requiredAction: string | null;
  restartScopeRecommended: string;
  restartScopeChosen: string | null;
  status: string;
  resolutionNote: string | null;
  discoveredBy: string | null;
  resolvedBy: string | null;
  reopenCount: number;
  createdAt: Date;
  updatedAt: Date;
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

class FakeDb {
  private matterSeq = 1;
  private researchSeq = 1;
  private authoritySeq = 1;
  private linkSeq = 1;
  private defectSeq = 1;

  matters: MatterRecord[] = [];
  researchItems: ResearchItemRecord[] = [];
  authorities: AuthorityRecord[] = [];
  authorityResearchItems: AuthorityResearchItemRecord[] = [];
  defects: DefectRecord[] = [];

  seedMatter(overrides: Partial<MatterRecord> = {}) {
    const now = new Date();
    const matter: MatterRecord = {
      id: overrides.id ?? `matter_${this.matterSeq++}`,
      title: overrides.title ?? "Test Matter",
      courseOrContext: overrides.courseOrContext ?? null,
      assignmentType: overrides.assignmentType ?? null,
      mainIssue: overrides.mainIssue ?? "Test issue",
      objective: overrides.objective ?? null,
      status: overrides.status ?? "researching",
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
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
    findMany: async (_args: any) => [],
    findUnique: async (_args: any) => null,
    update: async (_args: any) => null,
  };

  defect = {
    create: async (_args: any) => null,
    findMany: async (_args: any) => [],
    findFirst: async (_args: any) => null,
    update: async (_args: any) => null,
  };

  async $transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    return callback(this);
  }

  constructor() {
    this.matter.findUnique = async ({ where, select }: any) => {
      const matter = this.matters.find((item) => item.id === where.id);
      if (!matter) return null;
      return applySelect(matter, select);
    };

    this.researchItem.create = async ({ data }: any) => {
      const now = new Date();
      const record: ResearchItemRecord = {
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
      this.researchItems.push(record);
      return clone(record);
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
        authorityType: data.authorityType ?? "case_law",
        citedName: data.citedName,
        normalizedName: data.normalizedName ?? null,
        jurisdiction: data.jurisdiction ?? null,
        court: data.court ?? null,
        date: data.date ?? null,
        sourceDatabase: data.sourceDatabase ?? null,
        existenceStatus: data.existenceStatus ?? "ambiguous",
        retrievalStatus: data.retrievalStatus ?? "fail_no_text",
        pinpointType: data.pinpointType ?? "none",
        excerptText: data.excerptText ?? null,
        excerptLocation: data.excerptLocation ?? null,
        speakerClassification: data.speakerClassification ?? "unknown",
        propositionUnderReview: data.propositionUnderReview ?? null,
        fitStatus: data.fitStatus ?? null,
        riskLevel: data.riskLevel ?? null,
        verificationStatus: data.verificationStatus ?? "not_started",
        status: data.status ?? "candidate",
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

      if (data.researchItemLinks?.createMany?.data) {
        for (const link of data.researchItemLinks.createMany.data) {
          this.authorityResearchItems.push({
            id: `link_${this.linkSeq++}`,
            authorityId: authority.id,
            researchItemId: link.researchItemId,
            createdAt: now,
          });
        }
      }

      return clone(authority);
    };

    this.authority.findMany = async ({ where, select, orderBy }: any) => {
      let items = this.authorities.filter((item) => {
        if (where?.matterId && item.matterId !== where.matterId) return false;
        if (where?.status?.in && !where.status.in.includes(item.status)) return false;
        if (
          where?.verificationStatus?.in &&
          !where.verificationStatus.in.includes(item.verificationStatus)
        ) {
          return false;
        }
        return true;
      });

      if (Array.isArray(orderBy) && orderBy.some((entry) => entry.updatedAt === "desc")) {
        items = [...items].sort((a, b) => +b.updatedAt - +a.updatedAt);
      }

      return items.map((item) => {
        if (!select) return clone(item);

        const defects = this.defects
          .filter((defect) => defect.authorityId === item.id)
          .filter((defect) => {
            const allowed = select.defects?.where?.status?.in;
            return allowed ? allowed.includes(defect.status) : true;
          })
          .sort((a, b) => +b.createdAt - +a.createdAt)
          .map((defect) => applySelect(defect, select.defects.select));

        const researchItemLinks = this.authorityResearchItems
          .filter((link) => link.authorityId === item.id)
          .map((link) => applySelect(link, select.researchItemLinks?.select));

        return {
          ...applySelect(item, select),
          ...(select.defects ? { defects } : {}),
          ...(select.researchItemLinks ? { researchItemLinks } : {}),
        };
      });
    };

    this.authority.findUnique = async ({ where, include }: any) => {
      const authority = this.authorities.find((item) => item.id === where.id);
      if (!authority) return null;
      if (!include) return clone(authority);

      const linkedResearchItems = this.authorityResearchItems
        .filter((link) => link.authorityId === authority.id)
        .map((link) => ({
          ...clone(link),
          ...(include.researchItemLinks?.include?.researchItem
            ? {
                researchItem: clone(
                  this.researchItems.find((item) => item.id === link.researchItemId)!
                ),
              }
            : {}),
        }));

      const defects = this.defects
        .filter((defect) => defect.authorityId === authority.id)
        .sort((a, b) => {
          if (include.defects?.orderBy?.[0]?.status === "asc" && a.status !== b.status) {
            return a.status.localeCompare(b.status);
          }
          return +b.createdAt - +a.createdAt;
        })
        .map((defect) => clone(defect));

      return {
        ...clone(authority),
        ...(include.researchItemLinks ? { researchItemLinks: linkedResearchItems } : {}),
        ...(include.defects ? { defects } : {}),
      };
    };

    this.authority.update = async ({ where, data }: any) => {
      const index = this.authorities.findIndex((item) => item.id === where.id);
      if (index === -1) throw new Error("Authority not found");
      const updated: AuthorityRecord = {
        ...this.authorities[index],
        ...data,
        updatedAt: new Date(),
      };
      this.authorities[index] = updated;
      return clone(updated);
    };

    this.defect.create = async ({ data }: any) => {
      const now = new Date();
      const defect: DefectRecord = {
        id: `defect_${this.defectSeq++}`,
        matterId: data.matterId,
        authorityId: data.authorityId ?? null,
        artifactType: data.artifactType,
        artifactId: data.artifactId,
        defectType: data.defectType,
        severity: data.severity,
        stageDetected: data.stageDetected,
        description: data.description,
        requiredAction: data.requiredAction ?? null,
        restartScopeRecommended: data.restartScopeRecommended,
        restartScopeChosen: data.restartScopeChosen ?? null,
        status: data.status ?? "open",
        resolutionNote: data.resolutionNote ?? null,
        discoveredBy: data.discoveredBy ?? null,
        resolvedBy: data.resolvedBy ?? null,
        reopenCount: data.reopenCount ?? 0,
        createdAt: now,
        updatedAt: now,
      };
      this.defects.push(defect);
      return clone(defect);
    };

    this.defect.findMany = async ({ where, orderBy }: any) => {
      let items = this.defects.filter((defect) => {
        if (where?.authorityId && defect.authorityId !== where.authorityId) return false;
        if (where?.status?.in && !where.status.in.includes(defect.status)) return false;
        return true;
      });

      if (Array.isArray(orderBy)) {
        items = [...items].sort((a, b) => {
          const severityOrder = ["critical", "major", "minor"];
          if (orderBy[0]?.severity === "desc" && a.severity !== b.severity) {
            return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
          }
          if (orderBy.some((entry) => entry.createdAt === "desc")) {
            return +b.createdAt - +a.createdAt;
          }
          if (orderBy.some((entry) => entry.status === "asc") && a.status !== b.status) {
            return a.status.localeCompare(b.status);
          }
          return +b.updatedAt - +a.updatedAt;
        });
      }

      return items.map((item) => clone(item));
    };

    this.defect.findFirst = async ({ where, orderBy }: any) => {
      const items = await this.defect.findMany({
        where,
        orderBy: orderBy ? [orderBy] : [{ updatedAt: "desc" }],
      });
      return items[0] ?? null;
    };

    this.defect.update = async ({ where, data }: any) => {
      const index = this.defects.findIndex((item) => item.id === where.id);
      if (index === -1) throw new Error("Defect not found");

      const current = this.defects[index];
      const next: DefectRecord = {
        ...current,
        ...data,
        reopenCount:
          typeof data.reopenCount?.increment === "number"
            ? current.reopenCount + data.reopenCount.increment
            : current.reopenCount,
        updatedAt: new Date(),
      };
      this.defects[index] = next;
      return clone(next);
    };
  }
}

const fakeDb = new FakeDb();
(globalThis as typeof globalThis & { __db__?: unknown }).__db__ = fakeDb;

const researchService = await import("../research/research.service.ts");
const authorityService = await import("./authority.service.ts");

test("workflow: research item to verified authority", async () => {
  const matter = fakeDb.seedMatter({ title: "Duty of care matter" });

  const researchItem = await researchService.createResearchItem({
    matterId: matter.id,
    rawText: "See Example v. Sample, [2024] 1 SCR 1. The court held employers owe a duty of care.",
    sourceType: "snippet",
    notes: "Primary source note",
  });

  assert.ok(researchItem.candidateAuthorityNames?.includes("Example v. Sample"));

  const authority = await researchService.createAuthorityFromResearchItem({
    matterId: matter.id,
    researchItemId: researchItem.id,
    selectedCandidateAuthority: "See Example v. Sample,",
  });

  assert.equal(authority.citedName, "Example v. Sample");

  const itemsAfterCreate = await researchService.listResearchItemsForMatter(matter.id);
  assert.equal(itemsAfterCreate[0]?.status, "processed");

  const intake = await authorityService.runAuthorityIntakeChecks({
    authorityId: authority.id,
    providedSourceText: "[12] The court held that employers owe a duty of care in these circumstances.",
  });

  assert.equal(intake.authority.verificationStatus, "intake_passed");
  assert.equal(intake.authority.retrievalStatus, "pass");
  assert.equal(intake.authority.pinpointType, "paragraphs");

  const review = await authorityService.runAuthorityProvenanceReview({
    authorityId: authority.id,
    propositionUnderReview: "The court held that employers owe a duty of care in these circumstances.",
  });

  assert.equal(review.authority.verificationStatus, "fit_reviewed");
  assert.equal(review.authority.speakerClassification, "court_holding");
  assert.equal(review.authority.fitStatus, "supports");
  assert.equal(review.authority.riskLevel, "low");

  const decision = await authorityService.setAuthorityDecision({
    authorityId: authority.id,
    decision: "verified",
  });

  assert.equal(decision.authority.status, "eligible");
  assert.equal(decision.authority.verificationStatus, "verified");

  const queue = await authorityService.listAuthoritiesForMatter({ matterId: matter.id });
  assert.equal(queue.length, 1);
  assert.equal(queue[0]?.status, "eligible");
  assert.equal(queue[0]?.verificationStatus, "verified");
  assert.equal(queue[0]?.linkedResearchItemCount, 1);
  assert.equal(queue[0]?.defectCount, 0);

  const detail = await authorityService.getAuthorityForReview(authority.id);
  assert.equal(detail.researchItemLinks.length, 1);
  assert.equal(detail.defects.length, 0);
});

test("workflow: narrowing support requires verified_with_warning", async () => {
  const matter = fakeDb.seedMatter({ title: "Narrow support matter" });

  const researchItem = await researchService.createResearchItem({
    matterId: matter.id,
    rawText: "Sample v. Narrow, [2023] ONSC 10.",
    sourceType: "case_citation",
  });

  const authority = await researchService.createAuthorityFromResearchItem({
    matterId: matter.id,
    researchItemId: researchItem.id,
    selectedCandidateAuthority: "Sample v. Narrow",
  });

  await authorityService.runAuthorityIntakeChecks({
    authorityId: authority.id,
    providedSourceText: "[8] We conclude the specific contractual clause limits recovery on these facts.",
  });

  const review = await authorityService.runAuthorityProvenanceReview({
    authorityId: authority.id,
    propositionUnderReview: "Employers always owe a broad common law duty regardless of the contract.",
  });

  assert.equal(review.authority.fitStatus, "supports_narrower_only");
  assert.equal(review.authority.riskLevel, "medium");
  assert.equal(review.defects.length, 1);
  assert.equal(review.defects[0]?.defectType, "SUPPORTS_NARROWER_ONLY");

  await assert.rejects(
    authorityService.setAuthorityDecision({
      authorityId: authority.id,
      decision: "verified",
    }),
    /requires fitStatus='supports'/
  );

  const warningDecision = await authorityService.setAuthorityDecision({
    authorityId: authority.id,
    decision: "verified_with_warning",
  });

  assert.equal(warningDecision.authority.status, "eligible");
  assert.equal(warningDecision.authority.verificationStatus, "verified_with_warning");

  const defects = await authorityService.listAuthorityDefects(authority.id);
  assert.equal(defects.length, 1);
  assert.equal(defects[0]?.severity, "major");
});

test("workflow: insufficient intake source info blocks authority and prevents eligible transition", async () => {
  const matter = fakeDb.seedMatter({ title: "Blocked intake matter" });

  const researchItem = await researchService.createResearchItem({
    matterId: matter.id,
    rawText: "Bare citation only: Example v. Thin Record",
    sourceType: "case_citation",
  });

  const authority = await researchService.createAuthorityFromResearchItem({
    matterId: matter.id,
    researchItemId: researchItem.id,
    selectedCandidateAuthority: "Example v. Thin Record",
  });

  const intake = await authorityService.runAuthorityIntakeChecks({
    authorityId: authority.id,
  });

  assert.equal(intake.authority.status, "blocked");
  assert.equal(intake.authority.verificationStatus, "blocked");
  assert.equal(intake.intakeResult.defect?.defectType, "AUTH_AMBIGUOUS_MATCH");
  assert.equal(intake.defects.length, 1);
  assert.equal(intake.defects[0]?.defectType, "AUTH_AMBIGUOUS_MATCH");

  const reloaded = await authorityService.getAuthorityForReview(authority.id);
  assert.equal(reloaded.status, "blocked");
  assert.equal(reloaded.defects.length, 1);

  await assert.rejects(
    authorityService.setAuthorityDecision({
      authorityId: authority.id,
      decision: "verified_with_warning",
    }),
    /Invalid verification status transition|not eligible/
  );
});

test("workflow: duplicate provenance reruns do not create duplicate open defects", async () => {
  const matter = fakeDb.seedMatter({ title: "Deduped defect matter" });

  const researchItem = await researchService.createResearchItem({
    matterId: matter.id,
    rawText: "Example v. Narrow Support",
    sourceType: "snippet",
  });

  const authority = await researchService.createAuthorityFromResearchItem({
    matterId: matter.id,
    researchItemId: researchItem.id,
    selectedCandidateAuthority: "Example v. Narrow Support",
  });

  await authorityService.runAuthorityIntakeChecks({
    authorityId: authority.id,
    providedSourceText: "[8] We conclude this proposition applies only on the narrow contractual wording before us.",
  });

  await authorityService.runAuthorityProvenanceReview({
    authorityId: authority.id,
    propositionUnderReview: "The proposition applies in all employment disputes regardless of contractual wording.",
  });

  await authorityService.runAuthorityProvenanceReview({
    authorityId: authority.id,
    propositionUnderReview: "The proposition applies in all employment disputes regardless of contractual wording.",
  });

  const defects = await authorityService.listAuthorityDefects(authority.id);
  assert.equal(defects.length, 1);
  assert.equal(defects[0]?.defectType, "SUPPORTS_NARROWER_ONLY");
  assert.equal(defects[0]?.status, "open");
});
