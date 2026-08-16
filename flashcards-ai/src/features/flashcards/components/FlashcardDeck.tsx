"use client";

import { useState } from "react";
import { Flashcard } from "@/features/flashcards/components/Flashcard";
import type { Flashcard as FlashcardType } from "@/types/flashcard";

interface FlashcardDeckProps {
  flashcards: FlashcardType[];
}

export function FlashcardDeck({ flashcards }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (flashcards.length === 0) {
    return null;
  }

  const currentCard = flashcards[currentIndex];
  const isFirstCard = currentIndex === 0;
  const isLastCard = currentIndex === flashcards.length - 1;

  return (
    <section className="mt-8 w-full max-w-2xl" aria-live="polite">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-zinc-600">
          {currentIndex + 1} / {flashcards.length}
        </p>
        <p className="text-sm text-zinc-500">Tarjeta {currentIndex + 1}</p>
      </div>

      <Flashcard
        key={currentIndex}
        question={currentCard.question}
        answer={currentCard.answer}
      />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setCurrentIndex((index) => index - 1)}
          disabled={isFirstCard}
          className="rounded-md border border-zinc-300 bg-white px-4 py-3 font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => setCurrentIndex((index) => index + 1)}
          disabled={isLastCard}
          className="rounded-md bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Siguiente
        </button>
      </div>
    </section>
  );
}
