import type { Flashcard } from "@/features/flashcards/types";
import { getAuthenticatedServerClient } from "@/features/auth/server";
import type { MultipleChoiceContent } from "@/features/multiple-choice/types";
import type {
  SavedMultipleChoiceOption,
  StudySetDetail,
  StudySetSummary,
} from "@/features/study-sets/types";

interface StudySetRow {
  id: string;
  topic: string;
  created_at: string | null;
}

interface FlashcardRow {
  id: string;
  question: string;
  answer: string;
}

interface MultipleChoiceQuestionRow {
  id: string;
  question: string;
  generation_difficulty: "easy" | "medium" | "hard" | null;
}

interface MultipleChoiceOptionRow {
  id: string;
  question_id: string;
  answer: string;
  is_correct: boolean;
}

export function toStudySetSummary(row: StudySetRow): StudySetSummary {
  return {
    id: row.id,
    topic: row.topic,
    createdAt: row.created_at,
  };
}

export async function getAuthenticatedSupabase() {
  return getAuthenticatedServerClient(
    "Iniciá sesión para usar tus study sets.",
  );
}

export function validateStudySetTopic(topic: unknown) {
  if (typeof topic !== "string") {
    return { ok: false as const, error: "El nombre del study set debe ser texto." };
  }

  const trimmedTopic = topic.trim();

  if (trimmedTopic.length === 0) {
    return { ok: false as const, error: "Ingresá un nombre para el study set." };
  }

  if (trimmedTopic.length < 3 || trimmedTopic.length > 100) {
    return {
      ok: false as const,
      error: "El nombre debe tener entre 3 y 100 caracteres.",
    };
  }

  return { ok: true as const, topic: trimmedTopic };
}

export function validateFlashcardInput(value: unknown):
  | { ok: true; card: Flashcard }
  | { ok: false; error: string } {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "La flashcard no tiene un formato válido." };
  }

  if (
    !("question" in value) ||
    !("answer" in value) ||
    typeof value.question !== "string" ||
    typeof value.answer !== "string"
  ) {
    return { ok: false, error: "La flashcard debe incluir pregunta y respuesta." };
  }

  const question = value.question.trim();
  const answer = value.answer.trim();

  if (!question || !answer) {
    return { ok: false, error: "La pregunta y la respuesta no pueden estar vacías." };
  }

  return { ok: true, card: { question, answer } };
}

export function validateMultipleChoiceInput(value: unknown):
  | { ok: true; question: MultipleChoiceContent }
  | { ok: false; error: string } {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "La pregunta no tiene un formato válido." };
  }

  if (
    !("question" in value) ||
    !("options" in value) ||
    !("correctOptionIndex" in value) ||
    typeof value.question !== "string" ||
    !Array.isArray(value.options) ||
    typeof value.correctOptionIndex !== "number"
  ) {
    return {
      ok: false,
      error: "La pregunta debe incluir texto, opciones y respuesta correcta.",
    };
  }

  const question = value.question.trim();
  const options = value.options;
  const correctOptionIndex = value.correctOptionIndex;

  if (!question) {
    return { ok: false, error: "La pregunta no puede estar vacía." };
  }

  if (options.length !== 4) {
    return { ok: false, error: "La pregunta debe tener exactamente 4 opciones." };
  }

  if (
    !Number.isInteger(correctOptionIndex) ||
    correctOptionIndex < 0 ||
    correctOptionIndex > 3
  ) {
    return { ok: false, error: "La respuesta correcta no es válida." };
  }

  const normalizedOptions = new Set<string>();
  const trimmedOptions: string[] = [];

  for (const option of options) {
    if (typeof option !== "string" || option.trim().length === 0) {
      return { ok: false, error: "Las opciones no pueden estar vacías." };
    }

    const trimmedOption = option.trim();
    const normalizedOption = trimmedOption.toLocaleLowerCase("es");

    if (normalizedOptions.has(normalizedOption)) {
      return { ok: false, error: "Las opciones no pueden estar repetidas." };
    }

    normalizedOptions.add(normalizedOption);
    trimmedOptions.push(trimmedOption);
  }

  return {
    ok: true,
    question: {
      question,
      options: trimmedOptions,
      correctOptionIndex,
    },
  };
}

export async function getStudySetDetail(studySetId: string) {
  const auth = await getAuthenticatedSupabase();

  if (!auth.ok) {
    return auth;
  }

  const { supabase } = auth;
  const { data: studySetData, error: studySetError } = await supabase
    .from("study_sets")
    .select("id, topic, created_at")
    .eq("id", studySetId)
    .maybeSingle();

  if (studySetError) {
    return {
      ok: false as const,
      status: 500,
      error: "No pudimos cargar el study set.",
    };
  }

  if (!studySetData) {
    return {
      ok: false as const,
      status: 404,
      error: "No encontramos ese study set.",
    };
  }

  const { data: flashcardsData, error: flashcardsError } = await supabase
    .from("flashcards")
    .select("id, question, answer")
    .eq("study_set_id", studySetId)
    .order("id", { ascending: true });

  if (flashcardsError) {
    return {
      ok: false as const,
      status: 500,
      error: "No pudimos cargar las flashcards guardadas.",
    };
  }

  const { data: questionsData, error: questionsError } = await supabase
    .from("multiple_choice_questions")
    .select("id, question, generation_difficulty")
    .eq("study_set_id", studySetId)
    .order("id", { ascending: true });

  if (questionsError) {
    return {
      ok: false as const,
      status: 500,
      error: "No pudimos cargar las preguntas guardadas.",
    };
  }

  const questionRows = (questionsData ?? []) as MultipleChoiceQuestionRow[];
  const questionIds = questionRows.map((question) => question.id);
  let optionRows: MultipleChoiceOptionRow[] = [];

  if (questionIds.length > 0) {
    const { data: optionsData, error: optionsError } = await supabase
      .from("multiple_choice_options")
      .select("id, question_id, answer, is_correct")
      .in("question_id", questionIds)
      .order("id", { ascending: true });

    if (optionsError) {
      return {
        ok: false as const,
        status: 500,
        error: "No pudimos cargar las opciones guardadas.",
      };
    }

    optionRows = (optionsData ?? []) as MultipleChoiceOptionRow[];
  }

  const optionsByQuestion = new Map<string, SavedMultipleChoiceOption[]>();

  for (const option of optionRows) {
    const options = optionsByQuestion.get(option.question_id) ?? [];
    options.push({
      id: option.id,
      text: option.answer,
      isCorrect: option.is_correct,
    });
    optionsByQuestion.set(option.question_id, options);
  }

  const studySetRow = studySetData as StudySetRow;
  const { data: generationData, error: generationError } = await supabase
    .from("generation_jobs").select("education_level, source")
    .eq("study_set_id", studySetId).maybeSingle();
  if (generationError) return { ok: false as const, status: 500, error: "No pudimos cargar la generación." };
  const detail: StudySetDetail = {
    ...toStudySetSummary(studySetRow),
    flashcards: ((flashcardsData ?? []) as FlashcardRow[]).map((card) => ({
      id: card.id,
      question: card.question,
      answer: card.answer,
    })),
    multipleChoiceQuestions: questionRows.map((question) => ({
      id: question.id,
      question: question.question,
      difficulty: question.generation_difficulty,
      options: optionsByQuestion.get(question.id) ?? [],
    })),
    generation: generationData ? { level: generationData.education_level, source: generationData.source } : null,
  };

  return { ok: true as const, studySet: detail };
}
