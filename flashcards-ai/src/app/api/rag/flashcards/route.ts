import {
  flashcardSchema,
  validateFlashcardsOutput,
} from "@/features/flashcards/generation";
import {
  getAuthenticatedRagClient,
  retrieveRagContext,
  validateRagFlashcardsRequest,
} from "@/features/rag/server";
import { educationLevelLabels } from "@/features/study/types";
import { chatWithOllamaJson, OllamaRequestError } from "@/lib/ollama";
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

    const output = await chatWithOllamaJson({
      schema: flashcardSchema,
      messages: [
        {
          role: "system",
          content:
            "Sos un asistente educativo. Respondé solamente JSON válido en español y usá exclusivamente el material proporcionado.",
        },
        {
          role: "user",
          content: [
            "Generá exactamente 10 flashcards educativas.",
            `Tema solicitado: ${validation.topic}`,
            `Nivel educativo: ${educationLevelLabels[validation.level]}`,
            "Cada flashcard debe tener question y answer.",
            "Todas las respuestas deben estar respaldadas directamente por el material.",
            "No agregues conocimiento externo, suposiciones ni datos inventados.",
            "No repitas preguntas y mantené las respuestas claras y breves.",
            "MATERIAL RECUPERADO:",
            retrieval.context,
            "Respondé únicamente con un objeto JSON que cumpla este esquema:",
            JSON.stringify(flashcardSchema),
          ].join("\n\n"),
        },
      ],
    });
    const cards = validateFlashcardsOutput(output);

    if (!cards) {
      return Response.json(
        { error: "El modelo local no devolvió 10 flashcards RAG válidas." },
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
