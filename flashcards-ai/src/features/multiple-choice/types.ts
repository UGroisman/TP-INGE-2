import type { EducationLevel } from "@/features/study/types";
import type { AdaptiveDifficulty } from "@/features/adaptive-learning/types";

export const questionCounts = [5, 10, 15] as const;

export type QuestionCount = (typeof questionCounts)[number];

export interface MultipleChoiceContent {
  question: string;
  options: string[];
  correctOptionIndex: number;
}

export interface MultipleChoiceQuestion extends MultipleChoiceContent {
  id: string;
  difficulty: AdaptiveDifficulty;
}

export interface MultipleChoiceRequest {
  topic: string;
  level: EducationLevel;
  count: QuestionCount;
}

export interface MultipleChoiceResponse {
  questions: MultipleChoiceQuestion[];
  trackingEnabled: boolean;
}

export function isQuestionCount(value: unknown): value is QuestionCount {
  return (
    typeof value === "number" && questionCounts.includes(value as QuestionCount)
  );
}
