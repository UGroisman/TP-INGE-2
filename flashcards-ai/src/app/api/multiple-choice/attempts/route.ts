import {
  normalizeTopic,
} from "@/features/adaptive-learning/algorithm";
import { getAuthenticatedServerClient } from "@/features/auth/server";
import { validateAttemptRequest } from "@/features/adaptive-learning/server";
import type { MultipleChoiceAttemptResponse } from "@/features/adaptive-learning/types";

interface AttemptRow {
  is_correct: boolean;
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedServerClient(
    "Iniciá sesión para guardar tu progreso.",
  );

  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, user } = auth;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "El cuerpo de la solicitud debe ser JSON válido." },
      { status: 400 },
    );
  }

  const validation = validateAttemptRequest(body);

  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const attempt = validation.attempt;
  const { data, error } = await supabase
    .from("multiple_choice_attempts")
    .insert({
      user_id: user.id,
      question_instance_id: attempt.questionId,
      topic: attempt.topic,
      topic_key: normalizeTopic(attempt.topic),
      education_level: attempt.level,
      source: attempt.source,
      difficulty: attempt.difficulty,
      question: attempt.question,
      selected_option_index: attempt.selectedOptionIndex,
      correct_option_index: attempt.correctOptionIndex,
    })
    .select("is_correct")
    .single();

  if (!error && data) {
    return savedResponse((data as AttemptRow).is_correct, 201);
  }

  if (error?.code === "23505") {
    const { data: existingAttempt, error: existingError } = await supabase
      .from("multiple_choice_attempts")
      .select("is_correct")
      .eq("question_instance_id", attempt.questionId)
      .maybeSingle();

    if (!existingError && existingAttempt) {
      return savedResponse(
        (existingAttempt as AttemptRow).is_correct,
        200,
      );
    }
  }

  return Response.json(
    { error: "No pudimos guardar tu progreso." },
    { status: 500 },
  );
}

function savedResponse(isCorrect: boolean, status: number) {
  const response: MultipleChoiceAttemptResponse = {
    saved: true,
    isCorrect,
  };

  return Response.json(response, { status });
}
