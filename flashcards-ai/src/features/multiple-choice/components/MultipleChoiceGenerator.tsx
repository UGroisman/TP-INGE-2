"use client";

import { useState } from "react";
import { MultipleChoiceDeck } from "@/features/multiple-choice/components/MultipleChoiceDeck";
import { MultipleChoiceForm } from "@/features/multiple-choice/components/MultipleChoiceForm";
import { generateMultipleChoiceQuestions } from "@/features/multiple-choice/services/multipleChoice";
import { saveMultipleChoiceAttempt } from "@/features/adaptive-learning/services/attempts";
import { SaveGeneratedItemPanel } from "@/features/study-sets/components/SaveGeneratedItemPanel";
import type {
  MultipleChoiceQuestion,
  QuestionCount,
} from "@/features/multiple-choice/types";
import type { EducationLevel } from "@/features/study/types";

export function MultipleChoiceGenerator({ initialTopic, initialLevel }: { initialTopic?: string; initialLevel?: string }) {
  const [questions, setQuestions] = useState<MultipleChoiceQuestion[]>([]);
  const [lastRequest, setLastRequest] = useState<{
    topic: string;
    level: EducationLevel;
    count: QuestionCount;
  } | null>(null);
  const [deckVersion, setDeckVersion] = useState(0);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(
    topic: string,
    level: EducationLevel,
    count: QuestionCount,
  ) {
    setLoading(true);
    setError(null);
    setLastRequest({ topic, level, count });

    try {
      const result = await generateMultipleChoiceQuestions(
        topic,
        level,
        count,
      );

      setQuestions(result.questions);
      setTrackingEnabled(result.trackingEnabled);
      setDeckVersion((version) => version + 1);
    } catch (requestError) {
      setQuestions([]);
      setTrackingEnabled(false);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos generar las preguntas.",
      );
    } finally {
      setLoading(false);
    }
  }

  function retryLastRequest() {
    if (!lastRequest) {
      return;
    }

    void handleGenerate(
      lastRequest.topic,
      lastRequest.level,
      lastRequest.count,
    );
  }

  async function saveAnswer(
    question: MultipleChoiceQuestion,
    selectedOptionIndex: number,
  ) {
    if (!lastRequest) {
      throw new Error("No pudimos identificar esta sesión de estudio.");
    }

    await saveMultipleChoiceAttempt({
      questionId: question.id,
      topic: lastRequest.topic,
      level: lastRequest.level,
      source: "standard",
      difficulty: question.difficulty,
      question: question.question,
      selectedOptionIndex,
      correctOptionIndex: question.correctOptionIndex,
    });
  }

  return (
    <>
      <MultipleChoiceForm loading={loading} onGenerate={handleGenerate} initialTopic={initialTopic} initialLevel={initialLevel} />

      {loading ? (
        <div
          role="status"
          className="mt-8 w-full max-w-2xl loading-panel rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm font-medium text-teal-900"
        >
          Generando preguntas...
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
        <MultipleChoiceDeck
          key={deckVersion}
          questions={questions}
          onAnswer={trackingEnabled ? saveAnswer : undefined}
          renderSaveAction={(question, index) => (
            <SaveGeneratedItemPanel
              kind="multiple-choice"
              item={question}
              itemKey={`${deckVersion}-${index}`}
            />
          )}
        />
      ) : null}
    </>
  );
}
