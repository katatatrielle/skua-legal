import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_MATTER_ID = "matter_demo";

async function main() {
  await prisma.matter.deleteMany({
    where: { id: DEMO_MATTER_ID },
  });

  const matter = await prisma.matter.create({
    data: {
      id: DEMO_MATTER_ID,
      title: "CleanRoom Demo Matter",
      courseOrContext: "Runnable local MVP walkthrough",
      mainIssue: "Can the workspace move from raw research to a traceable section draft with restart-aware review?",
      objective: "Provide stable seeded data for manual QA and deterministic Playwright coverage.",
      status: "drafting",
    },
  });

  const verifiedResearch = await prisma.researchItem.create({
    data: {
      matterId: matter.id,
      sourceType: "snippet",
      rawText:
        "[42] The court held that an employer must document accommodation efforts before asserting undue hardship.",
      notes: "Retrieved and prepared for authority intake.",
      status: "processed",
      candidateAuthorityNames: ["Demo v. Reliable Authority", "2024 SCC 12"],
    },
  });

  const blockedResearch = await prisma.researchItem.create({
    data: {
      matterId: matter.id,
      sourceType: "note",
      rawText: "Counsel argued the employer owes no duty to explore alternatives in similar cases.",
      notes: "This turns out to be an unsupported counsel submission and stays blocked.",
      status: "processed",
      candidateAuthorityNames: ["Demo v. Risky Authority"],
    },
  });

  const verifiedAuthority = await prisma.authority.create({
    data: {
      matterId: matter.id,
      preferredSourceResearchItemId: verifiedResearch.id,
      citedName: "Demo v. Reliable Authority",
      normalizedName: "Demo v. Reliable Authority",
      jurisdiction: "Canada",
      court: "SCC",
      sourceDatabase: "CanLII",
      existenceStatus: "pass",
      retrievalStatus: "pass",
      pinpointType: "paragraphs",
      excerptText:
        "[42] The court held that an employer must document accommodation efforts before asserting undue hardship.",
      excerptLocation: "para. 42",
      speakerClassification: "court_holding",
      propositionUnderReview: "Employers must document accommodation efforts before relying on undue hardship.",
      fitStatus: "supports",
      riskLevel: "low",
      verificationStatus: "verified",
      status: "eligible",
      researchItemLinks: {
        create: {
          researchItemId: verifiedResearch.id,
        },
      },
    },
  });

  const blockedAuthority = await prisma.authority.create({
    data: {
      matterId: matter.id,
      preferredSourceResearchItemId: blockedResearch.id,
      citedName: "Demo v. Risky Authority",
      normalizedName: "Demo v. Risky Authority",
      jurisdiction: "Canada",
      court: "ONCA",
      sourceDatabase: "CanLII",
      existenceStatus: "pass",
      retrievalStatus: "pass",
      pinpointType: "paragraphs",
      excerptText: "[18] Counsel submitted that no additional accommodation steps were required.",
      excerptLocation: "para. 18",
      speakerClassification: "party_submission",
      propositionUnderReview: "Employers owe no duty to explore alternatives once inconvenience appears.",
      fitStatus: "does_not_support",
      riskLevel: "high",
      verificationStatus: "blocked",
      status: "blocked",
      researchItemLinks: {
        create: {
          researchItemId: blockedResearch.id,
        },
      },
    },
  });

  await prisma.defect.create({
    data: {
      matterId: matter.id,
      authorityId: blockedAuthority.id,
      artifactType: "authority",
      artifactId: blockedAuthority.id,
      defectType: "COUNSEL_ARG_AS_LAW",
      severity: "major",
      stageDetected: "provenance_fit_review",
      description: "The key passage is counsel argument rather than adopted law, so downstream use stays blocked.",
      restartScopeRecommended: "section",
      status: "open",
    },
  });

  const authorityCheckpoint = await prisma.checkpoint.create({
    data: {
      matterId: matter.id,
      stage: "authority_clean",
      status: "clean",
    },
  });

  const outlineNode = await prisma.outlineNode.create({
    data: {
      matterId: matter.id,
      title: "Accommodation documentation rule",
      nodeType: "rule",
      proposition: "The rule section should explain that documented accommodation efforts matter before undue hardship is accepted.",
      orderIndex: 0,
      status: "ready",
      taintStatus: "clean",
    },
  });

  await prisma.outlineNodeAuthority.create({
    data: {
      outlineNodeId: outlineNode.id,
      authorityId: verifiedAuthority.id,
    },
  });

  await prisma.checkpoint.create({
    data: {
      matterId: matter.id,
      stage: "outline_clean",
      status: "clean",
    },
  });

  const sectionCheckpoint = await prisma.checkpoint.create({
    data: {
      matterId: matter.id,
      stage: "section_clean",
      status: "clean",
    },
  });

  const draftSection = await prisma.draftSection.create({
    data: {
      matterId: matter.id,
      outlineNodeId: outlineNode.id,
      text:
        "Accommodation documentation rule. Paragraph 1. Employers should document accommodation efforts before invoking undue hardship.\n\nDemo v. Reliable Authority: [42] The court held that an employer must document accommodation efforts before asserting undue hardship.",
      status: "draft",
      taintStatus: "clean",
      checkpointParent: sectionCheckpoint.id,
    },
  });

  await prisma.claimSupportLink.create({
    data: {
      draftSectionId: draftSection.id,
      claimText: "Employers should document accommodation efforts before invoking undue hardship.",
      claimLocation: "Paragraph 1",
      authorityId: verifiedAuthority.id,
      excerptText:
        "[42] The court held that an employer must document accommodation efforts before asserting undue hardship.",
      excerptLocation: "para. 42",
      speakerClassification: "court_holding",
      fitStatus: "supports",
      verificationSummary: "Verified support from a court holding.",
      status: "verified",
    },
  });

  await prisma.modelRun.createMany({
    data: [
      {
        matterId: matter.id,
        authorityId: verifiedAuthority.id,
        stage: "provenance_review",
        provider: "heuristic",
        model: "heuristic-provenance-review",
        status: "succeeded",
        estimatedCostUsd: 0,
        metadata: {
          fallbackUsed: false,
        },
      },
      {
        matterId: matter.id,
        outlineNodeId: outlineNode.id,
        draftSectionId: draftSection.id,
        stage: "section_drafting",
        provider: "heuristic",
        model: "heuristic-section-draft",
        status: "succeeded",
        estimatedCostUsd: 0,
        metadata: {
          claimCount: 1,
        },
      },
    ],
  });

  await prisma.matterEvent.createMany({
    data: [
      {
        matterId: matter.id,
        eventType: "authority_decision_recorded",
        stage: "provenance_fit_review",
        entityType: "authority",
        entityId: verifiedAuthority.id,
        summary: "Authority Demo v. Reliable Authority marked verified.",
      },
      {
        matterId: matter.id,
        eventType: "authority_decision_recorded",
        stage: "provenance_fit_review",
        entityType: "authority",
        entityId: blockedAuthority.id,
        summary: "Authority Demo v. Risky Authority marked blocked.",
      },
      {
        matterId: matter.id,
        eventType: "section_drafted",
        stage: "drafting",
        entityType: "draft_section",
        entityId: draftSection.id,
        summary: "Seeded section draft created from clean authority support.",
      },
      {
        matterId: matter.id,
        eventType: "checkpoint_created",
        stage: "drafting",
        entityType: "checkpoint",
        entityId: sectionCheckpoint.id,
        summary: "Seeded section_clean checkpoint for manual QA and restart testing.",
      },
    ],
  });

  console.log(`Seeded demo matter: ${matter.id}`);
  console.log(`Authority checkpoint: ${authorityCheckpoint.id}`);
  console.log(`Draft section: ${draftSection.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
