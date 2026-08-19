import type {
  MultipleChoiceContent,
  MultipleChoiceQuestion,
  QuestionCount,
} from "@/features/multiple-choice/types";
import { isAdaptiveDifficulty } from "@/features/adaptive-learning/types";

const multipleChoiceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: {
            type: "string",
            minLength: 1,
          },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: {
              type: "string",
              minLength: 1,
            },
          },
          correctOptionIndex: {
            type: "integer",
            minimum: 0,
            maximum: 3,
          },
        },
        required: ["question", "options", "correctOptionIndex"],
      },
    },
  },
  required: ["questions"],
};

export function buildMultipleChoiceSchema(count: number) {
  return {
    ...multipleChoiceSchema,
    properties: {
      ...multipleChoiceSchema.properties,
      questions: {
        ...multipleChoiceSchema.properties.questions,
        minItems: count,
        maxItems: count,
      },
    },
  };
}

export function validateQuestionsOutput(
  output: unknown,
  count: QuestionCount,
): MultipleChoiceContent[] | null {
  const questions = getQuestions(output);

  if (!Array.isArray(questions) || questions.length !== count) {
    return null;
  }

  const slots = collectQuestionSlots(output, count);

  return slots.every((question) => question !== null)
    ? (slots as MultipleChoiceContent[])
    : null;
}

export function collectQuestionSlots(
  output: unknown,
  count: number,
  excludedQuestions: string[] = [],
): Array<MultipleChoiceContent | null> {
  const questions = getQuestions(output);
  const normalizedQuestions = new Set(
    excludedQuestions.map(normalizeGeneratedQuestion),
  );

  return Array.from({ length: count }, (_, index) => {
    const question = parseQuestion(questions?.[index]);

    if (!question) {
      return null;
    }

    const normalizedQuestion = normalizeGeneratedQuestion(question.question);

    if (normalizedQuestions.has(normalizedQuestion)) {
      return null;
    }

    normalizedQuestions.add(normalizedQuestion);
    return question;
  });
}

function isValidQuestion(value: unknown): value is MultipleChoiceContent {
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

export function validateMultipleChoiceResponse(
  output: unknown,
  count: QuestionCount,
): { questions: MultipleChoiceQuestion[]; trackingEnabled: boolean } | null {
  if (
    typeof output !== "object" ||
    output === null ||
    !("questions" in output) ||
    !("trackingEnabled" in output) ||
    typeof output.trackingEnabled !== "boolean" ||
    !Array.isArray(output.questions) ||
    output.questions.length !== count
  ) {
    return null;
  }

  const normalizedQuestions = new Set<string>();
  const questions: MultipleChoiceQuestion[] = [];

  for (const value of output.questions) {
    if (
      !isValidQuestion(value) ||
      !("id" in value) ||
      !("difficulty" in value) ||
      typeof value.id !== "string" ||
      !isUuid(value.id) ||
      !isAdaptiveDifficulty(value.difficulty)
    ) {
      return null;
    }

    const normalizedQuestion = normalizeGeneratedQuestion(value.question);

    if (normalizedQuestions.has(normalizedQuestion)) {
      return null;
    }

    normalizedQuestions.add(normalizedQuestion);
    questions.push({
      id: value.id,
      question: value.question.trim(),
      options: value.options.map((option) => option.trim()),
      correctOptionIndex: value.correctOptionIndex,
      difficulty: value.difficulty,
    });
  }

  return { questions, trackingEnabled: output.trackingEnabled };
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

    const normalizedOption = normalizeGeneratedQuestion(option);

    if (normalizedOptions.has(normalizedOption)) {
      return false;
    }

    normalizedOptions.add(normalizedOption);
  }

  return true;
}

function getQuestions(output: unknown): unknown[] | null {
  if (
    typeof output !== "object" ||
    output === null ||
    !("questions" in output) ||
    !Array.isArray(output.questions)
  ) {
    return null;
  }

  return output.questions;
}

function parseQuestion(value: unknown): MultipleChoiceContent | null {
  if (!isValidQuestion(value)) {
    return null;
  }

  return {
    question: value.question.trim(),
    options: value.options.map((option) => option.trim()),
    correctOptionIndex: value.correctOptionIndex,
  };
}

function normalizeGeneratedQuestion(value: string) {
  return value.trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
