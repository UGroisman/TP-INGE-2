import "server-only";
import { getOllamaBaseUrl } from "@/lib/ollama";

export const ragEmbeddingDimensions = 768;
export class OllamaEmbeddingError extends Error {
  constructor(message: string, public status = 502) { super(message); this.name = "OllamaEmbeddingError"; }
}
export function getOllamaEmbeddingModel() {
  return process.env.AI_GATEWAY_EMBEDDING_MODEL ?? "openai/text-embedding-3-small";
}
export async function createEmbeddings(texts: string[], task: "document" | "query") {
  if (task !== "document" && task !== "query") throw new OllamaEmbeddingError("Tipo de embedding inválido.", 400);
  if (!texts.length) throw new OllamaEmbeddingError("No hay contenido para generar embeddings.", 400);
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) throw new OllamaEmbeddingError("Falta configurar AI_GATEWAY_API_KEY.", 503);
  let response: Response;
  try {
    response = await fetch(`${getOllamaBaseUrl()}/embeddings`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: getOllamaEmbeddingModel(), input: texts, dimensions: ragEmbeddingDimensions }),
      signal: AbortSignal.timeout(120000),
    });
  } catch { throw new OllamaEmbeddingError("No pudimos conectar con AI Gateway para procesar el material."); }
  if (!response.ok) throw new OllamaEmbeddingError(`AI Gateway no pudo generar embeddings (HTTP ${response.status}).`);
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null || !("data" in data) || !Array.isArray(data.data)) throw new OllamaEmbeddingError("Respuesta de embeddings inválida.");
  const rows = [...data.data].sort((a, b) => a.index - b.index);
  const embeddings: unknown[] = rows.map((row) => row.embedding);
  if (embeddings.length !== texts.length || !embeddings.every((e) => Array.isArray(e) && e.length === ragEmbeddingDimensions && e.every((v: unknown) => typeof v === "number" && Number.isFinite(v)))) throw new OllamaEmbeddingError("La cantidad o dimensión de embeddings es incorrecta.");
  return embeddings as number[][];
}
