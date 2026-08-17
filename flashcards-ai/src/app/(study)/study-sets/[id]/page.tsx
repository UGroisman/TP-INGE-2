import Link from "next/link";
import { redirect } from "next/navigation";
import { StudySetDetailLoader } from "@/features/study-sets/components/StudySetDetailLoader";
import { createClient } from "@/lib/supabase/server";

interface StudySetDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function StudySetDetailPage({
  params,
}: StudySetDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/study-sets/${id}`)}`);
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
