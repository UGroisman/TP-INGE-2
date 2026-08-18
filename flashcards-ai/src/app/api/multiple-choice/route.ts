import {
  buildDifficultyInstructions,
  buildDifficultyPlan,
} from "@/features/adaptive-learning/algorithm";
import {
  enrichMultipleChoiceQuestions,
  getDifficultyPlan,
} from "@/features/adaptive-learning/server";
import type { AdaptiveDifficulty } from "@/features/adaptive-learning/types";
import { chatWithOllamaJson, OllamaRequestError } from "@/lib/ollama";
import {
  isQuestionCount,
  type QuestionCount,
} from "@/features/multiple-choice/types";
import {
  buildMultipleChoiceSchema,
  validateQuestionsOutput,
} from "@/features/multiple-choice/generation";
import {
  educationLevelLabels,
  isEducationLevel,
  type EducationLevel,
} from "@/features/study/types";
import { getServerAuthState } from "@/features/auth/server";

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
    const schema = buildMultipleChoiceSchema(validation.count);
    const parsedOutput = await chatWithOllamaJson({
      schema,
      messages: [
        {
          role: "system",
          content:
            "Sos un asistente educativo. Respondé solamente JSON válido en español.",
        },
        {
          role: "user",
          content: buildPrompt(
            validation.topic,
            validation.level,
            validation.count,
            schema,
            adaptiveContext.difficultyPlan,
          ),
        },
      ],
    });
    const questionContent = validateQuestionsOutput(
      parsedOutput,
      validation.count,
    );

    if (!questionContent) {
      return Response.json(
        { error: "El modelo local no devolvió preguntas válidas." },
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
  count: QuestionCount,
  schema: Record<string, unknown>,
  difficultyPlan: AdaptiveDifficulty[],
) {
  return [
    `Generá exactamente ${count} preguntas educativas de opción múltiple.`,
    `Tema: ${topic}`,
    `Nivel educativo: ${educationLevelLabels[level]}`,
    "Idioma: español.",
    buildDifficultyInstructions(difficultyPlan),
    "Cada pregunta debe tener question, options y correctOptionIndex.",
    "Cada options debe tener exactamente 4 respuestas posibles.",
    "correctOptionIndex debe ser el índice de la opción correcta entre 0 y 3.",
    "Las opciones incorrectas deben ser plausibles, pero claramente incorrectas.",
    "No repitas opciones dentro de una misma pregunta.",
    "No repitas preguntas.",
    "Mantenete estrictamente dentro del tema pedido.",
    "Respondé únicamente con un objeto JSON que cumpla este esquema:",
    JSON.stringify(schema),
  ].join("\n");
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
