import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_MATTER_ID = "matter_demo";

async function main() {
  const matter = await prisma.matter.upsert({
    where: { id: DEMO_MATTER_ID },
    update: {
      title: "CleanRoom Demo Matter",
      courseOrContext: "Runnable local scaffold",
      mainIssue: "Can the research inbox and authority review flow boot against live persistence?",
      objective: "Provide a stable local matter for manual QA and future Playwright tests.",
      status: "researching",
    },
    create: {
      id: DEMO_MATTER_ID,
      title: "CleanRoom Demo Matter",
      courseOrContext: "Runnable local scaffold",
      mainIssue: "Can the research inbox and authority review flow boot against live persistence?",
      objective: "Provide a stable local matter for manual QA and future Playwright tests.",
      status: "researching",
    },
  });

  console.log(`Seeded demo matter: ${matter.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
