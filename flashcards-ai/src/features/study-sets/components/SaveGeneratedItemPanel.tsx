"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { Flashcard } from "@/features/flashcards/types";
import type { MultipleChoiceQuestion } from "@/features/multiple-choice/types";
import {
  createStudySet,
  getStudySets,
  saveFlashcardToStudySet,
  saveMultipleChoiceToStudySet,
} from "@/features/study-sets/services/studySets";
import type { StudySetSummary } from "@/features/study-sets/types";

type SaveGeneratedItemPanelProps =
  | {
      kind: "flashcard";
      item: Flashcard;
      itemKey: string;
    }
  | {
      kind: "multiple-choice";
      item: MultipleChoiceQuestion;
      itemKey: string;
    };

export function SaveGeneratedItemPanel(props: SaveGeneratedItemPanelProps) {
  const pathname = usePathname();
  const [studySets, setStudySets] = useState<StudySetSummary[]>([]);
  const [selectedStudySetId, setSelectedStudySetId] = useState("");
  const [newStudySetTopic, setNewStudySetTopic] = useState("");
  const [loadingStudySets, setLoadingStudySets] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<{
    itemKey: string | null;
    text: string;
  } | null>(null);
  const [message, setMessage] = useState<{
    itemKey: string;
    text: string;
  } | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const selectedSavedKey = `${props.kind}:${props.itemKey}:${selectedStudySetId}`;
  const wasSavedInSelectedSet = Boolean(savedKeys[selectedSavedKey]);
  const visibleError =
    error && (error.itemKey === null || error.itemKey === props.itemKey)
      ? error.text
      : null;
  const visibleMessage =
    message?.itemKey === props.itemKey ? message.text : null;

  const loginHref = useMemo(
    () => `/login?next=${encodeURIComponent(pathname)}`,
    [pathname],
  );

  useEffect(() => {
    let ignore = false;

    getStudySets()
      .then((loadedStudySets) => {
        if (ignore) {
          return;
        }

        setStudySets(loadedStudySets);
        setSelectedStudySetId(loadedStudySets[0]?.id || "");
        setRequiresLogin(false);
      })
      .catch((requestError: unknown) => {
        if (ignore) {
          return;
        }

        const nextError =
          requestError instanceof Error
            ? requestError.message
            : "No pudimos cargar tus study sets.";
        setError({ itemKey: null, text: nextError });
        setRequiresLogin(nextError.toLocaleLowerCase("es").includes("sesión"));
      })
      .finally(() => {
        if (!ignore) {
          setLoadingStudySets(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleCreateStudySet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTopic = newStudySetTopic.trim();

    if (trimmedTopic.length < 3 || trimmedTopic.length > 100) {
      setError({
        itemKey: null,
        text: "El nombre debe tener entre 3 y 100 caracteres.",
      });
      return;
    }

    setCreating(true);
    setError(null);
    setMessage(null);

    try {
      const createdStudySet = await createStudySet(trimmedTopic);
      setStudySets((currentStudySets) => [
        createdStudySet,
        ...currentStudySets,
      ]);
      setSelectedStudySetId(createdStudySet.id);
      setNewStudySetTopic("");
      setRequiresLogin(false);
    } catch (requestError) {
      const nextError =
        requestError instanceof Error
          ? requestError.message
          : "No pudimos crear el study set.";
      setError({ itemKey: null, text: nextError });
      setRequiresLogin(nextError.toLocaleLowerCase("es").includes("sesión"));
    } finally {
      setCreating(false);
    }
  }

  async function saveCurrentItem() {
    if (!selectedStudySetId) {
      setError({
        itemKey: props.itemKey,
        text: "Elegí o creá un study set antes de guardar.",
      });
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      if (props.kind === "flashcard") {
        await saveFlashcardToStudySet(selectedStudySetId, props.item);
      } else {
        await saveMultipleChoiceToStudySet(selectedStudySetId, props.item);
      }

      setSavedKeys((currentSavedKeys) => ({
        ...currentSavedKeys,
        [selectedSavedKey]: true,
      }));
      setMessage({
        itemKey: props.itemKey,
        text:
          props.kind === "flashcard"
            ? "Flashcard guardada."
            : "Pregunta guardada.",
      });
      setRequiresLogin(false);
    } catch (requestError) {
      const nextError =
        requestError instanceof Error
          ? requestError.message
          : "No pudimos guardar el contenido.";
      setError({ itemKey: props.itemKey, text: nextError });
      setRequiresLogin(nextError.toLocaleLowerCase("es").includes("sesión"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-950">
            Guardar este ítem
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Guardá solo la tarjeta o pregunta actual en un study set.
          </p>
        </div>
        <Link
          href="/study-sets"
          className="text-sm font-semibold text-teal-700 hover:text-teal-900"
        >
          Ver study sets
        </Link>
      </div>

      {requiresLogin ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Necesitás iniciar sesión para guardar.</p>
          <Link
            href={loginHref}
            className="mt-2 inline-block font-semibold text-amber-950 underline"
          >
            Iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={selectedStudySetId}
              onChange={(event) => setSelectedStudySetId(event.target.value)}
              disabled={loadingStudySets || saving || studySets.length === 0}
              className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-100"
            >
              {studySets.length === 0 ? (
                <option value="">No tenés study sets todavía</option>
              ) : null}
              {studySets.map((studySet) => (
                <option key={studySet.id} value={studySet.id}>
                  {studySet.topic}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={saveCurrentItem}
              disabled={
                loadingStudySets ||
                saving ||
                !selectedStudySetId ||
                wasSavedInSelectedSet
              }
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {saving
                ? "Guardando..."
                : wasSavedInSelectedSet
                  ? "Ya guardado"
                  : "Guardar"}
            </button>
          </div>

          <form
            onSubmit={handleCreateStudySet}
            className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"
          >
            <input
              type="text"
              value={newStudySetTopic}
              onChange={(event) => setNewStudySetTopic(event.target.value)}
              placeholder="Crear nuevo study set"
              disabled={creating}
              className="h-11 rounded-md border border-zinc-300 px-3 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-100"
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {creating ? "Creando..." : "Crear"}
            </button>
          </form>
        </>
      )}

      {loadingStudySets ? (
        <p className="mt-3 text-sm font-medium text-teal-700">
          Cargando study sets...
        </p>
      ) : null}

      {visibleMessage ? (
        <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {visibleMessage}
        </p>
      ) : null}

      {visibleError ? (
        <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">
          {visibleError}
        </p>
      ) : null}
    </aside>
  );
}
