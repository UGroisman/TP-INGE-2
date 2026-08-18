import type {
  MultipleChoiceAttemptRequest,
  MultipleChoiceAttemptResponse,
} from "@/features/adaptive-learning/types";

export async function saveMultipleChoiceAttempt(
  attempt: MultipleChoiceAttemptRequest,
) {
  const response = await fetch("/api/multiple-choice/attempts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(attempt),
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

  if (!isAttemptResponse(data)) {
    throw new Error("No pudimos confirmar que tu progreso fue guardado.");
  }

  return data;
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

  return "No pudimos guardar tu progreso.";
}

function isAttemptResponse(
  value: unknown,
): value is MultipleChoiceAttemptResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "saved" in value &&
    value.saved === true &&
    "isCorrect" in value &&
    typeof value.isCorrect === "boolean"
  );
}
