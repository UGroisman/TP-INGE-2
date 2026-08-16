import type { EducationLevel, Flashcard } from "@/types/flashcard";

interface FlashcardsResponse {
  cards: Flashcard[];
}

export async function generateFlashcards(
  topic: string,
  level: EducationLevel,
) {
  const response = await fetch("/api/flashcards", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ topic, level }),
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(data));
  }

  if (!isFlashcardsResponse(data)) {
    throw new Error("La respuesta del servidor no tiene el formato esperado.");
  }

  return data.cards;
}

function getErrorMessage(data: unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }

  return "No pudimos generar las flashcards.";
}

function isFlashcardsResponse(value: unknown): value is FlashcardsResponse {
  if (typeof value !== "object" || value === null || !("cards" in value)) {
    return false;
  }

  const cards = value.cards;

  return Array.isArray(cards) && cards.length === 10 && cards.every(isFlashcard);
}

function isFlashcard(value: unknown): value is Flashcard {
  return (
    typeof value === "object" &&
    value !== null &&
    "question" in value &&
    "answer" in value &&
    typeof value.question === "string" &&
    typeof value.answer === "string"
  );
}
