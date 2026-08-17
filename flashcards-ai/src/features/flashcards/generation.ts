import type { Flashcard } from "@/features/flashcards/types";

export const flashcardCount = 10;

export const flashcardSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    cards: {
      type: "array",
      minItems: flashcardCount,
      maxItems: flashcardCount,
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

export function validateFlashcardsOutput(output: unknown): Flashcard[] | null {
  if (typeof output !== "object" || output === null || !("cards" in output)) {
    return null;
  }

  const cards = output.cards;

  if (!Array.isArray(cards) || cards.length !== flashcardCount) {
    return null;
  }

  const normalizedQuestions = new Set<string>();
  const validCards: Flashcard[] = [];

  for (const card of cards) {
    if (!isValidFlashcard(card)) {
      return null;
    }

    const question = card.question.trim();
    const answer = card.answer.trim();
    const normalizedQuestion = question.toLocaleLowerCase("es");

    if (normalizedQuestions.has(normalizedQuestion)) {
      return null;
    }

    normalizedQuestions.add(normalizedQuestion);
    validCards.push({ question, answer });
  }

  return validCards;
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
