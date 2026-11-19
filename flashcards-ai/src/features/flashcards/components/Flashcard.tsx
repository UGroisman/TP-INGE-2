"use client";

import { useState } from "react";

interface FlashcardProps {
  question: string;
  answer: string;
}

export function Flashcard({ question, answer }: FlashcardProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="flip-card w-full" data-flipped={showAnswer}>
      <div className="flip-card-inner">
        <article
          className="flip-card-face flex min-h-[300px] flex-col justify-between rounded-xl border border-zinc-200 bg-white p-7 shadow-md"
          aria-hidden={showAnswer}
          inert={showAnswer}
        >
          <div>
            <p className="eyebrow">Pregunta</p>
            <h2 className="mt-4 text-[1.7rem] leading-snug text-zinc-950">
              {question}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowAnswer(true)}
            className="mt-8 self-start rounded-md bg-zinc-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
          >
            Mostrar respuesta
          </button>
        </article>

        <article
          className="flip-card-face flip-card-back flex min-h-[300px] flex-col justify-between rounded-xl border border-teal-800 bg-teal-900 p-7 text-white shadow-md"
          aria-hidden={!showAnswer}
          inert={!showAnswer}
        >
          <div>
            <p className="inline-flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-marker">
              <span className="size-2 rounded-[2px] bg-marker" />
              Respuesta
            </p>
            <p className="mt-4 text-xl leading-8 text-teal-50">{answer}</p>
            <p className="mt-6 border-t border-white/10 pt-4 text-sm leading-6 text-teal-200/80">
              {question}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAnswer(false)}
            className="mt-8 self-start rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-marker focus:ring-offset-2 focus:ring-offset-teal-900"
          >
            Volver a la pregunta
          </button>
        </article>
      </div>
    </div>
  );
}
