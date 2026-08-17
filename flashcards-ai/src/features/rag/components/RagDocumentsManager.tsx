"use client";

import { FormEvent, useState } from "react";
import {
  ragDocumentContentMaxLength,
  ragDocumentContentMinLength,
  ragDocumentNameMaxLength,
  ragDocumentNameMinLength,
} from "@/features/rag/constants";
import { useRagDocuments } from "@/features/rag/hooks/useRagDocuments";
import {
  createRagDocument,
  deleteRagDocument,
} from "@/features/rag/services/rag";

export function RagDocumentsManager() {
  const { documents, loading, error, reload, setDocuments } = useRagDocuments();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedContent = content.trim();

    if (
      trimmedName.length < ragDocumentNameMinLength ||
      trimmedName.length > ragDocumentNameMaxLength
    ) {
      setFormError("El nombre debe tener entre 3 y 100 caracteres.");
      return;
    }

    if (
      trimmedContent.length < ragDocumentContentMinLength ||
      trimmedContent.length > ragDocumentContentMaxLength
    ) {
      setFormError("El contenido debe tener entre 100 y 50.000 caracteres.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setMessage(null);

    try {
      const createdDocument = await createRagDocument(
        trimmedName,
        trimmedContent,
      );
      setDocuments((currentDocuments) => [
        createdDocument,
        ...currentDocuments,
      ]);
      setName("");
      setContent("");
      setMessage("Material procesado y guardado correctamente.");
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos guardar el material.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(documentId: string, documentName: string) {
    const confirmed = window.confirm(
      `¿Querés eliminar "${documentName}" y todos sus fragmentos?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(documentId);
    setFormError(null);
    setMessage(null);

    try {
      await deleteRagDocument(documentId);
      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.id !== documentId),
      );
      setMessage("Material eliminado.");
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos eliminar el material.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-8">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div>
          <label
            htmlFor="rag-document-name"
            className="block text-sm font-semibold text-zinc-800"
          >
            Nombre del material
          </label>
          <input
            id="rag-document-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={ragDocumentNameMaxLength}
            disabled={submitting}
            placeholder="Redes - TCP"
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-100"
          />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="rag-document-content"
              className="block text-sm font-semibold text-zinc-800"
            >
              Apuntes
            </label>
            <span className="text-xs text-zinc-500">
              {content.length.toLocaleString("es-AR")} / 50.000
            </span>
          </div>
          <textarea
            id="rag-document-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={ragDocumentContentMaxLength}
            disabled={submitting}
            rows={10}
            placeholder="Pegá acá el material de estudio que querés consultar..."
            className="mt-2 w-full resize-y rounded-md border border-zinc-300 px-3 py-3 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-100"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 rounded-md bg-zinc-950 px-4 py-3 font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? "Procesando material..." : "Guardar material"}
        </button>

        {formError ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">
            {formError}
          </p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            {message}
          </p>
        ) : null}
      </form>

      <section aria-labelledby="rag-documents-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="rag-documents-title"
              className="text-2xl font-semibold text-zinc-950"
            >
              Tus materiales
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Elegilos desde cualquiera de los dos modos RAG.
            </p>
          </div>
          <span className="text-sm font-semibold text-zinc-500">
            {documents.length} guardados
          </span>
        </div>

        {loading ? (
          <p className="mt-4 text-sm font-medium text-teal-700">
            Cargando materiales...
          </p>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
            <p className="font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="mt-2 text-sm font-semibold underline"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {!loading && !error && documents.length === 0 ? (
          <p className="mt-4 rounded-md border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
            Todavía no hay materiales. Cargá el primero con el formulario.
          </p>
        ) : null}

        {!loading && !error && documents.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {documents.map((document) => (
              <article
                key={document.id}
                className="flex min-h-36 flex-col justify-between rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <h3 className="break-words font-semibold text-zinc-950">
                    {document.name}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-500">
                    {document.chunkCount} fragmentos · {formatDate(document.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(document.id, document.name)}
                  disabled={deletingId === document.id}
                  className="mt-4 self-start rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                >
                  {deletingId === document.id ? "Eliminando..." : "Eliminar"}
                </button>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
