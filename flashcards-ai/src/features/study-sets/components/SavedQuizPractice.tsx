"use client";

import { useState } from "react";
import { MultipleChoiceDeck } from "@/features/multiple-choice/components/MultipleChoiceDeck";
import { saveMultipleChoiceAttempt } from "@/features/adaptive-learning/services/attempts";
import type { StudySetDetail } from "@/features/study-sets/types";
import type { MultipleChoiceQuestion } from "@/features/multiple-choice/types";

export function SavedQuizPractice({ studySet }: { studySet: StudySetDetail }) {
  const [started, setStarted] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const generation = studySet.generation;
  if (!generation || !studySet.multipleChoiceQuestions.length) return null;
  const questions: MultipleChoiceQuestion[] = studySet.multipleChoiceQuestions.map((question) => ({
    id: question.id, question: question.question, options: question.options.map((option) => option.text),
    correctOptionIndex: question.options.findIndex((option) => option.isCorrect), difficulty: question.difficulty ?? "medium",
  }));
  if (questions.some((question) => question.options.length !== 4 || question.correctOptionIndex < 0)) return null;
  async function save(question: MultipleChoiceQuestion, selectedOptionIndex: number) {
    // Una pregunta guardada puede practicarse varias veces, pero una selección
    // repetida dentro de la misma sesión conserva su identificador idempotente.
    const bytes = new TextEncoder().encode(`${sessionId}:${question.id}`);
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)).slice(0, 16);
    hash[6] = (hash[6] & 15) | 64;
    hash[8] = (hash[8] & 63) | 128;
    const hex = Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const questionId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    await saveMultipleChoiceAttempt({ questionId, topic: studySet.topic, level: generation!.level, source: generation!.source, difficulty: question.difficulty, question: question.question, selectedOptionIndex, correctOptionIndex: question.correctOptionIndex });
  }
  return <section className="rounded-xl border border-teal-200 bg-white p-6 shadow-sm">
    <h2 className="text-xl font-semibold">Practicar preguntas</h2>
    {!started ? <button type="button" onClick={() => setStarted(true)} className="mt-4 rounded-md bg-teal-700 px-4 py-3 font-semibold text-white">Empezar práctica</button> : <MultipleChoiceDeck questions={questions} onAnswer={save} />}
  </section>;
}
