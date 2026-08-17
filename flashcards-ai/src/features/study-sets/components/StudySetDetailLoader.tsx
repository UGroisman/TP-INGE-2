"use client";

import { useCallback, useEffect, useState } from "react";
import { StudySetDetailView } from "@/features/study-sets/components/StudySetDetailView";
import { getStudySet } from "@/features/study-sets/services/studySets";
import type { StudySetDetail } from "@/features/study-sets/types";

interface StudySetDetailLoaderProps {
  studySetId: string;
}

export function StudySetDetailLoader({
  studySetId,
}: StudySetDetailLoaderProps) {
  const [studySet, setStudySet] = useState<StudySetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudySet = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const loadedStudySet = await getStudySet(studySetId);
      setStudySet(loadedStudySet);
    } catch (requestError) {
      setStudySet(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos cargar el study set.",
      );
    } finally {
      setLoading(false);
    }
  }, [studySetId]);

  useEffect(() => {
    let ignore = false;

    getStudySet(studySetId)
      .then((loadedStudySet) => {
        if (!ignore) {
          setStudySet(loadedStudySet);
        }
      })
      .catch((requestError: unknown) => {
        if (ignore) {
          return;
        }

        setStudySet(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No pudimos cargar el study set.",
        );
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [studySetId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm font-medium text-teal-900">
        Cargando study set...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
        <p className="font-semibold">{error}</p>
        <button
          type="button"
          onClick={loadStudySet}
          className="mt-3 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
        >
          Intentar nuevamente
        </button>
      </div>
    );
  }

  if (!studySet) {
    return null;
  }

  return <StudySetDetailView studySet={studySet} />;
}
