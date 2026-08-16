interface OllamaMessage {
  role: "system" | "user";
  content: string;
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

interface ChatWithOllamaJsonParams {
  schema: Record<string, unknown>;
  messages: OllamaMessage[];
  temperature?: number;
}

export class OllamaRequestError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "OllamaRequestError";
    this.status = status;
  }
}

export async function chatWithOllamaJson({
  schema,
  messages,
  temperature = 0.3,
}: ChatWithOllamaJsonParams) {
  const ollamaBaseUrl =
    process.env.OLLAMA_BASE_URL?.replace(/\/$/, "") ??
    "http://localhost:11434";
  const ollamaModel = process.env.OLLAMA_MODEL ?? "gemma3:1b";

  let response: Response;

  try {
    response = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ollamaModel,
        stream: false,
        format: schema,
        options: {
          temperature,
        },
        messages,
      }),
    });
  } catch {
    throw new OllamaRequestError(
      "No pudimos conectarnos con Ollama. Verificá que esté corriendo.",
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    const modelError =
      response.status === 404 ||
      errorText.toLocaleLowerCase("es").includes("model");

    throw new OllamaRequestError(
      modelError
        ? "No pudimos usar el modelo configurado. Verificá OLLAMA_MODEL."
        : "No pudimos conectarnos correctamente con Ollama.",
    );
  }

  const data: unknown = await response.json();
  const content = getOllamaMessageContent(data);

  if (!content) {
    throw new OllamaRequestError(
      "El modelo local no devolvió contenido válido.",
    );
  }

  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new OllamaRequestError("El modelo local no devolvió JSON válido.");
  }
}

function getOllamaMessageContent(data: unknown) {
  if (typeof data !== "object" || data === null || !("message" in data)) {
    return null;
  }

  const response = data as OllamaChatResponse;

  return typeof response.message?.content === "string"
    ? response.message.content
    : null;
}
