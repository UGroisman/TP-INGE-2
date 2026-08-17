import type { Flashcard } from "@/features/flashcards/types";
import type { MultipleChoiceQuestion } from "@/features/multiple-choice/types";

export interface StudySetSummary {
  id: string;
  topic: string;
  createdAt: string | null;
}

export interface SavedFlashcard extends Flashcard {
  id: string;
}

export interface SavedMultipleChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface SavedMultipleChoiceQuestion {
  id: string;
  question: string;
  options: SavedMultipleChoiceOption[];
}

export interface StudySetDetail extends StudySetSummary {
  flashcards: SavedFlashcard[];
  multipleChoiceQuestions: SavedMultipleChoiceQuestion[];
}

export interface StudySetsResponse {
  studySets: StudySetSummary[];
}

export interface StudySetResponse {
  studySet: StudySetDetail;
}

export interface CreateStudySetRequest {
  topic: string;
}

export interface CreateStudySetResponse {
  studySet: StudySetSummary;
}

export interface SaveFlashcardRequest {
  card: Flashcard;
}

export interface SaveFlashcardResponse {
  flashcard: SavedFlashcard;
}

export interface SaveMultipleChoiceRequest {
  question: MultipleChoiceQuestion;
}

export interface SaveMultipleChoiceResponse {
  question: SavedMultipleChoiceQuestion;
}
