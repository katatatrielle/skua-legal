import { notFound } from "next/navigation";
import { DraftWorkspace } from "../../../../components/draft/draft-workspace";
import { db } from "../../../../lib/db";

export const dynamic = "force-dynamic";

type DraftPageProps = {
  params: Promise<{ matterId: string }>;
};

export default async function DraftPage({ params }: DraftPageProps) {
  const { matterId } = await params;
  const matter = await db.matter.findUnique({
    where: { id: matterId },
    select: { title: true, mainIssue: true, courseOrContext: true },
  });

  if (!matter) notFound();

  return (
    <DraftWorkspace
      matterId={matterId}
      matterTitle={matter.title}
      matterDescription={matter.mainIssue ?? matter.courseOrContext ?? "Draft Workspace"}
    />
  );
}
