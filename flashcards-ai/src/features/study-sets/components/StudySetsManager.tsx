"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  createStudySet,
  getStudySets,
} from "@/features/study-sets/services/studySets";
import type { StudySetSummary } from "@/features/study-sets/types";

export function StudySetsManager() {
  const [studySets, setStudySets] = useState<StudySetSummary[]>([]);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void loadStudySets();
  }, []);

  async function loadStudySets() {
    setLoading(true);
    setError(null);

    try {
      const loadedStudySets = await getStudySets();
      setStudySets(loadedStudySets);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos cargar tus study sets.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTopic = topic.trim();

    if (trimmedTopic.length < 3 || trimmedTopic.length > 100) {
      setFormError("El nombre debe tener entre 3 y 100 caracteres.");
      return;
    }

    setCreating(true);
    setFormError(null);

    try {
      const createdStudySet = await createStudySet(trimmedTopic);
      setStudySets((currentStudySets) => [
        createdStudySet,
        ...currentStudySets,
      ]);
      setTopic("");
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos crear el study set.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid gap-6">
      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <label
          htmlFor="study-set-topic"
          className="block text-sm font-semibold text-zinc-800"
        >
          Nombre del study set
        </label>
        <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            id="study-set-topic"
            name="topic"
            type="text"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Biología celular"
            disabled={creating}
            className="h-11 w-full rounded-md border border-zinc-300 px-3 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-100"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            {creating ? "Creando..." : "Crear study set"}
          </button>
        </div>

        {formError ? (
          <p className="mt-3 text-sm font-medium text-red-700">{formError}</p>
        ) : null}
      </form>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-zinc-950">
              Tus study sets
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Acá vas a encontrar el contenido que guardes de a una tarjeta o
              pregunta.
            </p>
          </div>
          <button
            type="button"
            onClick={loadStudySets}
            disabled={loading}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <p className="mt-5 rounded-md bg-teal-50 p-3 text-sm font-medium text-teal-900">
            Cargando study sets...
          </p>
        ) : null}

        {error ? (
          <p className="mt-5 rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">
            {error}
          </p>
        ) : null}

        {!loading && !error && studySets.length === 0 ? (
          <p className="mt-5 rounded-md bg-zinc-50 p-3 text-sm text-zinc-600">
            Todavía no creaste study sets.
          </p>
        ) : null}

        {!loading && !error && studySets.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {studySets.map((studySet) => (
              <Link
                key={studySet.id}
                href={`/study-sets/${studySet.id}`}
                className="rounded-md border border-zinc-200 p-4 transition hover:border-teal-300 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
              >
                <span className="block font-semibold text-zinc-950">
                  {studySet.topic}
                </span>
                <span className="mt-1 block text-sm text-zinc-500">
                  {formatCreatedAt(studySet.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function formatCreatedAt(value: string | null) {
  if (!value) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
