import "server-only";

const supabaseRequestTimeoutMs = 10_000;

export async function fetchWithSupabaseTimeout(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) {
  const controller = new AbortController();
  const sourceSignal = init?.signal;
  const abortFromSource = () => controller.abort(sourceSignal?.reason);
  const timeoutId = setTimeout(() => controller.abort(), supabaseRequestTimeoutMs);

  if (sourceSignal?.aborted) {
    abortFromSource();
  } else {
    sourceSignal?.addEventListener("abort", abortFromSource, { once: true });
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
    sourceSignal?.removeEventListener("abort", abortFromSource);
  }
}
