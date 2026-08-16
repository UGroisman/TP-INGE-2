export type QuestionCount = 5 | 10 | 15;

export interface MultipleChoiceQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
}
