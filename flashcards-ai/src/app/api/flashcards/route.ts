import { generateFlashcardsWithRecovery } from "@/features/flashcards/generation.server";
import {
  educationLevelLabels,
  isEducationLevel,
  type EducationLevel,
} from "@/features/study/types";
import { OllamaRequestError } from "@/lib/ollama";

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
    const cards = await generateFlashcardsWithRecovery({
      systemMessage:
        "Sos un asistente educativo. Respondé solamente JSON válido y compacto en español, sin Markdown ni indentación.",
      diagnosticLabel: "flashcards",
      buildPrompt: ({ requestedCount, excludedQuestions, isRepair }) =>
        buildPrompt(
          validation.topic,
          validation.level,
          requestedCount,
          excludedQuestions,
          isRepair,
        ),
    });

    if (!cards) {
      return Response.json(
        { error: "El modelo no devolvió 10 flashcards válidas." },
        { status: 502 },
      );
    }

    return Response.json({ cards });
  } catch (error) {
    if (error instanceof OllamaRequestError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json(
      { error: "No pudimos generar las flashcards. Intentá nuevamente." },
      { status: 500 },
    );
  }
}

function buildPrompt(
  topic: string,
  level: EducationLevel,
  requestedCount: number,
  excludedQuestions: string[],
  isRepair: boolean,
) {
  return [
    `Tema: ${topic}`,
    `Nivel educativo: ${educationLevelLabels[level]}`,
    "Creá flashcards en español que evalúen comprensión y se mantengan estrictamente dentro del tema.",
    "Cada elemento usa q para la pregunta y a para la respuesta.",
    "Cada q debe tener como máximo 16 palabras. Cada a debe ser clara, adecuada al nivel y tener una sola oración de hasta 24 palabras.",
    "No repitas preguntas. Devolvé JSON compacto, sin saltos de línea ni espacios de indentación.",
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
    .join("\n");
}

function validateRequestBody(body: unknown):
  | { ok: true; topic: string; level: EducationLevel }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "La solicitud debe incluir tema y nivel." };
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

  return { ok: true, topic, level: body.level };
}
