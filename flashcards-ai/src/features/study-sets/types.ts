import type { Flashcard } from "@/features/flashcards/types";
import type { MultipleChoiceQuestion } from "@/features/multiple-choice/types";
import type { AdaptiveDifficulty, MultipleChoiceSource } from "@/features/adaptive-learning/types";
import type { EducationLevel } from "@/features/study/types";

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
  difficulty?: AdaptiveDifficulty | null;
}

export interface StudySetDetail extends StudySetSummary {
  flashcards: SavedFlashcard[];
  multipleChoiceQuestions: SavedMultipleChoiceQuestion[];
  generation?: { level: EducationLevel; source: MultipleChoiceSource } | null;
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
