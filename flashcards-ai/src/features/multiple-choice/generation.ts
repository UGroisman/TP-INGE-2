import type {
  MultipleChoiceQuestion,
  QuestionCount,
} from "@/features/multiple-choice/types";

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

export function buildMultipleChoiceSchema(count: QuestionCount) {
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
): MultipleChoiceQuestion[] | null {
  if (
    typeof output !== "object" ||
    output === null ||
    !("questions" in output)
  ) {
    return null;
  }

  const questions = output.questions;

  if (!Array.isArray(questions) || questions.length !== count) {
    return null;
  }

  const normalizedQuestions = new Set<string>();
  const validQuestions: MultipleChoiceQuestion[] = [];

  for (const question of questions) {
    if (!isValidQuestion(question)) {
      return null;
    }

    const normalizedQuestion = question.question.trim().toLocaleLowerCase("es");

    if (normalizedQuestions.has(normalizedQuestion)) {
      return null;
    }

    normalizedQuestions.add(normalizedQuestion);
    validQuestions.push({
      question: question.question.trim(),
      options: question.options.map((option) => option.trim()),
      correctOptionIndex: question.correctOptionIndex,
    });
  }

  return validQuestions;
}

function isValidQuestion(value: unknown): value is MultipleChoiceQuestion {
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
