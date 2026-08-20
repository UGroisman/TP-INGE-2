import "server-only";

import type { AdaptiveDifficulty } from "@/features/adaptive-learning/types";
import {
  buildMultipleChoiceSchema,
  collectGeneratedQuestionSlots,
  getGeneratedQuestionCount,
  validateQuestionsOutput,
} from "@/features/multiple-choice/generation";
import type {
  MultipleChoiceContent,
  QuestionCount,
} from "@/features/multiple-choice/types";
import { chatWithOllamaJson } from "@/lib/ollama";
import { logServerPerformance } from "@/lib/performance";

interface MultipleChoicePromptRequest {
  requestedCount: number;
  difficultyPlan: AdaptiveDifficulty[];
  excludedQuestions: string[];
  isRepair: boolean;
}

interface GenerateMultipleChoiceParams {
  count: QuestionCount;
  difficultyPlan: AdaptiveDifficulty[];
  systemMessage: string;
  diagnosticLabel: string;
  buildPrompt: (request: MultipleChoicePromptRequest) => string;
}

const multipleChoiceOutputTokenBase = 100;
const multipleChoiceOutputTokensPerQuestion = 90;

export async function generateMultipleChoiceWithRecovery({
  count,
  difficultyPlan,
  systemMessage,
  diagnosticLabel,
  buildPrompt,
}: GenerateMultipleChoiceParams): Promise<MultipleChoiceContent[] | null> {
  const firstOutput = await requestQuestions(
    count,
    difficultyPlan,
    [],
    false,
    systemMessage,
    diagnosticLabel,
    buildPrompt,
  );
  const firstReceivedCount = getGeneratedQuestionCount(firstOutput);
  const slots = collectGeneratedQuestionSlots(firstOutput, count);
  const firstAcceptedCount = countAcceptedQuestions(slots);
  const missingIndices = slots.flatMap((question, index) =>
    question === null ? [index] : [],
  );

  logValidationResult(
    diagnosticLabel,
    "initial",
    count,
    firstReceivedCount,
    firstAcceptedCount,
    missingIndices.length > 0,
  );

  if (missingIndices.length > 0) {
    const excludedQuestions = slots.flatMap((question) =>
      question ? [question.question] : [],
    );
    const repairPlan = missingIndices.map((index) => difficultyPlan[index]);
    const repairOutput = await requestQuestions(
      missingIndices.length,
      repairPlan,
      excludedQuestions,
      true,
      systemMessage,
      diagnosticLabel,
      buildPrompt,
    );
    const repairReceivedCount = getGeneratedQuestionCount(repairOutput);
    const replacements = collectGeneratedQuestionSlots(
      repairOutput,
      missingIndices.length,
      excludedQuestions,
    );
    const repairAcceptedCount = countAcceptedQuestions(replacements);

    logValidationResult(
      diagnosticLabel,
      "repair",
      missingIndices.length,
      repairReceivedCount,
      repairAcceptedCount,
      true,
    );

    missingIndices.forEach((slotIndex, replacementIndex) => {
      slots[slotIndex] = replacements[replacementIndex];
    });
  }

  return validateQuestionsOutput({ questions: slots }, count);
}

async function requestQuestions(
  requestedCount: number,
  difficultyPlan: AdaptiveDifficulty[],
  excludedQuestions: string[],
  isRepair: boolean,
  systemMessage: string,
  diagnosticLabel: string,
  buildPrompt: GenerateMultipleChoiceParams["buildPrompt"],
) {
  const schema = buildMultipleChoiceSchema(requestedCount);

  return chatWithOllamaJson({
    schema,
    diagnosticLabel: `${diagnosticLabel}.${isRepair ? "repair" : "initial"}`,
    temperature: 0.1,
    numPredict:
      multipleChoiceOutputTokenBase +
      multipleChoiceOutputTokensPerQuestion * requestedCount,
    messages: [
      { role: "system", content: systemMessage },
      {
        role: "user",
        content: buildPrompt({
          requestedCount,
          difficultyPlan,
          excludedQuestions,
          isRepair,
        }),
      },
    ],
  });
}

function countAcceptedQuestions(
  questions: Array<MultipleChoiceContent | null>,
) {
  return questions.filter((question) => question !== null).length;
}

function logValidationResult(
  diagnosticLabel: string,
  phase: "initial" | "repair",
  requestedCount: number,
  receivedCount: number,
  acceptedCount: number,
  repairTriggered: boolean,
) {
  logServerPerformance(`${diagnosticLabel}.${phase}.validation`, {
    requestedCount,
    receivedCount,
    acceptedCount,
    discardedCount: Math.max(receivedCount - acceptedCount, 0),
    missingCount: Math.max(requestedCount - acceptedCount, 0),
    repairTriggered,
  });
}
