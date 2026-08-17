import {
  getAuthenticatedRagClient,
  toRagDocument,
  validateRagDocumentInput,
} from "@/features/rag/server";
import { splitIntoChunks, maxRagChunks } from "@/lib/rag/chunks";
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "El cuerpo de la solicitud debe ser JSON válido." },
      { status: 400 },
    );
  }

  const validation = validateRagDocumentInput(body);

  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const chunks = splitIntoChunks(validation.content);

  if (chunks.length === 0 || chunks.length > maxRagChunks) {
    return Response.json(
      { error: "El material debe generar entre 1 y 60 fragmentos." },
      { status: 400 },
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
        name: validation.name,
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
