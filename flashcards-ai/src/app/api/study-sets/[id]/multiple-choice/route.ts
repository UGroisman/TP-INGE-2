import {
  getAuthenticatedSupabase,
  validateMultipleChoiceInput,
} from "@/features/study-sets/server";

interface MultipleChoiceSaveRouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface OptionRow {
  id: string;
  answer: string;
  is_correct: boolean;
}

export async function POST(
  request: Request,
  context: MultipleChoiceSaveRouteContext,
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

  if (typeof body !== "object" || body === null || !("question" in body)) {
    return Response.json(
      { error: "La solicitud debe incluir una pregunta." },
      { status: 400 },
    );
  }

  const validation = validateMultipleChoiceInput(body.question);

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

  const questionId = crypto.randomUUID();
  const { data: questionData, error: questionError } = await auth.supabase
    .from("multiple_choice_questions")
    .insert({
      id: questionId,
      study_set_id: studySetId,
      question: validation.question.question,
    })
    .select("id, question")
    .single();

  if (questionError || !questionData) {
    return Response.json(
      { error: "No pudimos guardar la pregunta." },
      { status: 500 },
    );
  }

  const optionRows = validation.question.options.map((option, optionIndex) => ({
    id: crypto.randomUUID(),
    question_id: questionId,
    answer: option,
    is_correct: optionIndex === validation.question.correctOptionIndex,
  }));

  const { data: optionsData, error: optionsError } = await auth.supabase
    .from("multiple_choice_options")
    .insert(optionRows)
    .select("id, answer, is_correct");

  if (optionsError || !optionsData) {
    await auth.supabase
      .from("multiple_choice_questions")
      .delete()
      .eq("id", questionId);

    return Response.json(
      { error: "No pudimos guardar las opciones de la pregunta." },
      { status: 500 },
    );
  }

  return Response.json(
    {
      question: {
        id: questionData.id,
        question: questionData.question,
        options: (optionsData as OptionRow[]).map((option) => ({
          id: option.id,
          text: option.answer,
          isCorrect: option.is_correct,
        })),
      },
    },
    { status: 201 },
  );
}
