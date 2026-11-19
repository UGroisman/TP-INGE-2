"use client";

import { FormEvent, useState } from "react";
import {
  educationLevelOptions,
  type EducationLevel,
} from "@/features/study/types";

interface TopicFormProps {
  loading: boolean;
  onGenerate: (topic: string, level: EducationLevel) => void;
}

function validateTopic(topic: string) {
  const trimmedTopic = topic.trim();

  if (trimmedTopic.length === 0) {
    return "Ingresá un tema.";
  }

  if (trimmedTopic.length < 3) {
    return "El tema debe tener al menos 3 caracteres.";
  }

  if (trimmedTopic.length > 100) {
    return "El tema no puede superar los 100 caracteres.";
  }

  return null;
}

export function TopicForm({ loading, onGenerate }: TopicFormProps) {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<EducationLevel>("university");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const error = validateTopic(topic);

    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    onGenerate(topic.trim(), level);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div>
          <label
            htmlFor="topic"
            className="block text-sm font-semibold text-zinc-800"
          >
            Tema
          </label>
          <input
            id="topic"
            name="topic"
            type="text"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Teorema de Bayes"
            disabled={loading}
            aria-invalid={validationError ? "true" : "false"}
            aria-describedby={validationError ? "topic-error" : undefined}
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-100"
          />
        </div>

        <div>
          <label
            htmlFor="level"
            className="block text-sm font-semibold text-zinc-800"
          >
            Nivel educativo
          </label>
          <select
            id="level"
            name="level"
            value={level}
            onChange={(event) => setLevel(event.target.value as EducationLevel)}
            disabled={loading}
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-100"
          >
            {educationLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {validationError ? (
        <p id="topic-error" className="mt-3 text-sm font-medium text-red-700">
          {validationError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-md bg-zinc-950 px-4 py-3 font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {loading ? "Generando..." : "Generar flashcards"}
      </button>
    </form>
  );
}
