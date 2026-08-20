import "server-only";

import {
  buildFlashcardSchema,
  collectValidGeneratedFlashcards,
  flashcardCount,
  getGeneratedFlashcardCount,
  validateFlashcardsOutput,
} from "@/features/flashcards/generation";
import type { Flashcard } from "@/features/flashcards/types";
import { chatWithOllamaJson } from "@/lib/ollama";
import { logServerPerformance } from "@/lib/performance";

interface FlashcardPromptRequest {
  requestedCount: number;
  excludedQuestions: string[];
  isRepair: boolean;
}

interface GenerateFlashcardsParams {
  systemMessage: string;
  diagnosticLabel: string;
  buildPrompt: (request: FlashcardPromptRequest) => string;
}

const flashcardOutputTokenBase = 100;
const flashcardOutputTokensPerCard = 80;

export async function generateFlashcardsWithRecovery({
  systemMessage,
  diagnosticLabel,
  buildPrompt,
}: GenerateFlashcardsParams): Promise<Flashcard[] | null> {
  const firstOutput = await requestFlashcards(
    flashcardCount,
    [],
    false,
    systemMessage,
    diagnosticLabel,
    buildPrompt,
  );
  const firstReceivedCount = getGeneratedFlashcardCount(firstOutput);
  let cards = collectValidGeneratedFlashcards(firstOutput).slice(
    0,
    flashcardCount,
  );
  const repairNeeded = cards.length < flashcardCount;

  logValidationResult(
    diagnosticLabel,
    "initial",
    flashcardCount,
    firstReceivedCount,
    cards.length,
    repairNeeded,
  );

  if (repairNeeded) {
    const excludedQuestions = cards.map((card) => card.question);
    const missingCount = flashcardCount - cards.length;
    const repairOutput = await requestFlashcards(
      missingCount,
      excludedQuestions,
      true,
      systemMessage,
      diagnosticLabel,
      buildPrompt,
    );
    const repairReceivedCount = getGeneratedFlashcardCount(repairOutput);
    const replacements = collectValidGeneratedFlashcards(
      repairOutput,
      excludedQuestions,
    );

    logValidationResult(
      diagnosticLabel,
      "repair",
      missingCount,
      repairReceivedCount,
      replacements.length,
      true,
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
  diagnosticLabel: string,
  buildPrompt: GenerateFlashcardsParams["buildPrompt"],
) {
  const schema = buildFlashcardSchema(requestedCount);

  return chatWithOllamaJson({
    schema,
    diagnosticLabel: `${diagnosticLabel}.${isRepair ? "repair" : "initial"}`,
    temperature: 0.1,
    numPredict:
      flashcardOutputTokenBase + flashcardOutputTokensPerCard * requestedCount,
    messages: [
      { role: "system", content: systemMessage },
      {
        role: "user",
        content: buildPrompt({
          requestedCount,
          excludedQuestions,
          isRepair,
        }),
      },
    ],
  });
}

function logValidationResult(
  diagnosticLabel: string,
  phase: "initial" | "repair",
  requestedCount: number,
  receivedCount: number,
  acceptedCount: number,
  repairTriggered: boolean,
) {
  logServerPerformance(`${diagnosticLabel}.${phase}.validation`, {
    requestedCount,
    receivedCount,
    acceptedCount,
    discardedCount: Math.max(receivedCount - acceptedCount, 0),
    missingCount: Math.max(requestedCount - acceptedCount, 0),
    repairTriggered,
  });
}
