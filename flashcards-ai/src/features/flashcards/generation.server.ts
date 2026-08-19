import "server-only";

import {
  buildFlashcardSchema,
  collectValidFlashcards,
  flashcardCandidateCount,
  flashcardCount,
  validateFlashcardsOutput,
} from "@/features/flashcards/generation";
import type { Flashcard } from "@/features/flashcards/types";
import { chatWithOllamaJson } from "@/lib/ollama";

interface FlashcardPromptRequest {
  requestedCount: number;
  excludedQuestions: string[];
  isRepair: boolean;
  schema: Record<string, unknown>;
}

interface GenerateFlashcardsParams {
  systemMessage: string;
  buildPrompt: (request: FlashcardPromptRequest) => string;
}

export async function generateFlashcardsWithRecovery({
  systemMessage,
  buildPrompt,
}: GenerateFlashcardsParams): Promise<Flashcard[] | null> {
  const firstOutput = await requestFlashcards(
    flashcardCandidateCount,
    [],
    false,
    systemMessage,
    buildPrompt,
  );
  let cards = collectValidFlashcards(firstOutput).slice(0, flashcardCount);

  if (cards.length < flashcardCount) {
    const excludedQuestions = cards.map((card) => card.question);
    const missingCount = flashcardCount - cards.length;
    const repairOutput = await requestFlashcards(
      missingCount,
      excludedQuestions,
      true,
      systemMessage,
      buildPrompt,
    );
    const replacements = collectValidFlashcards(
      repairOutput,
      excludedQuestions,
    );

    cards = [...cards, ...replacements].slice(0, flashcardCount);
  }

  return validateFlashcardsOutput({ cards });
}

async function requestFlashcards(
  requestedCount: number,
  excludedQuestions: string[],
  isRepair: boolean,
  systemMessage: string,
  buildPrompt: GenerateFlashcardsParams["buildPrompt"],
) {
  const schema = buildFlashcardSchema(requestedCount);

  return chatWithOllamaJson({
    schema,
    messages: [
      { role: "system", content: systemMessage },
      {
        role: "user",
        content: buildPrompt({
          requestedCount,
          excludedQuestions,
          isRepair,
          schema,
        }),
      },
    ],
  });
}
