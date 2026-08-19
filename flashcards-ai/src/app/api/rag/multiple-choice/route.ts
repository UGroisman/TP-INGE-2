import { buildDifficultyInstructions } from "@/features/adaptive-learning/algorithm";
import {
  AdaptiveProgressError,
  enrichMultipleChoiceQuestions,
  getDifficultyPlan,
} from "@/features/adaptive-learning/server";
import type { AdaptiveDifficulty } from "@/features/adaptive-learning/types";
import { generateMultipleChoiceWithRecovery } from "@/features/multiple-choice/generation.server";
import {
  getAuthenticatedRagClient,
  retrieveRagContext,
  validateRagMultipleChoiceRequest,
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

  const validation = validateRagMultipleChoiceRequest(body);

  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  try {
    const difficultyPlan = await getDifficultyPlan(
      auth.supabase,
      validation.topic,
      validation.level,
      validation.count,
    );
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

    const questionContent = await generateMultipleChoiceWithRecovery({
      count: validation.count,
      difficultyPlan,
      systemMessage:
        "Sos un asistente educativo. Respondé solamente JSON válido en español y usá exclusivamente el material proporcionado.",
      buildPrompt: ({
        requestedCount,
        difficultyPlan: requestedDifficultyPlan,
        excludedQuestions,
        isRepair,
        schema,
      }) =>
        buildPrompt(
          validation.topic,
          educationLevelLabels[validation.level],
          retrieval.context,
          requestedCount,
          requestedDifficultyPlan,
          excludedQuestions,
          isRepair,
          schema,
        ),
    });

    if (!questionContent) {
      return Response.json(
        { error: "El modelo local no devolvió preguntas RAG válidas." },
        { status: 502 },
      );
    }

    const questions = enrichMultipleChoiceQuestions(
      questionContent,
      difficultyPlan,
    );

    return Response.json({ questions, trackingEnabled: true });
  } catch (error) {
    if (error instanceof AdaptiveProgressError) {
      return Response.json({ error: error.message }, { status: 500 });
    }

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

function buildPrompt(
  topic: string,
  levelLabel: string,
  context: string,
  requestedCount: number,
  difficultyPlan: AdaptiveDifficulty[],
  excludedQuestions: string[],
  isRepair: boolean,
  schema: Record<string, unknown>,
) {
  return [
    isRepair
      ? `Generá exactamente ${requestedCount} preguntas nuevas para reemplazar preguntas inválidas de una generación anterior.`
      : `Generá exactamente ${requestedCount} preguntas educativas de opción múltiple.`,
    `Tema solicitado: ${topic}`,
    `Nivel educativo: ${levelLabel}`,
    buildDifficultyInstructions(difficultyPlan),
    "Cada pregunta debe tener question, cuatro options y correctOptionIndex.",
    "Todas las respuestas correctas deben estar respaldadas directamente por el material.",
    "No agregues conocimiento externo, suposiciones ni datos inventados.",
    "Las opciones incorrectas deben ser plausibles y no pueden repetirse.",
    "No repitas preguntas.",
    isRepair
      ? `No uses ninguna de estas preguntas ya aceptadas:\n${excludedQuestions
          .map((question) => `- ${question}`)
          .join("\n")}`
      : null,
    "MATERIAL RECUPERADO:",
    context,
    "Respondé únicamente con un objeto JSON que cumpla este esquema:",
    JSON.stringify(schema),
  ]
    .filter((line): line is string => line !== null)
    .join("\n\n");
}
