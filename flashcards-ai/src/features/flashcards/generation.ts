import type { Flashcard } from "@/features/flashcards/types";

export const flashcardCount = 10;

const flashcardQuestionSafetyMaxLength = 500;
const flashcardAnswerSafetyMaxLength = 1_000;

interface GeneratedFlashcard {
  q: string;
  a: string;
}

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
            q: {
              type: "string",
              minLength: 1,
              maxLength: flashcardQuestionSafetyMaxLength,
            },
            a: {
              type: "string",
              minLength: 1,
              maxLength: flashcardAnswerSafetyMaxLength,
            },
          },
          required: ["q", "a"],
        },
      },
    },
    required: ["cards"],
  };
}

export function validateFlashcardsOutput(output: unknown): Flashcard[] | null {
  const cards = getArrayProperty(output, "cards");

  if (!cards || cards.length !== flashcardCount) {
    return null;
  }

  const normalizedQuestions = new Set<string>();
  const validCards: Flashcard[] = [];

  for (const value of cards) {
    const card = parsePublicFlashcard(value);

    if (!card || !addUniqueQuestion(card.question, normalizedQuestions)) {
      return null;
    }

    validCards.push(card);
  }

  return validCards;
}

export function collectValidGeneratedFlashcards(
  output: unknown,
  excludedQuestions: string[] = [],
): Flashcard[] {
  const cards = getArrayProperty(output, "cards");

  if (!cards) {
    return [];
  }

  const normalizedQuestions = new Set(
    excludedQuestions.map(normalizeGeneratedQuestion),
  );
  const validCards: Flashcard[] = [];

  for (const value of cards) {
    const generatedCard = parseGeneratedFlashcard(value);

    if (
      !generatedCard ||
      !addUniqueQuestion(generatedCard.q, normalizedQuestions)
    ) {
      continue;
    }

    validCards.push({
      question: generatedCard.q,
      answer: generatedCard.a,
    });
  }

  return validCards;
}

export function getGeneratedFlashcardCount(output: unknown) {
  return getArrayProperty(output, "cards")?.length ?? 0;
}

function parseGeneratedFlashcard(value: unknown): GeneratedFlashcard | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("q" in value) ||
    !("a" in value) ||
    !isSafeText(value.q, flashcardQuestionSafetyMaxLength) ||
    !isSafeText(value.a, flashcardAnswerSafetyMaxLength)
  ) {
    return null;
  }

  return { q: value.q.trim(), a: value.a.trim() };
}

function parsePublicFlashcard(value: unknown): Flashcard | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("question" in value) ||
    !("answer" in value) ||
    !isSafeText(value.question, flashcardQuestionSafetyMaxLength) ||
    !isSafeText(value.answer, flashcardAnswerSafetyMaxLength)
  ) {
    return null;
  }

  return {
    question: value.question.trim(),
    answer: value.answer.trim(),
  };
}

function getArrayProperty(value: unknown, property: string) {
  if (
    typeof value !== "object" ||
    value === null ||
    !(property in value)
  ) {
    return null;
  }

  const candidate = (value as Record<string, unknown>)[property];
  return Array.isArray(candidate) ? candidate : null;
}

function addUniqueQuestion(question: string, questions: Set<string>) {
  const normalizedQuestion = normalizeGeneratedQuestion(question);

  if (questions.has(normalizedQuestion)) {
    return false;
  }

  questions.add(normalizedQuestion);
  return true;
}

function normalizeGeneratedQuestion(question: string) {
  return question.trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
}

function isSafeText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );
}
