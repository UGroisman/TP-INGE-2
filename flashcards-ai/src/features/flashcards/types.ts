import type { EducationLevel } from "@/features/study/types";

export interface Flashcard {
  question: string;
  answer: string;
}

export interface FlashcardsRequest {
  topic: string;
  level: EducationLevel;
}

export interface FlashcardsResponse {
  cards: Flashcard[];
}
