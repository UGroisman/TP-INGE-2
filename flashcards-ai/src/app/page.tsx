"use client";

import { useState } from "react";
import { FlashcardDeck } from "@/components/FlashcardDeck";
import { TopicForm } from "@/components/TopicForm";
import type { EducationLevel, Flashcard } from "@/types/flashcard";

export default function Home() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [lastRequest, setLastRequest] = useState<{
    topic: string;
    level: EducationLevel;
  } | null>(null);
  const [deckVersion, setDeckVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateFlashcards(topic: string, level: EducationLevel) {
    setLoading(true);
    setError(null);
    setLastRequest({ topic, level });

    try {
      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic, level }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "No pudimos generar las flashcards.";

        throw new Error(message);
      }

      if (!isFlashcardResponse(data)) {
        throw new Error("La respuesta del servidor no tiene el formato esperado.");
      }

      setFlashcards(data.cards);
      setDeckVersion((version) => version + 1);
    } catch (requestError) {
      setFlashcards([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos generar las flashcards.",
      );
    } finally {
      setLoading(false);
    }
  }

  function retryLastRequest() {
    if (!lastRequest) {
      return;
    }

    void generateFlashcards(lastRequest.topic, lastRequest.level);
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center">
        <div className="mb-7 w-full max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Flashcards AI
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-normal text-zinc-950">
            ¿Qué querés estudiar?
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600">
            Ingresá un tema, elegí el nivel educativo y generá 10 tarjetas para
            repasar una por una.
          </p>
        </div>

        <TopicForm loading={loading} onGenerate={generateFlashcards} />

        {loading ? (
          <div
            role="status"
            className="mt-8 w-full max-w-2xl rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm font-medium text-teal-900"
          >
            Generando flashcards...
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mt-8 w-full max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-900"
          >
            <p className="font-semibold">{error}</p>
            {lastRequest ? (
              <button
                type="button"
                onClick={retryLastRequest}
                className="mt-3 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
              >
                Intentar nuevamente
              </button>
            ) : null}
          </div>
        ) : null}

        {!loading && !error ? (
          <FlashcardDeck key={deckVersion} flashcards={flashcards} />
        ) : null}
      </div>
    </main>
  );
}

function isFlashcardResponse(value: unknown): value is { cards: Flashcard[] } {
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
