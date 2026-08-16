import { chatWithOllamaJson, OllamaRequestError } from "@/lib/ollama";
import type { EducationLevel, Flashcard } from "@/types/flashcard";

const validLevels: EducationLevel[] = ["primary", "secondary", "university"];

const levelLabels: Record<EducationLevel, string> = {
  primary: "Primario",
  secondary: "Secundario",
  university: "Universitario",
};

const flashcardSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    cards: {
      type: "array",
      minItems: 10,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: {
            type: "string",
            minLength: 1,
          },
          answer: {
            type: "string",
            minLength: 1,
          },
        },
        required: ["question", "answer"],
      },
    },
  },
  required: ["cards"],
};

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
    `Nivel educativo: ${levelLabels[level]}`,
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

function isEducationLevel(value: unknown): value is EducationLevel {
  return (
    typeof value === "string" && validLevels.includes(value as EducationLevel)
  );
}

function validateFlashcardsOutput(output: unknown): Flashcard[] | null {
  if (typeof output !== "object" || output === null || !("cards" in output)) {
    return null;
  }

  const cards = output.cards;

  if (!Array.isArray(cards) || cards.length !== 10) {
    return null;
  }

  const normalizedQuestions = new Set<string>();
  const validCards: Flashcard[] = [];

  for (const card of cards) {
    if (!isValidFlashcard(card)) {
      return null;
    }

    const question = card.question.trim();
    const answer = card.answer.trim();
    const normalizedQuestion = question.toLocaleLowerCase("es");

    if (normalizedQuestions.has(normalizedQuestion)) {
      return null;
    }

    normalizedQuestions.add(normalizedQuestion);
    validCards.push({ question, answer });
  }

  return validCards;
}

function isValidFlashcard(value: unknown): value is Flashcard {
  return (
    typeof value === "object" &&
    value !== null &&
    "question" in value &&
    "answer" in value &&
    typeof value.question === "string" &&
    value.question.trim().length > 0 &&
    typeof value.answer === "string" &&
    value.answer.trim().length > 0
  );
}
