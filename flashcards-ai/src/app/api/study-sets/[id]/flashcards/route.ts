import {
  getAuthenticatedSupabase,
  validateFlashcardInput,
} from "@/features/study-sets/server";

interface FlashcardSaveRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: Request,
  context: FlashcardSaveRouteContext,
) {
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

  if (typeof body !== "object" || body === null || !("card" in body)) {
    return Response.json(
      { error: "La solicitud debe incluir una flashcard." },
      { status: 400 },
    );
  }

  const validation = validateFlashcardInput(body.card);

  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const { id: studySetId } = await context.params;
  const { data: studySet } = await auth.supabase
    .from("study_sets")
    .select("id")
    .eq("id", studySetId)
    .maybeSingle();

  if (!studySet) {
    return Response.json(
      { error: "No encontramos ese study set." },
      { status: 404 },
    );
  }

  const { data, error } = await auth.supabase
    .from("flashcards")
    .insert({
      id: crypto.randomUUID(),
      study_set_id: studySetId,
      question: validation.card.question,
      answer: validation.card.answer,
    })
    .select("id, question, answer")
    .single();

  if (error || !data) {
    return Response.json(
      { error: "No pudimos guardar la flashcard." },
      { status: 500 },
    );
  }

  return Response.json({ flashcard: data }, { status: 201 });
}
