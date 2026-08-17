"use client";

import { useCallback, useEffect, useState } from "react";
import { getRagDocuments } from "@/features/rag/services/rag";
import type { RagDocument } from "@/features/rag/types";

export function useRagDocuments() {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setDocuments(await getRagDocuments());
    } catch (requestError) {
      setDocuments([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos cargar tus materiales.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    getRagDocuments()
      .then((loadedDocuments) => {
        if (!ignore) {
          setDocuments(loadedDocuments);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!ignore) {
          setDocuments([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "No pudimos cargar tus materiales.",
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  return { documents, loading, error, reload, setDocuments };
}
