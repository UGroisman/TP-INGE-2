"use client";

import { useEffect, useState } from "react";
import { RagDocumentForm } from "@/features/rag/components/RagDocumentForm";
import { useRagDocuments } from "@/features/rag/hooks/useRagDocuments";
import { deleteRagDocument } from "@/features/rag/services/rag";
import { ArrowRightIcon, FileIcon, TrashIcon } from "@/components/icons";

export function RagDocumentsManager() {
  const { documents, loading, error, reload, refresh, setDocuments } =
    useRagDocuments();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hasPending = documents.some((document) => document.status === "queued" || document.status === "processing");

  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [hasPending, refresh]);

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
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 font-mono text-xs text-zinc-500">
            {documents.length} guardados
          </span>
        </div>

        {loading ? (
          <p className="loading-panel mt-4 text-sm font-medium text-teal-700">
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
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-white/70 p-6 text-sm text-zinc-600">
            <FileIcon className="shrink-0 text-2xl text-zinc-400" />
            Todavía no hay materiales. Cargá el primero con el formulario.
          </div>
        ) : null}

        {!loading && !error && documents.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {documents.map((document) => (
              <article
                key={document.id}
                className="flex min-h-40 flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-zinc-100 text-lg text-zinc-600">
                      <FileIcon />
                    </span>
                    <StatusBadge status={document.status} />
                  </div>
                  <h3 className="mt-4 break-words text-lg leading-snug text-zinc-950">
                    {document.name}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-zinc-500">
                    {document.chunkCount} fragmentos · {formatDate(document.createdAt)}
                  </p>
                  {document.starterCards && document.starterCards.length > 0 ? (
                    <details className="group mt-4 rounded-lg border border-zinc-200 bg-zinc-50 text-sm">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-semibold text-teal-800 [&::-webkit-details-marker]:hidden">
                        Ver tarjetas iniciales
                        <ArrowRightIcon className="transition group-open:rotate-90" />
                      </summary>
                      <ol className="grid gap-3 border-t border-zinc-200 px-3 py-3">
                        {document.starterCards.map((card, index) => (
                          <li key={index}>
                            <strong className="font-semibold text-zinc-900">{card.question}</strong>
                            <p className="mt-0.5 leading-6 text-zinc-600">{card.answer}</p>
                          </li>
                        ))}
                      </ol>
                    </details>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(document.id, document.name)}
                  disabled={deletingId === document.id}
                  className="mt-5 inline-flex items-center gap-2 self-start rounded-md px-2 py-1.5 text-sm font-semibold text-zinc-500 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                >
                  <TrashIcon />
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

const statusStyles = {
  queued: { label: "En cola", className: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500 animate-pulse-dot" },
  processing: { label: "Procesando", className: "bg-teal-50 text-teal-800 ring-teal-200", dot: "bg-teal-600 animate-pulse-dot" },
  failed: { label: "Error al procesar", className: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-600" },
  ready: { label: "Listo para estudiar", className: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-600" },
} as const;

function StatusBadge({ status = "ready" }: { status?: keyof typeof statusStyles }) {
  const style = statusStyles[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${style.className}`}>
      <span className={`size-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
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
