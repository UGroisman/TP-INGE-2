import { validateMultipleChoiceResponse } from "@/features/multiple-choice/generation";
import type { QuestionCount } from "@/features/multiple-choice/types";
import type { EducationLevel } from "@/features/study/types";

export async function generateMultipleChoiceQuestions(
  topic: string,
  level: EducationLevel,
  count: QuestionCount,
) {
  const response = await fetch("/api/multiple-choice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ topic, level, count }),
  });

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new Error("El servidor devolvió una respuesta inválida.");
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data));
  }

  const parsedResponse = validateMultipleChoiceResponse(data, count);

  if (!parsedResponse) {
    throw new Error("La respuesta del servidor no tiene el formato esperado.");
  }

  return parsedResponse;
}

function getErrorMessage(data: unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }

  return "No pudimos generar las preguntas.";
}
