import {
  getAuthenticatedRagClient,
  toRagDocument,
  validateRagDocumentContent,
  validateRagDocumentInput,
  validateRagDocumentName,
} from "@/features/rag/server";
import {
  ragDocumentContentMinLength,
  ragFileMaxSizeBytes,
} from "@/features/rag/constants";
import { splitIntoChunks, maxRagChunks } from "@/lib/rag/chunks";
import {
  extractRagFileText,
  RagFileError,
} from "@/lib/rag/documentText";
import {
  createEmbeddings,
  getOllamaEmbeddingModel,
  OllamaEmbeddingError,
} from "@/lib/rag/embeddings";

interface RagDocumentRow {
  id: string;
  name: string;
  embedding_model: string;
  chunk_count: number;
  created_at: string;
}

type RagDocumentInput =
  | { ok: true; name: string; content: string; source: "text" | "file" }
  | { ok: false; error: string; status: 400 | 413 | 415 | 422 };

const multipartRequestOverheadBytes = 256 * 1024;

export async function GET() {
  const auth = await getAuthenticatedRagClient();

  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("rag_documents")
    .select("id, name, embedding_model, chunk_count, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json(
      { error: "No pudimos cargar tus materiales." },
      { status: 500 },
    );
  }

  const documents = ((data ?? []) as RagDocumentRow[]).map(toRagDocument);

  return Response.json({ documents });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedRagClient();

  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const input = await readRagDocumentInput(request);

  if (!input.ok) {
    return Response.json({ error: input.error }, { status: input.status });
  }

  const chunks = splitIntoChunks(input.content);

  if (chunks.length === 0 || chunks.length > maxRagChunks) {
    return Response.json(
      { error: "El material debe generar entre 1 y 60 fragmentos." },
      { status: input.source === "file" ? 422 : 400 },
    );
  }

  try {
    const embeddings = await createEmbeddings(chunks, "document");
    const documentId = crypto.randomUUID();
    const embeddingModel = getOllamaEmbeddingModel();
    const { data: documentData, error: documentError } = await auth.supabase
      .from("rag_documents")
      .insert({
        id: documentId,
        user_id: auth.user.id,
        name: input.name,
        embedding_model: embeddingModel,
        chunk_count: chunks.length,
      })
      .select("id, name, embedding_model, chunk_count, created_at")
      .single();

    if (documentError || !documentData) {
      return Response.json(
        { error: "No pudimos guardar el material." },
        { status: 500 },
      );
    }

    const chunkRows = chunks.map((content, position) => ({
      id: crypto.randomUUID(),
      document_id: documentId,
      position,
      content,
      embedding: embeddings[position],
    }));
    const { error: chunksError } = await auth.supabase
      .from("rag_document_chunks")
      .insert(chunkRows);

    if (chunksError) {
      await auth.supabase.from("rag_documents").delete().eq("id", documentId);

      return Response.json(
        { error: "No pudimos guardar los fragmentos del material." },
        { status: 500 },
      );
    }

    return Response.json(
      { document: toRagDocument(documentData as RagDocumentRow) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof OllamaEmbeddingError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json(
      { error: "No pudimos procesar el material. Intentá nuevamente." },
      { status: 500 },
    );
  }
}

async function readRagDocumentInput(request: Request): Promise<RagDocumentInput> {
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();

  if (contentType === "application/json") {
    return readJsonInput(request);
  }

  if (contentType === "multipart/form-data") {
    return readFileInput(request);
  }

  return {
    ok: false,
    status: 415,
    error: "La solicitud debe enviar texto JSON o un archivo PDF/TXT.",
  };
}

async function readJsonInput(request: Request): Promise<RagDocumentInput> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      status: 400,
      error: "El cuerpo de la solicitud debe ser JSON válido.",
    };
  }

  const validation = validateRagDocumentInput(body);

  if (!validation.ok) {
    return { ok: false, status: 400, error: validation.error };
  }

  return { ...validation, source: "text" };
}

async function readFileInput(request: Request): Promise<RagDocumentInput> {
  const contentLength = Number(request.headers.get("content-length"));

  if (
    Number.isFinite(contentLength) &&
    contentLength > ragFileMaxSizeBytes + multipartRequestOverheadBytes
  ) {
    return {
      ok: false,
      status: 413,
      error: "El archivo no puede superar los 5 MB.",
    };
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return {
      ok: false,
      status: 400,
      error: "No pudimos leer el formulario del archivo.",
    };
  }

  const nameValidation = validateRagDocumentName(formData.get("name"));

  if (!nameValidation.ok) {
    return { ok: false, status: 400, error: nameValidation.error };
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return {
      ok: false,
      status: 400,
      error: "Seleccioná un archivo PDF o TXT.",
    };
  }

  let extractedContent: string;

  try {
    extractedContent = await extractRagFileText(file);
  } catch (error) {
    if (error instanceof RagFileError) {
      return { ok: false, status: error.status, error: error.message };
    }

    return {
      ok: false,
      status: 422,
      error: "No pudimos extraer el texto del archivo.",
    };
  }

  const contentValidation = validateRagDocumentContent(extractedContent);

  if (!contentValidation.ok) {
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const hasInsufficientPdfText =
      isPdf && extractedContent.length < ragDocumentContentMinLength;

    return {
      ok: false,
      status: 422,
      error: hasInsufficientPdfText
        ? "El PDF no contiene suficiente texto seleccionable. Esta versión no incluye OCR."
        : contentValidation.error,
    };
  }

  return {
    ok: true,
    name: nameValidation.name,
    content: contentValidation.content,
    source: "file",
  };
}
