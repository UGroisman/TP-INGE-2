import Link from "next/link";
import { maxSelectedRagDocuments } from "@/features/rag/constants";
import type { RagDocument } from "@/features/rag/types";

interface RagDocumentSelectorProps {
  documents: RagDocument[];
  selectedDocumentIds: string[];
  loading: boolean;
  error: string | null;
  onToggle: (documentId: string) => void;
  onRetry: () => void;
}

export function RagDocumentSelector({
  documents,
  selectedDocumentIds,
  loading,
  error,
  onToggle,
  onRetry,
}: RagDocumentSelectorProps) {
  const reachedLimit = selectedDocumentIds.length >= maxSelectedRagDocuments;

  return (
    <fieldset className="mt-5 border-t border-zinc-200 pt-5">
      <legend className="text-sm font-semibold text-zinc-800">
        Materiales para consultar
      </legend>
      <p className="mt-1 text-xs font-medium text-zinc-500">
        {selectedDocumentIds.length} / {maxSelectedRagDocuments} seleccionados
      </p>

      {loading ? (
        <p className="mt-3 text-sm font-medium text-teal-700">
          Cargando materiales...
        </p>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 font-semibold underline"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {!loading && !error && documents.length === 0 ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Todavía no cargaste materiales.</p>
          <Link href="/rag" className="mt-2 inline-block font-semibold underline">
            Ir a Materiales
          </Link>
        </div>
      ) : null}

      {!loading && !error && documents.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {documents.map((document) => {
            const isSelected = selectedDocumentIds.includes(document.id);

            return (
              <label
                key={document.id}
                className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                  isSelected
                    ? "border-teal-500 bg-teal-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(document.id)}
                  disabled={(document.status !== undefined && document.status !== "ready") || (!isSelected && reachedLimit)}
                  className="mt-1 h-4 w-4 accent-teal-700"
                />
                <span className="min-w-0">
                  <span className="block break-words text-sm font-semibold text-zinc-900">
                    {document.name}
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    {document.status && document.status !== "ready" ? "Material aún no disponible" : `${document.chunkCount} fragmentos`}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      ) : null}
    </fieldset>
  );
}
