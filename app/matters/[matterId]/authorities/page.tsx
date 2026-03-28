import { AuthorityReviewScreen } from "../../../../components/authority/authority-review-screen";
import { db } from "../../../../lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

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
  if (!matter) notFound();

  return (
    <AuthorityReviewScreen
      matterId={matterId}
      matterTitle={matter.title}
      matterDescription={matter.mainIssue ?? matter.courseOrContext ?? "Authority Review"}
      initialAuthorityId={resolvedSearchParams?.authorityId}
    />
  );
}
