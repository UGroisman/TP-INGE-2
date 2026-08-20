import { isAdaptiveDifficulty } from "@/features/adaptive-learning/types";
import type {
  MultipleChoiceContent,
  MultipleChoiceQuestion,
  QuestionCount,
} from "@/features/multiple-choice/types";

const multipleChoiceQuestionSafetyMaxLength = 500;
const multipleChoiceOptionSafetyMaxLength = 300;

interface GeneratedMultipleChoiceQuestion {
  q: string;
  o: string[];
  c: number;
}

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
          q: {
            type: "string",
            minLength: 1,
            maxLength: multipleChoiceQuestionSafetyMaxLength,
          },
          o: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: {
              type: "string",
              minLength: 1,
              maxLength: multipleChoiceOptionSafetyMaxLength,
            },
          },
          c: {
            type: "integer",
            minimum: 0,
            maximum: 3,
          },
        },
        required: ["q", "o", "c"],
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

  if (!questions || questions.length !== count) {
    return null;
  }

  const normalizedQuestions = new Set<string>();
  const validQuestions: MultipleChoiceContent[] = [];

  for (const value of questions) {
    const question = parsePublicQuestion(value);

    if (!question || !addUniqueQuestion(question.question, normalizedQuestions)) {
      return null;
    }

    validQuestions.push(question);
  }

  return validQuestions;
}

export function collectGeneratedQuestionSlots(
  output: unknown,
  count: number,
  excludedQuestions: string[] = [],
): Array<MultipleChoiceContent | null> {
  const questions = getQuestions(output);
  const normalizedQuestions = new Set(
    excludedQuestions.map(normalizeGeneratedQuestion),
  );

  return Array.from({ length: count }, (_, index) => {
    const generatedQuestion = parseGeneratedQuestion(questions?.[index]);

    if (
      !generatedQuestion ||
      !addUniqueQuestion(generatedQuestion.q, normalizedQuestions)
    ) {
      return null;
    }

    return {
      question: generatedQuestion.q,
      options: generatedQuestion.o,
      correctOptionIndex: generatedQuestion.c,
    };
  });
}

export function getGeneratedQuestionCount(output: unknown) {
  return getQuestions(output)?.length ?? 0;
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
    const question = parsePublicQuestion(value);

    if (
      !question ||
      typeof value !== "object" ||
      value === null ||
      !("id" in value) ||
      !("difficulty" in value) ||
      typeof value.id !== "string" ||
      !isUuid(value.id) ||
      !isAdaptiveDifficulty(value.difficulty) ||
      !addUniqueQuestion(question.question, normalizedQuestions)
    ) {
      return null;
    }

    questions.push({
      id: value.id,
      ...question,
      difficulty: value.difficulty,
    });
  }

  return { questions, trackingEnabled: output.trackingEnabled };
}

function parseGeneratedQuestion(
  value: unknown,
): GeneratedMultipleChoiceQuestion | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("q" in value) ||
    !("o" in value) ||
    !("c" in value) ||
    !isSafeText(value.q, multipleChoiceQuestionSafetyMaxLength) ||
    !areValidOptions(value.o) ||
    !isCorrectOptionIndex(value.c)
  ) {
    return null;
  }

  return {
    q: value.q.trim(),
    o: value.o.map((option) => option.trim()),
    c: value.c,
  };
}

function parsePublicQuestion(value: unknown): MultipleChoiceContent | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("question" in value) ||
    !("options" in value) ||
    !("correctOptionIndex" in value) ||
    !isSafeText(value.question, multipleChoiceQuestionSafetyMaxLength) ||
    !areValidOptions(value.options) ||
    !isCorrectOptionIndex(value.correctOptionIndex)
  ) {
    return null;
  }

  return {
    question: value.question.trim(),
    options: value.options.map((option) => option.trim()),
    correctOptionIndex: value.correctOptionIndex,
  };
}

function areValidOptions(value: unknown): value is string[] {
  if (!Array.isArray(value) || value.length !== 4) {
    return false;
  }

  const normalizedOptions = new Set<string>();

  for (const option of value) {
    if (!isSafeText(option, multipleChoiceOptionSafetyMaxLength)) {
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

function addUniqueQuestion(question: string, questions: Set<string>) {
  const normalizedQuestion = normalizeGeneratedQuestion(question);

  if (questions.has(normalizedQuestion)) {
    return false;
  }

  questions.add(normalizedQuestion);
  return true;
}

function normalizeGeneratedQuestion(value: string) {
  return value.trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
}

function isSafeText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );
}

function isCorrectOptionIndex(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 3
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
