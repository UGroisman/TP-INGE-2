"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CrossIcon,
} from "@/components/icons";
import { DeckProgress } from "@/components/DeckProgress";
import { useState } from "react";
import type { MultipleChoiceQuestion } from "@/features/multiple-choice/types";
import type { ReactNode } from "react";

interface MultipleChoiceDeckProps {
  questions: MultipleChoiceQuestion[];
  onAnswer?: (
    question: MultipleChoiceQuestion,
    selectedOptionIndex: number,
  ) => Promise<void>;
  renderSaveAction?: (
    question: MultipleChoiceQuestion,
    index: number,
  ) => ReactNode;
}

export function MultipleChoiceDeck({
  questions,
  onAnswer,
  renderSaveAction,
}: MultipleChoiceDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number>
  >({});
  const [attemptStates, setAttemptStates] = useState<
    Record<
      string,
      {
        status: "saving" | "saved" | "error";
        error?: string;
      }
    >
  >({});

  if (questions.length === 0) {
    return null;
  }

  const currentQuestion = questions[currentIndex];
  const selectedOptionIndex = selectedAnswers[currentQuestion.id];
  const attemptState = attemptStates[currentQuestion.id];
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
      [currentQuestion.id]: optionIndex,
    }));

    if (onAnswer) {
      void saveAnswer(currentQuestion, optionIndex);
    }
  }

  async function saveAnswer(
    question: MultipleChoiceQuestion,
    optionIndex: number,
  ) {
    if (!onAnswer) {
      return;
    }

    setAttemptStates((states) => ({
      ...states,
      [question.id]: { status: "saving" },
    }));

    try {
      await onAnswer(question, optionIndex);
      setAttemptStates((states) => ({
        ...states,
        [question.id]: { status: "saved" },
      }));
    } catch (error) {
      setAttemptStates((states) => ({
        ...states,
        [question.id]: {
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "No pudimos guardar tu progreso.",
        },
      }));
    }
  }

  return (
    <section className="mt-8 w-full max-w-2xl" aria-live="polite">
      <DeckProgress current={currentIndex} total={questions.length} label="Pregunta" />

      <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-md sm:p-7">
        <p className="eyebrow">Elegí una opción</p>
        <h2 className="mt-4 text-[1.6rem] leading-snug text-zinc-950">
          {currentQuestion.question}
        </h2>

        <div className="mt-6 grid gap-3">
          {currentQuestion.options.map((option, optionIndex) => {
            const isSelected = selectedOptionIndex === optionIndex;
            const isCorrectOption =
              currentQuestion.correctOptionIndex === optionIndex;

            return (
              <button
                key={`${currentQuestion.id}-${optionIndex}`}
                type="button"
                onClick={() => selectOption(optionIndex)}
                disabled={hasSelectedOption}
                className={getOptionClassName(
                  hasSelectedOption,
                  isSelected,
                  isCorrectOption,
                )}
              >
                <span
                  aria-hidden="true"
                  className={getOptionBadgeClassName(
                    hasSelectedOption,
                    isSelected,
                    isCorrectOption,
                  )}
                >
                  {hasSelectedOption && isCorrectOption ? (
                    <CheckIcon />
                  ) : hasSelectedOption && isSelected ? (
                    <CrossIcon />
                  ) : (
                    String.fromCharCode(65 + optionIndex)
                  )}
                </span>
                <span>
                  <span className="sr-only">
                    {String.fromCharCode(65 + optionIndex)}.{" "}
                  </span>
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        {hasSelectedOption ? (
          <p
            className={`mt-5 flex items-center gap-2 rounded-md border p-3 text-sm font-semibold ${
              isCorrect
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {isCorrect ? (
              <CheckIcon className="text-base" />
            ) : (
              <CrossIcon className="text-base" />
            )}
            {isCorrect
              ? "Correcto."
              : `Incorrecto. La respuesta correcta era ${String.fromCharCode(
                  65 + currentQuestion.correctOptionIndex,
                )}.`}
          </p>
        ) : null}

        {attemptState?.status === "saving" ? (
          <p
            role="status"
            className="mt-3 text-sm font-medium text-teal-700"
          >
            Guardando progreso...
          </p>
        ) : null}

        {attemptState?.status === "error" ? (
          <div
            role="alert"
            className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
          >
            <p className="font-medium">
              {attemptState.error || "No pudimos guardar tu progreso."}
            </p>
            <button
              type="button"
              onClick={() =>
                void saveAnswer(currentQuestion, selectedOptionIndex)
              }
              className="rounded-md border border-amber-300 bg-white px-3 py-2 font-semibold transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
            >
              Reintentar
            </button>
          </div>
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
          className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-3 font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeftIcon />
          Anterior
        </button>
        <button
          type="button"
          onClick={() => setCurrentIndex((index) => index + 1)}
          disabled={isLastQuestion}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
          <ArrowRightIcon />
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
    "group flex items-center gap-3 rounded-lg border px-3 py-3 text-left text-zinc-900 transition focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2";

  if (!hasSelectedOption) {
    return `${baseClassName} border-zinc-200 bg-white hover:border-teal-500 hover:bg-teal-50/60`;
  }

  if (isCorrectOption) {
    return `${baseClassName} border-emerald-300 bg-emerald-50 text-emerald-900`;
  }

  if (isSelected) {
    return `${baseClassName} border-red-300 bg-red-50 text-red-900`;
  }

  return `${baseClassName} border-zinc-200 bg-zinc-50 text-zinc-500`;
}

function getOptionBadgeClassName(
  hasSelectedOption: boolean,
  isSelected: boolean,
  isCorrectOption: boolean,
) {
  const baseClassName =
    "grid size-8 shrink-0 place-items-center rounded-md font-mono text-sm font-medium transition";

  if (!hasSelectedOption) {
    return `${baseClassName} bg-zinc-100 text-zinc-600 group-hover:bg-teal-700 group-hover:text-white`;
  }

  if (isCorrectOption) {
    return `${baseClassName} bg-emerald-600 text-white`;
  }

  if (isSelected) {
    return `${baseClassName} bg-red-600 text-white`;
  }

  return `${baseClassName} bg-zinc-200 text-zinc-400`;
}
