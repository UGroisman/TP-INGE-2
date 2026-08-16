import type { EducationLevel } from "@/features/study/types";

export const questionCounts = [5, 10, 15] as const;

export type QuestionCount = (typeof questionCounts)[number];

export interface MultipleChoiceQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
}

export interface MultipleChoiceRequest {
  topic: string;
  level: EducationLevel;
  count: QuestionCount;
}

export interface MultipleChoiceResponse {
  questions: MultipleChoiceQuestion[];
}

export function isQuestionCount(value: unknown): value is QuestionCount {
  return (
    typeof value === "number" && questionCounts.includes(value as QuestionCount)
  );
}
