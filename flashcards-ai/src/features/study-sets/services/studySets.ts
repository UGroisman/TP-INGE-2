import type { Flashcard } from "@/features/flashcards/types";
import type { MultipleChoiceQuestion } from "@/features/multiple-choice/types";
import type {
  CreateStudySetResponse,
  SaveFlashcardResponse,
  SaveMultipleChoiceResponse,
  StudySetResponse,
  StudySetsResponse,
} from "@/features/study-sets/types";

export async function getStudySets() {
  const response = await fetch("/api/study-sets");
  const data: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "No pudimos cargar tus study sets."));
  }

  if (!isStudySetsResponse(data)) {
    throw new Error("La respuesta del servidor no tiene el formato esperado.");
  }

  return data.studySets;
}

export async function getStudySet(studySetId: string) {
  const response = await fetch(`/api/study-sets/${studySetId}`);
  const data: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "No pudimos cargar el study set."));
  }

  if (!isStudySetResponse(data)) {
    throw new Error("La respuesta del servidor no tiene el formato esperado.");
  }

  return data.studySet;
}

export async function createStudySet(topic: string) {
  const response = await fetch("/api/study-sets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ topic }),
  });
  const data: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "No pudimos crear el study set."));
  }

  if (!isCreateStudySetResponse(data)) {
    throw new Error("La respuesta del servidor no tiene el formato esperado.");
  }

  return data.studySet;
}

export async function saveFlashcardToStudySet(
  studySetId: string,
  card: Flashcard,
) {
  const response = await fetch(`/api/study-sets/${studySetId}/flashcards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ card }),
  });
  const data: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "No pudimos guardar la flashcard."));
  }

  if (!isSaveFlashcardResponse(data)) {
    throw new Error("La respuesta del servidor no tiene el formato esperado.");
  }

  return data.flashcard;
}

export async function saveMultipleChoiceToStudySet(
  studySetId: string,
  question: MultipleChoiceQuestion,
) {
  const response = await fetch(
    `/api/study-sets/${studySetId}/multiple-choice`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    },
  );
  const data: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "No pudimos guardar la pregunta."));
  }

  if (!isSaveMultipleChoiceResponse(data)) {
    throw new Error("La respuesta del servidor no tiene el formato esperado.");
  }

  return data.question;
}

function getErrorMessage(data: unknown, fallback: string) {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }

  return fallback;
}

function isStudySetsResponse(value: unknown): value is StudySetsResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "studySets" in value &&
    Array.isArray(value.studySets)
  );
}

function isStudySetResponse(value: unknown): value is StudySetResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "studySet" in value &&
    typeof value.studySet === "object" &&
    value.studySet !== null
  );
}

function isCreateStudySetResponse(
  value: unknown,
): value is CreateStudySetResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "studySet" in value &&
    typeof value.studySet === "object" &&
    value.studySet !== null
  );
}

function isSaveFlashcardResponse(
  value: unknown,
): value is SaveFlashcardResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "flashcard" in value &&
    typeof value.flashcard === "object" &&
    value.flashcard !== null
  );
}

function isSaveMultipleChoiceResponse(
  value: unknown,
): value is SaveMultipleChoiceResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "question" in value &&
    typeof value.question === "object" &&
    value.question !== null
  );
}
