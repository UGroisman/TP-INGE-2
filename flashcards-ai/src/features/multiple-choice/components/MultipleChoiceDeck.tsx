"use client";

import { useState } from "react";
import type { MultipleChoiceQuestion } from "@/features/multiple-choice/types";
import type { ReactNode } from "react";

interface MultipleChoiceDeckProps {
  questions: MultipleChoiceQuestion[];
  renderSaveAction?: (
    question: MultipleChoiceQuestion,
    index: number,
  ) => ReactNode;
}

export function MultipleChoiceDeck({
  questions,
  renderSaveAction,
}: MultipleChoiceDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});

  if (questions.length === 0) {
    return null;
  }

  const currentQuestion = questions[currentIndex];
  const selectedOptionIndex = selectedAnswers[currentIndex];
  const hasSelectedOption = selectedOptionIndex !== undefined;
  const isCorrect =
    hasSelectedOption &&
    selectedOptionIndex === currentQuestion.correctOptionIndex;
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === questions.length - 1;

  function selectOption(optionIndex: number) {
    if (hasSelectedOption) {
      return;
    }

    setSelectedAnswers((answers) => ({
      ...answers,
      [currentIndex]: optionIndex,
    }));
  }

  return (
    <section className="mt-8 w-full max-w-2xl" aria-live="polite">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-zinc-600">
          {currentIndex + 1} / {questions.length}
        </p>
        <p className="text-sm text-zinc-500">Pregunta {currentIndex + 1}</p>
      </div>

      <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold leading-8 text-zinc-950">
          {currentQuestion.question}
        </h2>

        <div className="mt-6 grid gap-3">
          {currentQuestion.options.map((option, optionIndex) => {
            const isSelected = selectedOptionIndex === optionIndex;
            const isCorrectOption =
              currentQuestion.correctOptionIndex === optionIndex;

            return (
              <button
                key={`${currentIndex}-${optionIndex}`}
                type="button"
                onClick={() => selectOption(optionIndex)}
                disabled={hasSelectedOption}
                className={getOptionClassName(
                  hasSelectedOption,
                  isSelected,
                  isCorrectOption,
                )}
              >
                <span className="font-semibold">
                  {String.fromCharCode(65 + optionIndex)}.
                </span>{" "}
                {option}
              </button>
            );
          })}
        </div>

        {hasSelectedOption ? (
          <p
            className={`mt-5 rounded-md p-3 text-sm font-semibold ${
              isCorrect
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {isCorrect
              ? "Correcto."
              : `Incorrecto. La respuesta correcta era ${String.fromCharCode(
                  65 + currentQuestion.correctOptionIndex,
                )}.`}
          </p>
        ) : null}
      </article>

      {renderSaveAction
        ? renderSaveAction(currentQuestion, currentIndex)
        : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setCurrentIndex((index) => index - 1)}
          disabled={isFirstQuestion}
          className="rounded-md border border-zinc-300 bg-white px-4 py-3 font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => setCurrentIndex((index) => index + 1)}
          disabled={isLastQuestion}
          className="rounded-md bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Siguiente
        </button>
      </div>
    </section>
  );
}

function getOptionClassName(
  hasSelectedOption: boolean,
  isSelected: boolean,
  isCorrectOption: boolean,
) {
  const baseClassName =
    "rounded-md border px-4 py-3 text-left text-zinc-900 transition focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2";

  if (!hasSelectedOption) {
    return `${baseClassName} border-zinc-300 bg-white hover:bg-zinc-100`;
  }

  if (isCorrectOption) {
    return `${baseClassName} border-emerald-300 bg-emerald-50 text-emerald-900`;
  }

  if (isSelected) {
    return `${baseClassName} border-red-300 bg-red-50 text-red-900`;
  }

  return `${baseClassName} border-zinc-200 bg-zinc-50 text-zinc-500`;
}
