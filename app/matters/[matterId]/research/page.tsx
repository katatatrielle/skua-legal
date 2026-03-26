import { ResearchInbox } from "../../../../components/research/research-inbox";

type ResearchPageProps = {
  params: Promise<{ matterId: string }>;
};

export default async function ResearchPage({ params }: ResearchPageProps) {
  const { matterId } = await params;

  return (
    <ResearchInbox
      matterId={matterId}
      matterTitle="Matter"
      matterDescription="Research Inbox"
    />
  );
}
