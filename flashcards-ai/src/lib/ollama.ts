import "server-only";

// Legacy names preserve the existing generation contracts during migration.
export class OllamaRequestError extends Error {
  constructor(message: string, public status = 502) { super(message); this.name = "OllamaRequestError"; }
}
export function getOllamaBaseUrl() { return "https://ai-gateway.vercel.sh/v1"; }
export function getOllamaModel() { return process.env.AI_GATEWAY_MODEL ?? "nvidia/nemotron-3.5-lightning-free"; }
export async function chatWithOllamaJson({ schema, messages, temperature = 0.3, numPredict }: {
  schema: Record<string, unknown>; messages: { role: "system" | "user"; content: string }[];
  temperature?: number; diagnosticLabel?: string; numPredict?: number;
}) {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) throw new OllamaRequestError("Falta configurar AI_GATEWAY_API_KEY.", 503);
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(`${getOllamaBaseUrl()}/chat/completions`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: getOllamaModel(), messages: [...messages, { role: "system", content: `Devolvé exclusivamente un JSON válido que cumpla este esquema y use exactamente sus nombres de propiedades: ${JSON.stringify(schema)}${attempt ? ". No incluyas explicaciones ni Markdown." : ""}` }], temperature,
          ...(numPredict ? { max_tokens: Math.max(numPredict, 8192) } : {}),
          response_format: { type: "json_schema", json_schema: { name: "study_content", strict: true, schema } } }),
        signal: AbortSignal.timeout(120000),
      });
    } catch { throw new OllamaRequestError("No pudimos conectar con Vercel AI Gateway."); }
    if (!response.ok) throw new OllamaRequestError(`AI Gateway rechazó la solicitud (HTTP ${response.status}). Revisá el modelo y el crédito disponible.`);
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      const clean = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      try { return JSON.parse(clean) as unknown; } catch { /* retry malformed output once */ }
    }
  }
  throw new OllamaRequestError("El modelo no devolvió JSON válido. Intentá nuevamente.");
}
