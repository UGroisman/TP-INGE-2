import type { SupabaseClient } from "@supabase/supabase-js";
import type { LandingStudyStats } from "@/features/landing/types";

interface TopicProgressSummaryRow {
  topic_key: string;
  total_attempts: number | string;
  correct_answers: number | string;
}

export async function getLandingStudyStats(
  supabase: SupabaseClient,
): Promise<LandingStudyStats> {
  const { data, error } = await supabase
    .from("multiple_choice_topic_progress")
    .select("topic_key, total_attempts, correct_answers");

  if (error) {
    throw new Error("No pudimos cargar tus estadísticas.");
  }

  const topicKeys = new Set<string>();
  let totalAttempts = 0;
  let correctAnswers = 0;

  for (const value of data ?? []) {
    const row = value as TopicProgressSummaryRow;
    const rowAttempts = Number(row.total_attempts);
    const rowCorrectAnswers = Number(row.correct_answers);

    if (
      !row.topic_key ||
      !Number.isSafeInteger(rowAttempts) ||
      !Number.isSafeInteger(rowCorrectAnswers)
    ) {
      throw new Error("Las estadísticas guardadas no son válidas.");
    }

    topicKeys.add(row.topic_key);
    totalAttempts += rowAttempts;
    correctAnswers += rowCorrectAnswers;
  }

  return {
    correctAnswers,
    totalAttempts,
    accuracy:
      totalAttempts === 0
        ? null
        : Math.round((correctAnswers / totalAttempts) * 100),
    topicsPracticed: topicKeys.size,
  };
}
