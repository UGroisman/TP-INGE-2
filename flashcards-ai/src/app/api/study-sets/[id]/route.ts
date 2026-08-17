import { getStudySetDetail } from "@/features/study-sets/server";

interface StudySetRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, context: StudySetRouteContext) {
  const { id } = await context.params;
  const result = await getStudySetDetail(id);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ studySet: result.studySet });
}
