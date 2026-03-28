import { db } from "../../lib/db.ts";
import type { CreateMatterInput } from "./matter.validators.ts";
import { validateCreateMatterInput } from "./matter.validators.ts";

export async function listMatters() {
  const matters = await db.matter.findMany({
    select: {
      id: true,
      title: true,
      courseOrContext: true,
      mainIssue: true,
      objective: true,
      status: true,
      updatedAt: true,
      _count: {
        select: {
          researchItems: true,
          authorities: true,
          outlineNodes: true,
          draftSections: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return matters.map((matter) => ({
    id: matter.id,
    title: matter.title,
    courseOrContext: matter.courseOrContext,
    mainIssue: matter.mainIssue,
    objective: matter.objective,
    status: matter.status,
    updatedAt: matter.updatedAt.toISOString(),
    counts: {
      researchItems: matter._count.researchItems,
      authorities: matter._count.authorities,
      outlineNodes: matter._count.outlineNodes,
      draftSections: matter._count.draftSections,
    },
  }));
}

export async function createMatter(input: CreateMatterInput) {
  const validated = validateCreateMatterInput(input);

  const matter = await db.matter.create({
    data: {
      title: validated.title,
      courseOrContext: validated.courseOrContext,
      mainIssue: validated.mainIssue,
      objective: validated.objective,
      status: "researching",
    },
  });

  return {
    id: matter.id,
    title: matter.title,
    courseOrContext: matter.courseOrContext,
    mainIssue: matter.mainIssue,
    objective: matter.objective,
    status: matter.status,
    updatedAt: matter.updatedAt.toISOString(),
    counts: {
      researchItems: 0,
      authorities: 0,
      outlineNodes: 0,
      draftSections: 0,
    },
  };
}
