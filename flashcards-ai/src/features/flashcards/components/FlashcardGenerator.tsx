"use client";

import { useState } from "react";
import Link from "next/link";
import { startBackgroundGeneration } from "@/features/study-sets/services/generationJobs";
import { FlashcardDeck } from "@/features/flashcards/components/FlashcardDeck";
import { TopicForm } from "@/features/flashcards/components/TopicForm";
import { generateFlashcards } from "@/features/flashcards/services/flashcards";
import { SaveGeneratedItemPanel } from "@/features/study-sets/components/SaveGeneratedItemPanel";
import type { Flashcard } from "@/features/flashcards/types";
import type { EducationLevel } from "@/features/study/types";

export function FlashcardGenerator() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [lastRequest, setLastRequest] = useState<{
    topic: string;
    level: EducationLevel;
  } | null>(null);
  const [deckVersion, setDeckVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(topic: string, level: EducationLevel) {
    setLoading(true);
    setQueued(false);
    setError(null);
    setLastRequest({ topic, level });

    try {
      if (await startBackgroundGeneration({ kind: "flashcards", topic, level })) {
        setFlashcards([]);
        setQueued(true);
        return;
      }
      const cards = await generateFlashcards(topic, level);

      setFlashcards(cards);
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

    void handleGenerate(lastRequest.topic, lastRequest.level);
  }

  return (
    <>
      <TopicForm loading={loading} onGenerate={handleGenerate} />

      {queued ? <p role="status" className="mt-8 w-full max-w-2xl rounded-lg bg-teal-50 p-4 text-teal-900">Generación en curso. Podés seguir usando la aplicación y consultar el resultado en <Link className="font-semibold underline" href="/study-sets">tus study sets</Link>.</p> : null}

      {loading ? (
        <div
          role="status"
          className="mt-8 w-full max-w-2xl loading-panel rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm font-medium text-teal-900"
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
        <FlashcardDeck
          key={deckVersion}
          flashcards={flashcards}
          renderSaveAction={(flashcard, index) => (
            <SaveGeneratedItemPanel
              kind="flashcard"
              item={flashcard}
              itemKey={`${deckVersion}-${index}`}
            />
          )}
        />
      ) : null}
    </>
  );
}
