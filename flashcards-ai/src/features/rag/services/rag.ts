import {
  validateFlashcardsOutput,
} from "@/features/flashcards/generation";
import { validateMultipleChoiceResponse } from "@/features/multiple-choice/generation";
import type { QuestionCount } from "@/features/multiple-choice/types";
import type {
  RagDocument,
  RagDocumentResponse,
  RagDocumentsResponse,
} from "@/features/rag/types";
import type { EducationLevel } from "@/features/study/types";

export async function getRagDocuments() {
  const response = await fetch("/api/rag/documents");
  const data = await readResponse(response);

  if (!isRagDocumentsResponse(data)) {
    throw new Error("La respuesta de materiales no tiene el formato esperado.");
  }

  return data.documents;
}

export async function createRagDocumentFromText(
  name: string,
  content: string,
) {
  const response = await fetch("/api/rag/documents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, content }),
  });
  const data = await readResponse(response);

  if (!isRagDocumentResponse(data)) {
    throw new Error("El material creado no tiene el formato esperado.");
  }

  return data.document;
}

export async function createRagDocumentFromFile(name: string, file: File) {
  const formData = new FormData();
  formData.set("name", name);
  formData.set("file", file);

  const response = await fetch("/api/rag/documents", {
    method: "POST",
    body: formData,
  });
  const data = await readResponse(response);

  if (!isRagDocumentResponse(data)) {
    throw new Error("El material creado no tiene el formato esperado.");
  }

  return data.document;
}

export async function deleteRagDocument(documentId: string) {
  const response = await fetch(`/api/rag/documents/${documentId}`, {
    method: "DELETE",
  });
  const data = await readResponse(response);

  if (
    typeof data !== "object" ||
    data === null ||
    !("success" in data) ||
    data.success !== true
  ) {
    throw new Error("No pudimos confirmar que el material fue eliminado.");
  }
}

export async function generateRagFlashcards(
  topic: string,
  level: EducationLevel,
  documentIds: string[],
) {
  const response = await fetch("/api/rag/flashcards", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ topic, level, documentIds }),
  });
  const data = await readResponse(response);
  const cards = validateFlashcardsOutput(data);

  if (!cards) {
    throw new Error("La respuesta RAG no contiene 10 flashcards válidas.");
  }

  return cards;
}

export async function generateRagMultipleChoice(
  topic: string,
  level: EducationLevel,
  count: QuestionCount,
  documentIds: string[],
) {
  const response = await fetch("/api/rag/multiple-choice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ topic, level, count, documentIds }),
  });
  const data = await readResponse(response);
  const parsedResponse = validateMultipleChoiceResponse(data, count);

  if (!parsedResponse) {
    throw new Error("La respuesta RAG no contiene preguntas válidas.");
  }

  return parsedResponse;
}

async function readResponse(response: Response) {
  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new Error("El servidor devolvió una respuesta inválida.");
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data));
  }

  return data;
}

function getErrorMessage(data: unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }

  return "No pudimos completar la solicitud RAG.";
}

function isRagDocumentsResponse(value: unknown): value is RagDocumentsResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "documents" in value &&
    Array.isArray(value.documents) &&
    value.documents.every(isRagDocument)
  );
}

function isRagDocumentResponse(value: unknown): value is RagDocumentResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "document" in value &&
    isRagDocument(value.document)
  );
}

function isRagDocument(value: unknown): value is RagDocument {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "embeddingModel" in value &&
    "chunkCount" in value &&
    "createdAt" in value &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.embeddingModel === "string" &&
    typeof value.chunkCount === "number" &&
    typeof value.createdAt === "string"
  );
}
