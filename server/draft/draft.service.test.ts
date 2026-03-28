import test from "node:test";
import assert from "node:assert/strict";

type MatterRecord = { id: string };
type AuthorityRecord = {
  id: string;
  matterId: string;
  citedName: string;
  verificationStatus: string;
  status: string;
  fitStatus: string | null;
  excerptText: string | null;
  excerptLocation: string | null;
  propositionUnderReview: string | null;
  speakerClassification: string;
};
type OutlineNodeRecord = {
  id: string;
  matterId: string;
  title: string;
  proposition: string | null;
  nodeType: string;
  orderIndex: number;
  status: string;
  taintStatus: string;
  createdAt: Date;
  updatedAt: Date;
};
type OutlineNodeAuthorityRecord = { outlineNodeId: string; authorityId: string };
type DraftSectionRecord = {
  id: string;
  matterId: string;
  outlineNodeId: string;
  text: string;
  status: string;
  taintStatus: string;
  updatedAt: Date;
};
type ClaimSupportLinkRecord = {
  id: string;
  draftSectionId: string;
  authorityId: string;
  claimText: string;
  excerptText: string;
  excerptLocation: string | null;
  fitStatus: string;
  verificationSummary: string | null;
  status: string;
};

class FakeDraftDb {
  matters: MatterRecord[] = [{ id: "matter_1" }];
  authorities: AuthorityRecord[] = [
    {
      id: "auth_1",
      matterId: "matter_1",
      citedName: "Example v Sample",
      verificationStatus: "verified_with_warning",
      status: "eligible",
      fitStatus: "supports_narrower_only",
      excerptText: "[12] The ratio is narrow but supportive.",
      excerptLocation: "paras 12-13",
      propositionUnderReview: "The ratio supports the narrower accommodation standard.",
      speakerClassification: "court_holding",
    },
  ];
  outlineNodes: OutlineNodeRecord[] = [];
  outlineNodeAuthorities: OutlineNodeAuthorityRecord[] = [];
  draftSections: DraftSectionRecord[] = [];
  claimSupportLinks: ClaimSupportLinkRecord[] = [];
  private outlineSeq = 1;
  private draftSeq = 1;
  private supportSeq = 1;

  matter = {
    findUnique: async ({ where }: any) => this.matters.find((matter) => matter.id === where.id) ?? null,
  };

  authority = {
    findMany: async ({ where }: any) =>
      this.authorities.filter((authority) => authority.matterId === where.matterId && authority.status === "eligible"),
    findUnique: async ({ where }: any) => this.authorities.find((authority) => authority.id === where.id) ?? null,
  };

  outlineNode = {
    count: async ({ where }: any) => this.outlineNodes.filter((node) => node.matterId === where.matterId).length,
    create: async ({ data }: any) => {
      const record: OutlineNodeRecord = {
        id: `node_${this.outlineSeq++}`,
        matterId: data.matterId,
        title: data.title,
        proposition: data.proposition ?? null,
        nodeType: data.nodeType,
        orderIndex: data.orderIndex,
        status: data.status,
        taintStatus: "clean",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.outlineNodes.push(record);
      return record;
    },
    findMany: async () => [],
    findUnique: async ({ where, include }: any) => {
      const node = this.outlineNodes.find((record) => record.id === where.id);
      if (!node) return null;
      if (!include) return node;
      return {
        ...node,
        authorityLinks: this.outlineNodeAuthorities
          .filter((link) => link.outlineNodeId === node.id)
          .map((link) => ({
            authorityId: link.authorityId,
            authority: this.authorities.find((authority) => authority.id === link.authorityId),
          })),
        draftSections: this.draftSections
          .filter((section) => section.outlineNodeId === node.id)
          .map((section) => ({
            ...section,
            claimSupportLinks: this.claimSupportLinks.filter((link) => link.draftSectionId === section.id),
          })),
      };
    },
    update: async ({ where, data }: any) => {
      const node = this.outlineNodes.find((record) => record.id === where.id);
      if (!node) throw new Error("Outline node not found");
      Object.assign(node, data, { updatedAt: new Date() });
      return node;
    },
  };

  outlineNodeAuthority = {
    upsert: async ({ where, create }: any) => {
      const exists = this.outlineNodeAuthorities.find(
        (link) =>
          link.outlineNodeId === where.outlineNodeId_authorityId.outlineNodeId &&
          link.authorityId === where.outlineNodeId_authorityId.authorityId
      );
      if (!exists) {
        this.outlineNodeAuthorities.push({
          outlineNodeId: create.outlineNodeId,
          authorityId: create.authorityId,
        });
      }
    },
  };

  draftSection = {
    create: async ({ data }: any) => {
      const section: DraftSectionRecord = {
        id: `section_${this.draftSeq++}`,
        matterId: data.matterId,
        outlineNodeId: data.outlineNodeId,
        text: data.text,
        status: data.status,
        taintStatus: data.taintStatus,
        updatedAt: new Date(),
      };
      this.draftSections.push(section);
      return section;
    },
    update: async ({ where, data }: any) => {
      const section = this.draftSections.find((record) => record.id === where.id);
      if (!section) throw new Error("Draft section not found");
      Object.assign(section, data, { updatedAt: new Date() });
      return section;
    },
    findUnique: async ({ where, include }: any) => {
      const section = this.draftSections.find((record) => record.id === where.id);
      if (!section) return null;
      if (!include) return section;
      return {
        ...section,
        claimSupportLinks: this.claimSupportLinks
          .filter((link) => link.draftSectionId === section.id)
          .map((link) => ({
            ...link,
            authority: {
              id: link.authorityId,
              citedName: this.authorities.find((authority) => authority.id === link.authorityId)?.citedName ?? "Unknown",
            },
          })),
      };
    },
  };

  claimSupportLink = {
    deleteMany: async ({ where }: any) => {
      this.claimSupportLinks = this.claimSupportLinks.filter((link) => link.draftSectionId !== where.draftSectionId);
    },
    create: async ({ data }: any) => {
      this.claimSupportLinks.push({
        id: `support_${this.supportSeq++}`,
        draftSectionId: data.draftSectionId,
        authorityId: data.authorityId,
        claimText: data.claimText,
        excerptText: data.excerptText,
        excerptLocation: data.excerptLocation ?? null,
        fitStatus: data.fitStatus,
        verificationSummary: data.verificationSummary ?? null,
        status: data.status,
      });
    },
  };

  async $transaction<T>(callback: (tx: this) => Promise<T>) {
    return callback(this);
  }
}

const fakeDb = new FakeDraftDb();
(globalThis as typeof globalThis & { __db__?: unknown }).__db__ = fakeDb as unknown;

const draftService = await import("./draft.service.ts");

test("creates an outline node and drafts a section from attached verified authority", async () => {
  const node = await draftService.createOutlineNode({
    matterId: "matter_1",
    title: "Accommodation analysis",
    proposition: "The narrower accommodation standard still supports the employee.",
  });

  await draftService.attachAuthorityToOutlineNode({
    outlineNodeId: node.id,
    authorityId: "auth_1",
  });

  const section = await draftService.draftSectionFromOutlineNode({ outlineNodeId: node.id });
  assert.match(section.text, /Accommodation analysis/);
  assert.equal(section.claimSupportLinks.length, 1);
  assert.equal(section.claimSupportLinks[0].status, "warning");
  assert.equal(section.claimSupportLinks[0].authority.citedName, "Example v Sample");
});
