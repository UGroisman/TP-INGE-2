import "server-only";

import { getOllamaBaseUrl } from "@/lib/ollama";

export const ragEmbeddingDimensions = 768;

type EmbeddingTask = "document" | "query";

interface OllamaEmbedResponse {
  embeddings?: unknown;
}

export class OllamaEmbeddingError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "OllamaEmbeddingError";
    this.status = status;
  }
}

export function getOllamaEmbeddingModel() {
  return process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text";
}

export async function createEmbeddings(
  texts: string[],
  task: EmbeddingTask,
) {
  if (texts.length === 0) {
    throw new OllamaEmbeddingError(
      "No hay contenido para generar embeddings.",
      400,
    );
  }

  const model = getOllamaEmbeddingModel();
  const prefix = task === "document" ? "search_document:" : "search_query:";
  let response: Response;

  try {
    response = await fetch(`${getOllamaBaseUrl()}/api/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: texts.map((text) => `${prefix} ${text}`),
        dimensions: ragEmbeddingDimensions,
        truncate: false,
      }),
    });
  } catch {
    throw new OllamaEmbeddingError(
      "No pudimos conectarnos con Ollama para procesar el material.",
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    const modelError =
      response.status === 404 ||
      errorText.toLocaleLowerCase("es").includes("model");

    throw new OllamaEmbeddingError(
      modelError
        ? "No pudimos usar el modelo de embeddings. Ejecutá ollama pull nomic-embed-text."
        : "Ollama no pudo generar los embeddings del material.",
    );
  }

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new OllamaEmbeddingError(
      "Ollama devolvió una respuesta de embeddings inválida.",
    );
  }

  const embeddings = getEmbeddings(data);

  if (!embeddings || embeddings.length !== texts.length) {
    throw new OllamaEmbeddingError(
      "Ollama no devolvió un embedding válido por cada fragmento.",
    );
  }

  return embeddings;
}

function getEmbeddings(data: unknown): number[][] | null {
  if (typeof data !== "object" || data === null || !("embeddings" in data)) {
    return null;
  }

  const embeddings = (data as OllamaEmbedResponse).embeddings;

  if (!Array.isArray(embeddings)) {
    return null;
  }

  const validEmbeddings: number[][] = [];

  for (const embedding of embeddings) {
    if (
      !Array.isArray(embedding) ||
      embedding.length !== ragEmbeddingDimensions ||
      !embedding.every(
        (value) => typeof value === "number" && Number.isFinite(value),
      )
    ) {
      return null;
    }

    validEmbeddings.push(embedding as number[]);
  }

  return validEmbeddings;
}
