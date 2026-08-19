import type { Flashcard } from "@/features/flashcards/types";

export const flashcardCount = 10;
export const flashcardCandidateCount = 12;

export function buildFlashcardSchema(count: number) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      cards: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            question: {
              type: "string",
              minLength: 1,
            },
            answer: {
              type: "string",
              minLength: 1,
            },
          },
          required: ["question", "answer"],
        },
      },
    },
    required: ["cards"],
  };
}

export const flashcardSchema = buildFlashcardSchema(flashcardCount);

export function validateFlashcardsOutput(output: unknown): Flashcard[] | null {
  if (typeof output !== "object" || output === null || !("cards" in output)) {
    return null;
  }

  const cards = output.cards;

  if (!Array.isArray(cards) || cards.length !== flashcardCount) {
    return null;
  }

  const validCards = collectValidFlashcards(output);

  return validCards.length === flashcardCount ? validCards : null;
}

export function collectValidFlashcards(
  output: unknown,
  excludedQuestions: string[] = [],
): Flashcard[] {
  if (typeof output !== "object" || output === null || !("cards" in output)) {
    return [];
  }

  const cards = output.cards;

  if (!Array.isArray(cards)) {
    return [];
  }

  const normalizedQuestions = new Set(
    excludedQuestions.map(normalizeGeneratedQuestion),
  );
  const validCards: Flashcard[] = [];

  for (const card of cards) {
    if (!isValidFlashcard(card)) {
      continue;
    }

    const question = card.question.trim();
    const answer = card.answer.trim();
    const normalizedQuestion = normalizeGeneratedQuestion(question);

    if (normalizedQuestions.has(normalizedQuestion)) {
      continue;
    }

    normalizedQuestions.add(normalizedQuestion);
    validCards.push({ question, answer });
  }

  return validCards;
}

function normalizeGeneratedQuestion(question: string) {
  return question.trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
}

function isValidFlashcard(value: unknown): value is Flashcard {
  return (
    typeof value === "object" &&
    value !== null &&
    "question" in value &&
    "answer" in value &&
    typeof value.question === "string" &&
    value.question.trim().length > 0 &&
    typeof value.answer === "string" &&
    value.answer.trim().length > 0
  );
}
