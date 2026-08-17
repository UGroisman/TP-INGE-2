import {
  buildMultipleChoiceSchema,
  validateQuestionsOutput,
} from "@/features/multiple-choice/generation";
import {
  getAuthenticatedRagClient,
  retrieveRagContext,
  validateRagMultipleChoiceRequest,
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

  const validation = validateRagMultipleChoiceRequest(body);

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

    const schema = buildMultipleChoiceSchema(validation.count);
    const output = await chatWithOllamaJson({
      schema,
      messages: [
        {
          role: "system",
          content:
            "Sos un asistente educativo. Respondé solamente JSON válido en español y usá exclusivamente el material proporcionado.",
        },
        {
          role: "user",
          content: [
            `Generá exactamente ${validation.count} preguntas educativas de opción múltiple.`,
            `Tema solicitado: ${validation.topic}`,
            `Nivel educativo: ${educationLevelLabels[validation.level]}`,
            "Cada pregunta debe tener question, cuatro options y correctOptionIndex.",
            "Todas las respuestas correctas deben estar respaldadas directamente por el material.",
            "No agregues conocimiento externo, suposiciones ni datos inventados.",
            "Las opciones incorrectas deben ser plausibles y no pueden repetirse.",
            "No repitas preguntas.",
            "MATERIAL RECUPERADO:",
            retrieval.context,
            "Respondé únicamente con un objeto JSON que cumpla este esquema:",
            JSON.stringify(schema),
          ].join("\n\n"),
        },
      ],
    });
    const questions = validateQuestionsOutput(output, validation.count);

    if (!questions) {
      return Response.json(
        { error: "El modelo local no devolvió preguntas RAG válidas." },
        { status: 502 },
      );
    }

    return Response.json({ questions });
  } catch (error) {
    if (
      error instanceof OllamaEmbeddingError ||
      error instanceof OllamaRequestError
    ) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json(
      { error: "No pudimos generar las preguntas con tus materiales." },
      { status: 500 },
    );
  }
}
