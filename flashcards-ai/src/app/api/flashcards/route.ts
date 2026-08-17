import { chatWithOllamaJson, OllamaRequestError } from "@/lib/ollama";
import {
  flashcardSchema,
  validateFlashcardsOutput,
} from "@/features/flashcards/generation";
import {
  educationLevelLabels,
  isEducationLevel,
  type EducationLevel,
} from "@/features/study/types";

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
    const parsedOutput = await chatWithOllamaJson({
      schema: flashcardSchema,
      messages: [
        {
          role: "system",
          content:
            "Sos un asistente educativo. Respondé solamente JSON válido en español.",
        },
        {
          role: "user",
          content: buildPrompt(validation.topic, validation.level),
        },
      ],
    });
    const cards = validateFlashcardsOutput(parsedOutput);

    if (!cards) {
      return Response.json(
        { error: "El modelo local no devolvió 10 flashcards válidas." },
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

function buildPrompt(topic: string, level: EducationLevel) {
  return [
    "Generá exactamente 10 flashcards educativas.",
    `Tema: ${topic}`,
    `Nivel educativo: ${educationLevelLabels[level]}`,
    "Idioma: español.",
    "Cada flashcard debe tener question y answer.",
    "Las preguntas deben evaluar comprensión, no memorización mecánica.",
    "Las respuestas deben ser claras, breves y adecuadas al nivel.",
    "No repitas preguntas.",
    "Mantenete estrictamente dentro del tema pedido.",
    "Respondé únicamente con un objeto JSON que cumpla este esquema:",
    JSON.stringify(flashcardSchema),
  ].join("\n");
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
