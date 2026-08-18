import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionUnavailable } from "@/features/auth/components/SessionUnavailable";
import { getServerAuthState } from "@/features/auth/server";
import { StudySetDetailLoader } from "@/features/study-sets/components/StudySetDetailLoader";

interface StudySetDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function StudySetDetailPage({
  params,
}: StudySetDetailPageProps) {
  const { id } = await params;
  const pagePath = `/study-sets/${id}`;
  const auth = await getServerAuthState();

  if (auth.status === "anonymous") {
    redirect(`/login?next=${encodeURIComponent(pagePath)}`);
  }

  if (auth.status === "unavailable") {
    return <SessionUnavailable retryHref={pagePath} />;
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <Link
          href="/study-sets"
          className="text-sm font-semibold text-teal-700 hover:text-teal-900"
        >
          Volver a study sets
        </Link>
      </div>

      <StudySetDetailLoader studySetId={id} />
    </div>
  );
}
