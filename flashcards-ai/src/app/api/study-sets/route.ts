import {
  getAuthenticatedSupabase,
  toStudySetSummary,
  validateStudySetTopic,
} from "@/features/study-sets/server";

interface StudySetRow {
  id: string;
  topic: string;
  created_at: string | null;
}

export async function GET() {
  const auth = await getAuthenticatedSupabase();

  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("study_sets")
    .select("id, topic, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json(
      { error: "No pudimos cargar tus study sets." },
      { status: 500 },
    );
  }

  const studySets = ((data ?? []) as StudySetRow[]).map(toStudySetSummary);

  return Response.json({ studySets });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "El cuerpo de la solicitud debe ser JSON válido." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null || !("topic" in body)) {
    return Response.json(
      { error: "La solicitud debe incluir el nombre del study set." },
      { status: 400 },
    );
  }

  const validation = validateStudySetTopic(body.topic);

  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("study_sets")
    .insert({
      id: crypto.randomUUID(),
      topic: validation.topic,
      user_id: auth.user.id,
    })
    .select("id, topic, created_at")
    .single();

  if (error || !data) {
    return Response.json(
      { error: "No pudimos crear el study set." },
      { status: 500 },
    );
  }

  return Response.json(
    { studySet: toStudySetSummary(data as StudySetRow) },
    { status: 201 },
  );
}
