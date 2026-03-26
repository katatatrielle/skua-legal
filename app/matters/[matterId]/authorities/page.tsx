import { AuthorityReviewScreen } from "../../../../components/authority/authority-review-screen";
import { db } from "../../../../lib/db";

type AuthoritiesPageProps = {
  params: Promise<{ matterId: string }>;
  searchParams?: Promise<{ authorityId?: string }>;
};

export default async function AuthoritiesPage({ params, searchParams }: AuthoritiesPageProps) {
  const { matterId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const matter = await db.matter.findUnique({
    where: { id: matterId },
    select: { title: true, mainIssue: true, courseOrContext: true },
  });

  return (
    <AuthorityReviewScreen
      matterId={matterId}
      matterTitle={matter?.title ?? "Matter"}
      matterDescription={matter?.mainIssue ?? matter?.courseOrContext ?? "Authority Review"}
      initialAuthorityId={resolvedSearchParams?.authorityId}
    />
  );
}
