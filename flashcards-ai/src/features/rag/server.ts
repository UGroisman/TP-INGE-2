import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isQuestionCount,
  type QuestionCount,
} from "@/features/multiple-choice/types";
import {
  isEducationLevel,
  type EducationLevel,
} from "@/features/study/types";
import { getAuthenticatedServerClient } from "@/features/auth/server";
import type { RagDocument } from "@/features/rag/types";
import {
  maxSelectedRagDocuments,
  ragDocumentContentMaxLength,
  ragDocumentContentMinLength,
  ragDocumentNameMaxLength,
  ragDocumentNameMinLength,
  ragMatchCount,
  ragMatchThreshold,
} from "@/features/rag/constants";
import {
  createEmbeddings,
  getOllamaEmbeddingModel,
} from "@/lib/rag/embeddings";

interface RagDocumentRow {
  id: string;
  name: string;
  embedding_model: string;
  chunk_count: number;
  created_at: string;
}

interface RagMatchRow {
  id: string;
  document_id: string;
  document_name: string;
  content: string;
  similarity: number;
}

export async function getAuthenticatedRagClient() {
  return getAuthenticatedServerClient(
    "Iniciá sesión para usar RAG con tus materiales.",
  );
}

export function toRagDocument(row: RagDocumentRow): RagDocument {
  return {
    id: row.id,
    name: row.name,
    embeddingModel: row.embedding_model,
    chunkCount: row.chunk_count,
    createdAt: row.created_at,
  };
}

export function validateRagDocumentInput(body: unknown):
  | { ok: true; name: string; content: string }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "La solicitud debe incluir nombre y contenido." };
  }

  if (!("name" in body) || typeof body.name !== "string") {
    return { ok: false, error: "El nombre del material debe ser texto." };
  }

  if (!("content" in body) || typeof body.content !== "string") {
    return { ok: false, error: "El contenido del material debe ser texto." };
  }

  const name = body.name.trim();
  const content = body.content.trim();

  if (
    name.length < ragDocumentNameMinLength ||
    name.length > ragDocumentNameMaxLength
  ) {
    return {
      ok: false,
      error: "El nombre debe tener entre 3 y 100 caracteres.",
    };
  }

  if (
    content.length < ragDocumentContentMinLength ||
    content.length > ragDocumentContentMaxLength
  ) {
    return {
      ok: false,
      error: "El contenido debe tener entre 100 y 50.000 caracteres.",
    };
  }

  return { ok: true, name, content };
}

export function validateRagFlashcardsRequest(body: unknown) {
  return validateRagGenerationRequest(body);
}

export function validateRagMultipleChoiceRequest(body: unknown):
  | {
      ok: true;
      topic: string;
      level: EducationLevel;
      documentIds: string[];
      count: QuestionCount;
    }
  | { ok: false; error: string } {
  const validation = validateRagGenerationRequest(body);

  if (!validation.ok) {
    return validation;
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("count" in body) ||
    !isQuestionCount(body.count)
  ) {
    return { ok: false, error: "La cantidad de preguntas no es válida." };
  }

  return { ...validation, count: body.count };
}

export async function retrieveRagContext(
  supabase: SupabaseClient,
  topic: string,
  documentIds: string[],
) {
  const embeddingModel = getOllamaEmbeddingModel();
  const { data: documentsData, error: documentsError } = await supabase
    .from("rag_documents")
    .select("id, embedding_model")
    .in("id", documentIds);

  if (documentsError) {
    return {
      ok: false as const,
      status: 500,
      error: "No pudimos validar los materiales seleccionados.",
    };
  }

  const documents = (documentsData ?? []) as Array<{
    id: string;
    embedding_model: string;
  }>;

  if (documents.length !== documentIds.length) {
    return {
      ok: false as const,
      status: 404,
      error: "Uno o más materiales no existen o no te pertenecen.",
    };
  }

  if (
    documents.some((document) => document.embedding_model !== embeddingModel)
  ) {
    return {
      ok: false as const,
      status: 409,
      error:
        "Uno o más materiales usan otro modelo de embeddings. Volvé a cargarlos con el modelo actual.",
    };
  }

  const [queryEmbedding] = await createEmbeddings([topic], "query");
  const { data, error } = await supabase.rpc("match_rag_chunks", {
    p_query_embedding: queryEmbedding,
    p_document_ids: documentIds,
    p_embedding_model: embeddingModel,
    p_match_threshold: ragMatchThreshold,
    p_match_count: ragMatchCount,
  });

  if (error) {
    return {
      ok: false as const,
      status: 500,
      error: "No pudimos buscar contexto en tus materiales.",
    };
  }

  const rows = validateRagMatchRows(data);

  if (!rows || rows.length === 0) {
    return {
      ok: false as const,
      status: 422,
      error:
        "No encontramos contenido suficientemente relacionado en los materiales seleccionados.",
    };
  }

  const context = rows
    .map(
      (row, index) =>
        `[Fragmento ${index + 1} - ${row.document_name}]\n${row.content}`,
    )
    .join("\n\n");

  return { ok: true as const, context };
}

function validateRagGenerationRequest(body: unknown):
  | {
      ok: true;
      topic: string;
      level: EducationLevel;
      documentIds: string[];
    }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return {
      ok: false,
      error: "La solicitud debe incluir tema, nivel y materiales.",
    };
  }

  if (!("topic" in body) || typeof body.topic !== "string") {
    return { ok: false, error: "El tema debe ser texto." };
  }

  const topic = body.topic.trim();

  if (topic.length < 3 || topic.length > 100) {
    return { ok: false, error: "El tema debe tener entre 3 y 100 caracteres." };
  }

  if (!("level" in body) || !isEducationLevel(body.level)) {
    return { ok: false, error: "El nivel educativo no es válido." };
  }

  if (!("documentIds" in body) || !Array.isArray(body.documentIds)) {
    return { ok: false, error: "Seleccioná al menos un material." };
  }

  const documentIds = body.documentIds;

  if (
    documentIds.length === 0 ||
    documentIds.length > maxSelectedRagDocuments ||
    !documentIds.every(isUuid)
  ) {
    return {
      ok: false,
      error: "Seleccioná entre 1 y 10 materiales válidos.",
    };
  }

  const uniqueDocumentIds = [...new Set(documentIds)];

  if (uniqueDocumentIds.length !== documentIds.length) {
    return { ok: false, error: "Los materiales seleccionados no pueden repetirse." };
  }

  return {
    ok: true,
    topic,
    level: body.level,
    documentIds: uniqueDocumentIds,
  };
}

function validateRagMatchRows(value: unknown): RagMatchRow[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const rows: RagMatchRow[] = [];

  for (const row of value) {
    if (
      typeof row !== "object" ||
      row === null ||
      !("id" in row) ||
      !("document_id" in row) ||
      !("document_name" in row) ||
      !("content" in row) ||
      !("similarity" in row) ||
      typeof row.id !== "string" ||
      typeof row.document_id !== "string" ||
      typeof row.document_name !== "string" ||
      typeof row.content !== "string" ||
      typeof row.similarity !== "number"
    ) {
      return null;
    }

    rows.push(row as RagMatchRow);
  }

  return rows;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
