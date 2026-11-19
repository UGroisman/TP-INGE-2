export async function startBackgroundGeneration(request: {
  kind: "flashcards" | "multiple_choice";
  topic: string;
  level: string;
  count?: number;
  documentIds?: string[];
}): Promise<boolean> {
  const response = await fetch("/api/generation-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (response.status === 401) return false;
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || "No pudimos iniciar la generación.");
  }
  const wakeUrl = process.env.NEXT_PUBLIC_WORKER_WAKE_URL;
  if (wakeUrl) void fetch(wakeUrl, { mode: "no-cors", cache: "no-store", keepalive: true }).catch(() => undefined);
  return true;
}
