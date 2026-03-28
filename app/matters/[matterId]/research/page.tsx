import { ResearchInbox } from "../../../../components/research/research-inbox";
import { db } from "../../../../lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type ResearchPageProps = {
  params: Promise<{ matterId: string }>;
};

export default async function ResearchPage({ params }: ResearchPageProps) {
  const { matterId } = await params;
  const matter = await db.matter.findUnique({
    where: { id: matterId },
    select: { title: true, mainIssue: true, courseOrContext: true },
  });
  if (!matter) notFound();

  return (
    <ResearchInbox
      matterId={matterId}
      matterTitle={matter.title}
      matterDescription={matter.mainIssue ?? matter.courseOrContext ?? "Research Inbox"}
    />
  );
}
