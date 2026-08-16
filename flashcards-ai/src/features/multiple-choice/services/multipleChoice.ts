import type {
  MultipleChoiceQuestion,
  MultipleChoiceResponse,
  QuestionCount,
} from "@/features/multiple-choice/types";
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

  const data: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(data));
  }

  if (!isMultipleChoiceResponse(data, count)) {
    throw new Error("La respuesta del servidor no tiene el formato esperado.");
  }

  return data.questions;
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

function isMultipleChoiceResponse(
  value: unknown,
  count: QuestionCount,
): value is MultipleChoiceResponse {
  if (typeof value !== "object" || value === null || !("questions" in value)) {
    return false;
  }

  const questions = value.questions;

  return (
    Array.isArray(questions) &&
    questions.length === count &&
    questions.every(isMultipleChoiceQuestion)
  );
}

function isMultipleChoiceQuestion(
  value: unknown,
): value is MultipleChoiceQuestion {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (
    !("question" in value) ||
    !("options" in value) ||
    !("correctOptionIndex" in value)
  ) {
    return false;
  }

  const question = value.question;
  const options = value.options;
  const correctOptionIndex = value.correctOptionIndex;

  return (
    typeof question === "string" &&
    question.trim().length > 0 &&
    areValidOptions(options) &&
    Number.isInteger(correctOptionIndex) &&
    typeof correctOptionIndex === "number" &&
    correctOptionIndex >= 0 &&
    correctOptionIndex <= 3
  );
}

function areValidOptions(value: unknown) {
  if (!Array.isArray(value) || value.length !== 4) {
    return false;
  }

  const normalizedOptions = new Set<string>();

  for (const option of value) {
    if (typeof option !== "string" || option.trim().length === 0) {
      return false;
    }

    const normalizedOption = option.trim().toLocaleLowerCase("es");

    if (normalizedOptions.has(normalizedOption)) {
      return false;
    }

    normalizedOptions.add(normalizedOption);
  }

  return true;
}
