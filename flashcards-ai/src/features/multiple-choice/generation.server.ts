import "server-only";

import type { AdaptiveDifficulty } from "@/features/adaptive-learning/types";
import {
  buildMultipleChoiceSchema,
  collectQuestionSlots,
  validateQuestionsOutput,
} from "@/features/multiple-choice/generation";
import type {
  MultipleChoiceContent,
  QuestionCount,
} from "@/features/multiple-choice/types";
import { chatWithOllamaJson } from "@/lib/ollama";

interface MultipleChoicePromptRequest {
  requestedCount: number;
  difficultyPlan: AdaptiveDifficulty[];
  excludedQuestions: string[];
  isRepair: boolean;
  schema: Record<string, unknown>;
}

interface GenerateMultipleChoiceParams {
  count: QuestionCount;
  difficultyPlan: AdaptiveDifficulty[];
  systemMessage: string;
  buildPrompt: (request: MultipleChoicePromptRequest) => string;
}

export async function generateMultipleChoiceWithRecovery({
  count,
  difficultyPlan,
  systemMessage,
  buildPrompt,
}: GenerateMultipleChoiceParams): Promise<MultipleChoiceContent[] | null> {
  const firstOutput = await requestQuestions(
    count,
    difficultyPlan,
    [],
    false,
    systemMessage,
    buildPrompt,
  );
  const slots = collectQuestionSlots(firstOutput, count);
  const missingIndices = slots.flatMap((question, index) =>
    question === null ? [index] : [],
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
      buildPrompt,
    );
    const replacements = collectQuestionSlots(
      repairOutput,
      missingIndices.length,
      excludedQuestions,
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
  buildPrompt: GenerateMultipleChoiceParams["buildPrompt"],
) {
  const schema = buildMultipleChoiceSchema(requestedCount);

  return chatWithOllamaJson({
    schema,
    messages: [
      { role: "system", content: systemMessage },
      {
        role: "user",
        content: buildPrompt({
          requestedCount,
          difficultyPlan,
          excludedQuestions,
          isRepair,
          schema,
        }),
      },
    ],
  });
}
