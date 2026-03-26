import { ResearchInbox } from "../../../../components/research/research-inbox";
import { db } from "../../../../lib/db";

type ResearchPageProps = {
  params: Promise<{ matterId: string }>;
};

export default async function ResearchPage({ params }: ResearchPageProps) {
  const { matterId } = await params;
  const matter = await db.matter.findUnique({
    where: { id: matterId },
    select: { title: true, mainIssue: true, courseOrContext: true },
  });

  return (
    <ResearchInbox
      matterId={matterId}
      matterTitle={matter?.title ?? "Matter"}
      matterDescription={matter?.mainIssue ?? matter?.courseOrContext ?? "Research Inbox"}
    />
  );
}
