"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";
import { DeckProgress } from "@/components/DeckProgress";
import { useState } from "react";
import { Flashcard } from "@/features/flashcards/components/Flashcard";
import type { Flashcard as FlashcardType } from "@/features/flashcards/types";
import type { ReactNode } from "react";

interface FlashcardDeckProps {
  flashcards: FlashcardType[];
  renderSaveAction?: (flashcard: FlashcardType, index: number) => ReactNode;
}

export function FlashcardDeck({
  flashcards,
  renderSaveAction,
}: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (flashcards.length === 0) {
    return null;
  }

  const currentCard = flashcards[currentIndex];
  const isFirstCard = currentIndex === 0;
  const isLastCard = currentIndex === flashcards.length - 1;

  return (
    <section className="mt-8 w-full max-w-2xl" aria-live="polite">
      <DeckProgress current={currentIndex} total={flashcards.length} label="Tarjeta" />

      <Flashcard
        key={currentIndex}
        question={currentCard.question}
        answer={currentCard.answer}
      />

      {renderSaveAction ? renderSaveAction(currentCard, currentIndex) : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setCurrentIndex((index) => index - 1)}
          disabled={isFirstCard}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-3 font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeftIcon />
          Anterior
        </button>
        <button
          type="button"
          onClick={() => setCurrentIndex((index) => index + 1)}
          disabled={isLastCard}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
          <ArrowRightIcon />
        </button>
      </div>
    </section>
  );
}
