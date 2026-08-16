"use client";

import { useState } from "react";

interface FlashcardProps {
  question: string;
  answer: string;
}

export function Flashcard({ question, answer }: FlashcardProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <article className="flex min-h-[280px] w-full flex-col justify-between rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
          Pregunta
        </p>
        <h2 className="mt-3 text-2xl font-semibold leading-8 text-zinc-950">
          {question}
        </h2>
      </div>

      <div className="mt-8 border-t border-zinc-100 pt-5">
        {showAnswer ? (
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-amber-700">
              Respuesta
            </p>
            <p className="mt-2 text-lg leading-7 text-zinc-700">{answer}</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAnswer(true)}
            className="w-full rounded-md bg-zinc-950 px-4 py-3 text-base font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 sm:w-auto"
          >
            Mostrar respuesta
          </button>
        )}
      </div>
    </article>
  );
}
