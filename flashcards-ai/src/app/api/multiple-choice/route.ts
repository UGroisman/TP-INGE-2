import {
  buildDifficultyInstructions,
  buildDifficultyPlan,
} from "@/features/adaptive-learning/algorithm";
import {
  enrichMultipleChoiceQuestions,
  getDifficultyPlan,
} from "@/features/adaptive-learning/server";
import type { AdaptiveDifficulty } from "@/features/adaptive-learning/types";
import { getServerAuthState } from "@/features/auth/server";
import { generateMultipleChoiceWithRecovery } from "@/features/multiple-choice/generation.server";
import {
  isQuestionCount,
  type QuestionCount,
} from "@/features/multiple-choice/types";
import {
  educationLevelLabels,
  isEducationLevel,
  type EducationLevel,
} from "@/features/study/types";
import { OllamaRequestError } from "@/lib/ollama";

class SessionUnavailableError extends Error {}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "El cuerpo de la solicitud debe ser JSON válido." },
      { status: 400 },
    );
  }

  const validation = validateRequestBody(body);

  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  try {
    const adaptiveContext = await resolveAdaptiveContext(
      validation.topic,
      validation.level,
      validation.count,
    );
    const questionContent = await generateMultipleChoiceWithRecovery({
      count: validation.count,
      difficultyPlan: adaptiveContext.difficultyPlan,
      systemMessage:
        "Sos un asistente educativo. Respondé solamente JSON válido y compacto en español, sin Markdown ni indentación.",
      diagnosticLabel: "multiple-choice",
      buildPrompt: ({
        requestedCount,
        difficultyPlan,
        excludedQuestions,
        isRepair,
      }) =>
        buildPrompt(
          validation.topic,
          validation.level,
          requestedCount,
          difficultyPlan,
          excludedQuestions,
          isRepair,
        ),
    });

    if (!questionContent) {
      return Response.json(
        { error: "El modelo no devolvió preguntas válidas." },
        { status: 502 },
      );
    }

    const questions = enrichMultipleChoiceQuestions(
      questionContent,
      adaptiveContext.difficultyPlan,
    );

    return Response.json({
      questions,
      trackingEnabled: adaptiveContext.trackingEnabled,
    });
  } catch (error) {
    if (error instanceof SessionUnavailableError) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof OllamaRequestError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json(
      { error: "No pudimos generar las preguntas. Intentá nuevamente." },
      { status: 500 },
    );
  }
}

function buildPrompt(
  topic: string,
  level: EducationLevel,
  requestedCount: number,
  difficultyPlan: AdaptiveDifficulty[],
  excludedQuestions: string[],
  isRepair: boolean,
) {
  return [
    `Tema: ${topic}`,
    `Nivel educativo: ${educationLevelLabels[level]}`,
    "Creá preguntas de opción múltiple en español y mantenete estrictamente dentro del tema.",
    "Cada elemento usa q para la pregunta, o para exactamente cuatro opciones únicas y c para el índice correcto entre 0 y 3.",
    "Cada q debe tener como máximo 16 palabras. Cada opción de o debe ser una frase breve de como máximo 4 palabras y no incluir explicaciones.",
    "Las opciones incorrectas deben ser plausibles pero inequívocamente incorrectas.",
    "No repitas preguntas. Devolvé JSON compacto, sin saltos de línea ni espacios de indentación.",
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
    .join("\n");
}

function validateRequestBody(body: unknown):
  | { ok: true; topic: string; level: EducationLevel; count: QuestionCount }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return {
      ok: false,
      error: "La solicitud debe incluir tema, nivel y cantidad.",
    };
  }

  if (!("topic" in body) || typeof body.topic !== "string") {
    return { ok: false, error: "El tema debe ser texto." };
  }

  const topic = body.topic.trim();

  if (topic.length === 0) {
    return { ok: false, error: "Ingresá un tema." };
  }

  if (topic.length < 3 || topic.length > 100) {
    return {
      ok: false,
      error: "El tema debe tener entre 3 y 100 caracteres.",
    };
  }

  if (!("level" in body) || !isEducationLevel(body.level)) {
    return { ok: false, error: "El nivel educativo no es válido." };
  }

  if (!("count" in body) || !isQuestionCount(body.count)) {
    return { ok: false, error: "La cantidad de preguntas no es válida." };
  }

  return { ok: true, topic, level: body.level, count: body.count };
}

async function resolveAdaptiveContext(
  topic: string,
  level: EducationLevel,
  count: QuestionCount,
) {
  const fallbackPlan = buildDifficultyPlan(count, null);
  const auth = await getServerAuthState();

  if (auth.status === "anonymous") {
    return { difficultyPlan: fallbackPlan, trackingEnabled: false };
  }

  if (auth.status === "unavailable") {
    throw new SessionUnavailableError(
      "No pudimos validar tu sesión. Intentá nuevamente.",
    );
  }

  try {
    const difficultyPlan = await getDifficultyPlan(
      auth.supabase,
      topic,
      level,
      count,
    );

    return { difficultyPlan, trackingEnabled: true };
  } catch {
    return { difficultyPlan: fallbackPlan, trackingEnabled: true };
  }
}
