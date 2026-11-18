import type {
  AdaptiveDifficulty,
  DifficultyDistribution,
  TopicProgress,
} from "@/features/adaptive-learning/types";
import type { QuestionCount } from "@/features/multiple-choice/types";

export const minimumAdaptiveAttempts = 5;

export function rankTopicsForReview<T extends Pick<TopicProgress, "totalAttempts" | "mastery" | "incorrectAnswers">>(topics: T[]): T[] {
  return topics
    .filter((topic) => topic.totalAttempts >= minimumAdaptiveAttempts)
    .sort((a, b) => a.mastery - b.mastery || b.incorrectAnswers - a.incorrectAnswers);
}

export function getMasteryLabel(mastery: number): string {
  return mastery < 0.4 ? "Necesita refuerzo" : mastery <= 0.75 ? "En progreso" : "Dominado";
}

const difficultyOrder: AdaptiveDifficulty[] = ["medium", "easy", "hard"];

export function normalizeTopic(topic: string) {
  const normalized = topic
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

  return normalized || topic.trim().toLocaleLowerCase("es");
}

export function buildDifficultyDistribution(
  count: QuestionCount,
  progress: Pick<TopicProgress, "totalAttempts" | "mastery"> | null,
): DifficultyDistribution {
  if (!progress || progress.totalAttempts < minimumAdaptiveAttempts) {
    return { easy: 0, medium: count, hard: 0 };
  }

  if (progress.mastery < 0.4) {
    const easy = Math.floor(count * 0.7);
    return { easy, medium: count - easy, hard: 0 };
  }

  if (progress.mastery <= 0.75) {
    const easy = count / 5;
    const hard = count / 5;
    return { easy, medium: count - easy - hard, hard };
  }

  const medium = Math.ceil(count * 0.3);
  return { easy: 0, medium, hard: count - medium };
}

export function buildDifficultyPlan(
  count: QuestionCount,
  progress: Pick<TopicProgress, "totalAttempts" | "mastery"> | null,
) {
  const distribution = buildDifficultyDistribution(count, progress);
  const used: DifficultyDistribution = { easy: 0, medium: 0, hard: 0 };
  const plan: AdaptiveDifficulty[] = [];

  for (let position = 0; position < count; position += 1) {
    const nextDifficulty = difficultyOrder
      .filter((difficulty) => used[difficulty] < distribution[difficulty])
      .sort((left, right) => {
        const expectedLeft =
          (distribution[left] * (position + 1)) / count - used[left];
        const expectedRight =
          (distribution[right] * (position + 1)) / count - used[right];

        return expectedRight - expectedLeft;
      })[0];

    plan.push(nextDifficulty);
    used[nextDifficulty] += 1;
  }

  return plan;
}

export function buildDifficultyInstructions(plan: AdaptiveDifficulty[]) {
  const labels: Record<AdaptiveDifficulty, string> = {
    easy: "fácil",
    medium: "media",
    hard: "difícil",
  };

  return [
    `Dificultad por posición, relativa al nivel: ${plan
      .map((difficulty, index) => `${index + 1}:${labels[difficulty]}`)
      .join(", ")}.`,
    "Fácil: un paso. Media: comprensión o aplicación conceptual. Difícil: razonamiento de varios pasos.",
  ].join("\n");
}
