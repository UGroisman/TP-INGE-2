import type { Flashcard } from "@/features/flashcards/types";
import type {
  MultipleChoiceQuestion,
  QuestionCount,
} from "@/features/multiple-choice/types";
import type { EducationLevel } from "@/features/study/types";

export interface RagDocument {
  id: string;
  name: string;
  embeddingModel: string;
  chunkCount: number;
  createdAt: string;
}

export interface RagDocumentsResponse {
  documents: RagDocument[];
}

export interface RagDocumentResponse {
  document: RagDocument;
}

export interface RagFlashcardsRequest {
  topic: string;
  level: EducationLevel;
  documentIds: string[];
}

export interface RagFlashcardsResponse {
  cards: Flashcard[];
}

export interface RagMultipleChoiceRequest extends RagFlashcardsRequest {
  count: QuestionCount;
}

export interface RagMultipleChoiceResponse {
  questions: MultipleChoiceQuestion[];
}
