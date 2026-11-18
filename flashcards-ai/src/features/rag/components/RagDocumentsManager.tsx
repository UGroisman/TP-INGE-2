"use client";

import { useEffect, useState } from "react";
import { RagDocumentForm } from "@/features/rag/components/RagDocumentForm";
import { useRagDocuments } from "@/features/rag/hooks/useRagDocuments";
import { deleteRagDocument } from "@/features/rag/services/rag";

export function RagDocumentsManager() {
  const { documents, loading, error, reload, setDocuments } = useRagDocuments();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hasPending = documents.some((document) => document.status === "queued" || document.status === "processing");

  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(() => void reload(), 5000);
    return () => window.clearInterval(timer);
  }, [hasPending, reload]);

  useEffect(() => {
    const wakeUrl = process.env.NEXT_PUBLIC_WORKER_WAKE_URL;
    if (!wakeUrl || !hasPending) return;
    const wake = () => { void fetch(wakeUrl, { mode: "no-cors", cache: "no-store" }).catch(() => undefined); };
    wake();
    const timer = window.setInterval(wake, 45000);
    return () => window.clearInterval(timer);
  }, [hasPending]);

  async function handleDelete(documentId: string, documentName: string) {
    const confirmed = window.confirm(
      `¿Querés eliminar "${documentName}" y todos sus fragmentos?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(documentId);
    setActionError(null);
    setMessage(null);

    try {
      await deleteRagDocument(documentId);
      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.id !== documentId),
      );
      setMessage("Material eliminado.");
    } catch (requestError) {
      setActionError(
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
      <RagDocumentForm
        onCreated={(createdDocument) => {
          setDocuments((currentDocuments) => [
            createdDocument,
            ...currentDocuments,
          ]);
          setActionError(null);
          setMessage(null);
        }}
      />

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

        {actionError ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">
            {actionError}
          </p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            {message}
          </p>
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
                    {document.chunkCount} fragmentos ·{" "}
                    {formatDate(document.createdAt)}
                  </p>
                  <p className="mt-2 text-sm font-semibold">{document.status === "queued" ? "En cola" : document.status === "processing" ? "Procesando" : document.status === "failed" ? "Error al procesar" : "Listo para estudiar"}</p>
                  {document.starterCards && document.starterCards.length > 0 ? <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold text-teal-800">Ver tarjetas iniciales</summary><ol className="mt-2 space-y-3">{document.starterCards.map((card, index) => <li key={index}><strong>{card.question}</strong><p>{card.answer}</p></li>)}</ol></details> : null}
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
