import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildDifficultyPlan,
  normalizeTopic,
} from "@/features/adaptive-learning/algorithm";
import type {
  AdaptiveDifficulty,
  MultipleChoiceAttemptRequest,
  TopicProgress,
} from "@/features/adaptive-learning/types";
import {
  isAdaptiveDifficulty,
  isMultipleChoiceSource,
} from "@/features/adaptive-learning/types";
import type {
  MultipleChoiceContent,
  MultipleChoiceQuestion,
  QuestionCount,
} from "@/features/multiple-choice/types";
import {
  isEducationLevel,
  type EducationLevel,
} from "@/features/study/types";

interface TopicProgressRow {
  topic: string;
  topic_key: string;
  education_level: EducationLevel;
  total_attempts: number | string;
  correct_answers: number | string;
  incorrect_answers: number | string;
  mastery: number | string;
  last_answered_at: string;
}

export class AdaptiveProgressError extends Error {
  constructor() {
    super("No pudimos cargar tu progreso adaptativo.");
    this.name = "AdaptiveProgressError";
  }
}

export async function getTopicProgress(
  supabase: SupabaseClient,
  topic: string,
  level: EducationLevel,
): Promise<TopicProgress | null> {
  const topicKey = normalizeTopic(topic);
  const { data, error } = await supabase
    .from("multiple_choice_topic_progress")
    .select(
      "topic, topic_key, education_level, total_attempts, correct_answers, incorrect_answers, mastery, last_answered_at",
    )
    .eq("topic_key", topicKey)
    .eq("education_level", level)
    .maybeSingle();

  if (error) {
    throw new AdaptiveProgressError();
  }

  if (!data) {
    return null;
  }

  return parseTopicProgress(data as TopicProgressRow);
}

export async function getDifficultyPlan(
  supabase: SupabaseClient,
  topic: string,
  level: EducationLevel,
  count: QuestionCount,
) {
  const progress = await getTopicProgress(supabase, topic, level);
  return buildDifficultyPlan(count, progress);
}

export function enrichMultipleChoiceQuestions(
  questions: MultipleChoiceContent[],
  difficultyPlan: AdaptiveDifficulty[],
): MultipleChoiceQuestion[] {
  return questions.map((question, index) => ({
    ...question,
    id: crypto.randomUUID(),
    difficulty: difficultyPlan[index],
  }));
}

export function validateAttemptRequest(body: unknown):
  | { ok: true; attempt: MultipleChoiceAttemptRequest }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "La solicitud debe incluir una respuesta." };
  }

  if (
    !("questionId" in body) ||
    !isUuid(body.questionId) ||
    !("topic" in body) ||
    typeof body.topic !== "string" ||
    !("level" in body) ||
    !isEducationLevel(body.level) ||
    !("source" in body) ||
    !isMultipleChoiceSource(body.source) ||
    !("difficulty" in body) ||
    !isAdaptiveDifficulty(body.difficulty) ||
    !("question" in body) ||
    typeof body.question !== "string" ||
    !("selectedOptionIndex" in body) ||
    !isOptionIndex(body.selectedOptionIndex) ||
    !("correctOptionIndex" in body) ||
    !isOptionIndex(body.correctOptionIndex)
  ) {
    return { ok: false, error: "La respuesta no tiene un formato válido." };
  }

  const topic = body.topic.trim();
  const question = body.question.trim();

  if (topic.length < 3 || topic.length > 100) {
    return {
      ok: false,
      error: "El tema debe tener entre 3 y 100 caracteres.",
    };
  }

  if (!question) {
    return { ok: false, error: "La pregunta no puede estar vacía." };
  }

  return {
    ok: true,
    attempt: {
      questionId: body.questionId,
      topic,
      level: body.level,
      source: body.source,
      difficulty: body.difficulty,
      question,
      selectedOptionIndex: body.selectedOptionIndex,
      correctOptionIndex: body.correctOptionIndex,
    },
  };
}

function parseTopicProgress(row: TopicProgressRow): TopicProgress {
  const totalAttempts = Number(row.total_attempts);
  const correctAnswers = Number(row.correct_answers);
  const incorrectAnswers = Number(row.incorrect_answers);
  const mastery = Number(row.mastery);

  if (
    !Number.isSafeInteger(totalAttempts) ||
    !Number.isSafeInteger(correctAnswers) ||
    !Number.isSafeInteger(incorrectAnswers) ||
    !Number.isFinite(mastery) ||
    mastery < 0 ||
    mastery > 1
  ) {
    throw new AdaptiveProgressError();
  }

  return {
    topic: row.topic,
    topicKey: row.topic_key,
    level: row.education_level,
    totalAttempts,
    correctAnswers,
    incorrectAnswers,
    mastery,
    lastAnsweredAt: row.last_answered_at,
  };
}

function isOptionIndex(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 3
  );
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
