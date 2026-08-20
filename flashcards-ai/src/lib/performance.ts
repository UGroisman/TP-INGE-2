import "server-only";

type PerformanceMetric = string | number | boolean | null | undefined;

interface OllamaPerformanceResponse {
  total_duration?: unknown;
  load_duration?: unknown;
  prompt_eval_count?: unknown;
  prompt_eval_duration?: unknown;
  eval_count?: unknown;
  eval_duration?: unknown;
  message?: {
    content?: unknown;
  };
}

export function elapsedMilliseconds(startedAt: number) {
  return round(performance.now() - startedAt);
}

export function logServerPerformance(
  operation: string,
  metrics: Record<string, PerformanceMetric>,
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const safeMetrics = Object.fromEntries(
    Object.entries(metrics).filter(([, value]) => value !== undefined),
  );

  console.info(`[performance] ${operation}`, safeMetrics);
}

export function logOllamaPerformance(
  operation: string,
  response: unknown,
  wallTimeMs: number,
) {
  if (typeof response !== "object" || response === null) {
    return;
  }

  const metrics = response as OllamaPerformanceResponse;
  const promptTokens = finiteNumber(metrics.prompt_eval_count);
  const promptDuration = finiteNumber(metrics.prompt_eval_duration);
  const outputTokens = finiteNumber(metrics.eval_count);
  const outputDuration = finiteNumber(metrics.eval_duration);
  const outputCharacters =
    typeof metrics.message?.content === "string"
      ? metrics.message.content.length
      : undefined;

  logServerPerformance(operation, {
    wallMs: round(wallTimeMs),
    totalMs: nanosecondsToMilliseconds(metrics.total_duration),
    loadMs: nanosecondsToMilliseconds(metrics.load_duration),
    promptTokens,
    promptMs: nanosecondsToMilliseconds(promptDuration),
    promptTokensPerSecond: tokensPerSecond(promptTokens, promptDuration),
    outputTokens,
    outputCharacters,
    outputMs: nanosecondsToMilliseconds(outputDuration),
    outputTokensPerSecond: tokensPerSecond(outputTokens, outputDuration),
  });
}

function nanosecondsToMilliseconds(value: unknown) {
  const duration = finiteNumber(value);
  return duration === undefined ? undefined : round(duration / 1_000_000);
}

function tokensPerSecond(count: number | undefined, duration: unknown) {
  const durationNanoseconds = finiteNumber(duration);

  if (
    count === undefined ||
    durationNanoseconds === undefined ||
    durationNanoseconds <= 0
  ) {
    return undefined;
  }

  return round(count / (durationNanoseconds / 1_000_000_000));
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
