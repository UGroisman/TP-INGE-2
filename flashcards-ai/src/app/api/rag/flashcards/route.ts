import { generateFlashcardsWithRecovery } from "@/features/flashcards/generation.server";
import {
  getAuthenticatedRagClient,
  retrieveRagContext,
  validateRagFlashcardsRequest,
} from "@/features/rag/server";
import { educationLevelLabels } from "@/features/study/types";
import { OllamaRequestError } from "@/lib/ollama";
import { OllamaEmbeddingError } from "@/lib/rag/embeddings";

export async function POST(request: Request) {
  const auth = await getAuthenticatedRagClient();

  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "El cuerpo de la solicitud debe ser JSON válido." },
      { status: 400 },
    );
  }

  const validation = validateRagFlashcardsRequest(body);

  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  try {
    const retrieval = await retrieveRagContext(
      auth.supabase,
      validation.topic,
      validation.documentIds,
    );

    if (!retrieval.ok) {
      return Response.json(
        { error: retrieval.error },
        { status: retrieval.status },
      );
    }

    const cards = await generateFlashcardsWithRecovery({
      systemMessage:
        "Sos un asistente educativo. Respondé solamente JSON válido y compacto en español, sin Markdown ni indentación, y usá exclusivamente el material proporcionado.",
      diagnosticLabel: "rag.flashcards",
      buildPrompt: ({ requestedCount, excludedQuestions, isRepair }) =>
        buildPrompt(
          validation.topic,
          educationLevelLabels[validation.level],
          retrieval.context,
          requestedCount,
          excludedQuestions,
          isRepair,
        ),
    });

    if (!cards) {
      return Response.json(
        { error: "El modelo no devolvió 10 flashcards RAG válidas." },
        { status: 502 },
      );
    }

    return Response.json({ cards });
  } catch (error) {
    if (
      error instanceof OllamaEmbeddingError ||
      error instanceof OllamaRequestError
    ) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json(
      { error: "No pudimos generar las flashcards con tus materiales." },
      { status: 500 },
    );
  }
}

function buildPrompt(
  topic: string,
  levelLabel: string,
  context: string,
  requestedCount: number,
  excludedQuestions: string[],
  isRepair: boolean,
) {
  return [
    `Tema solicitado: ${topic}`,
    `Nivel educativo: ${levelLabel}`,
    "MATERIAL RECUPERADO:",
    context,
    "FIN DEL MATERIAL.",
    "Creá flashcards en español usando exclusivamente el material recuperado.",
    "Cada elemento usa q para la pregunta y a para la respuesta.",
    "Cada q debe tener como máximo 16 palabras. Cada a debe estar respaldada por el material y tener una sola oración de hasta 24 palabras.",
    "No agregues conocimiento externo, no inventes datos y no repitas preguntas.",
    "Devolvé JSON compacto, sin saltos de línea ni espacios de indentación.",
    isRepair
      ? `No uses ninguna de estas preguntas ya aceptadas:\n${excludedQuestions
          .map((question) => `- ${question}`)
          .join("\n")}`
      : null,
    isRepair
      ? `Generá exactamente ${requestedCount} flashcards nuevas para completar la generación.`
      : `Generá exactamente ${requestedCount} flashcards.`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n\n");
}
