"use client";

import { FormEvent, useState } from "react";
import { MultipleChoiceDeck } from "@/features/multiple-choice/components/MultipleChoiceDeck";
import {
  questionCounts,
  type MultipleChoiceQuestion,
  type QuestionCount,
} from "@/features/multiple-choice/types";
import { maxSelectedRagDocuments } from "@/features/rag/constants";
import { RagDocumentSelector } from "@/features/rag/components/RagDocumentSelector";
import { useRagDocuments } from "@/features/rag/hooks/useRagDocuments";
import { generateRagMultipleChoice } from "@/features/rag/services/rag";
import {
  educationLevelOptions,
  type EducationLevel,
} from "@/features/study/types";
import { SaveGeneratedItemPanel } from "@/features/study-sets/components/SaveGeneratedItemPanel";

interface RagMultipleChoiceRequestState {
  topic: string;
  level: EducationLevel;
  count: QuestionCount;
  documentIds: string[];
}

export function RagMultipleChoiceGenerator() {
  const {
    documents,
    loading: loadingDocuments,
    error: documentsError,
    reload,
  } = useRagDocuments();
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<EducationLevel>("university");
  const [count, setCount] = useState<QuestionCount>(10);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [questions, setQuestions] = useState<MultipleChoiceQuestion[]>([]);
  const [lastRequest, setLastRequest] =
    useState<RagMultipleChoiceRequestState | null>(null);
  const [deckVersion, setDeckVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  function toggleDocument(documentId: string) {
    setSelectedDocumentIds((currentIds) => {
      if (currentIds.includes(documentId)) {
        return currentIds.filter((id) => id !== documentId);
      }

      if (currentIds.length >= maxSelectedRagDocuments) {
        return currentIds;
      }

      return [...currentIds, documentId];
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTopic = topic.trim();

    if (trimmedTopic.length < 3 || trimmedTopic.length > 100) {
      setValidationError("El tema debe tener entre 3 y 100 caracteres.");
      return;
    }

    if (selectedDocumentIds.length === 0) {
      setValidationError("Seleccioná al menos un material.");
      return;
    }

    setValidationError(null);
    void handleGenerate({
      topic: trimmedTopic,
      level,
      count,
      documentIds: [...selectedDocumentIds],
    });
  }

  async function handleGenerate(request: RagMultipleChoiceRequestState) {
    setLoading(true);
    setRequestError(null);
    setLastRequest(request);

    try {
      const generatedQuestions = await generateRagMultipleChoice(
        request.topic,
        request.level,
        request.count,
        request.documentIds,
      );
      setQuestions(generatedQuestions);
      setDeckVersion((version) => version + 1);
    } catch (error) {
      setQuestions([]);
      setRequestError(
        error instanceof Error
          ? error.message
          : "No pudimos generar las preguntas con tus materiales.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_150px_110px]">
          <div>
            <label
              htmlFor="rag-multiple-choice-topic"
              className="block text-sm font-semibold text-zinc-800"
            >
              Tema dentro del material
            </label>
            <input
              id="rag-multiple-choice-topic"
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              disabled={loading}
              maxLength={100}
              placeholder="Three-way handshake"
              className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="rag-multiple-choice-level"
              className="block text-sm font-semibold text-zinc-800"
            >
              Nivel
            </label>
            <select
              id="rag-multiple-choice-level"
              value={level}
              onChange={(event) =>
                setLevel(event.target.value as EducationLevel)
              }
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

          <div>
            <label
              htmlFor="rag-multiple-choice-count"
              className="block text-sm font-semibold text-zinc-800"
            >
              Cantidad
            </label>
            <select
              id="rag-multiple-choice-count"
              value={count}
              onChange={(event) =>
                setCount(Number(event.target.value) as QuestionCount)
              }
              disabled={loading}
              className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-100"
            >
              {questionCounts.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <RagDocumentSelector
          documents={documents}
          selectedDocumentIds={selectedDocumentIds}
          loading={loadingDocuments}
          error={documentsError}
          onToggle={toggleDocument}
          onRetry={() => void reload()}
        />

        {validationError ? (
          <p className="mt-4 text-sm font-medium text-red-700">
            {validationError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || loadingDocuments || documents.length === 0}
          className="mt-5 w-full rounded-md bg-zinc-950 px-4 py-3 font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          {loading ? "Generando..." : "Generar preguntas con RAG"}
        </button>
      </form>

      {loading ? (
        <div
          role="status"
          className="mt-8 w-full max-w-2xl rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm font-medium text-teal-900"
        >
          Buscando contexto y generando preguntas...
        </div>
      ) : null}

      {requestError ? (
        <div
          role="alert"
          className="mt-8 w-full max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-900"
        >
          <p className="font-semibold">{requestError}</p>
          {lastRequest ? (
            <button
              type="button"
              onClick={() => void handleGenerate(lastRequest)}
              className="mt-3 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              Intentar nuevamente
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && !requestError ? (
        <MultipleChoiceDeck
          key={deckVersion}
          questions={questions}
          renderSaveAction={(question, index) => (
            <SaveGeneratedItemPanel
              kind="multiple-choice"
              item={question}
              itemKey={`rag-${deckVersion}-${index}`}
            />
          )}
        />
      ) : null}
    </>
  );
}
