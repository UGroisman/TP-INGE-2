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
    const [difficultyPlan, retrieval] = await Promise.all([
      getDifficultyPlan(
        auth.supabase,
        validation.topic,
        validation.level,
        validation.count,
      ),
      retrieveRagContext(
        auth.supabase,
        validation.topic,
        validation.documentIds,
      ),
    ]);

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
        "Sos un asistente educativo. Respondé solamente JSON válido y compacto en español, sin Markdown ni indentación, y usá exclusivamente el material proporcionado.",
      diagnosticLabel: "rag.multiple-choice",
      buildPrompt: ({
        requestedCount,
        difficultyPlan: requestedDifficultyPlan,
        excludedQuestions,
        isRepair,
      }) =>
        buildPrompt(
          validation.topic,
          educationLevelLabels[validation.level],
          retrieval.context,
          requestedCount,
          requestedDifficultyPlan,
          excludedQuestions,
          isRepair,
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
) {
  return [
    `Tema solicitado: ${topic}`,
    `Nivel educativo: ${levelLabel}`,
    "MATERIAL RECUPERADO:",
    context,
    "FIN DEL MATERIAL.",
    "Creá preguntas de opción múltiple en español usando exclusivamente el material recuperado.",
    "Cada elemento usa q para la pregunta, o para exactamente cuatro opciones únicas y c para el índice correcto entre 0 y 3.",
    "Cada q debe tener como máximo 16 palabras. Cada opción de o debe ser una frase breve de como máximo 4 palabras y no incluir explicaciones.",
    "La respuesta correcta debe estar respaldada directamente por el material; las opciones incorrectas deben ser plausibles.",
    "No agregues conocimiento externo, no inventes datos y no repitas preguntas.",
    "Devolvé JSON compacto, sin saltos de línea ni espacios de indentación.",
    buildDifficultyInstructions(difficultyPlan),
    isRepair
      ? `No uses ninguna de estas preguntas ya aceptadas:\n${excludedQuestions
          .map((question) => `- ${question}`)
          .join("\n")}`
      : null,
    isRepair
      ? `Generá exactamente ${requestedCount} preguntas nuevas para reemplazar las inválidas.`
      : `Generá exactamente ${requestedCount} preguntas.`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n\n");
}
