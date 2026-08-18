import type { EducationLevel } from "@/features/study/types";

export const adaptiveDifficulties = ["easy", "medium", "hard"] as const;
export const multipleChoiceSources = ["standard", "rag"] as const;

export type AdaptiveDifficulty = (typeof adaptiveDifficulties)[number];
export type MultipleChoiceSource = (typeof multipleChoiceSources)[number];

export interface DifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

export interface TopicProgress {
  topic: string;
  topicKey: string;
  level: EducationLevel;
  totalAttempts: number;
  correctAnswers: number;
  incorrectAnswers: number;
  mastery: number;
  lastAnsweredAt: string;
}

export interface MultipleChoiceAttemptRequest {
  questionId: string;
  topic: string;
  level: EducationLevel;
  source: MultipleChoiceSource;
  difficulty: AdaptiveDifficulty;
  question: string;
  selectedOptionIndex: number;
  correctOptionIndex: number;
}

export interface MultipleChoiceAttemptResponse {
  saved: true;
  isCorrect: boolean;
}

export function isAdaptiveDifficulty(
  value: unknown,
): value is AdaptiveDifficulty {
  return (
    typeof value === "string" &&
    adaptiveDifficulties.includes(value as AdaptiveDifficulty)
  );
}

export function isMultipleChoiceSource(
  value: unknown,
): value is MultipleChoiceSource {
  return (
    typeof value === "string" &&
    multipleChoiceSources.includes(value as MultipleChoiceSource)
  );
}
