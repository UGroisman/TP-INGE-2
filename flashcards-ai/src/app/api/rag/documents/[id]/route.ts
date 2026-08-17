import { getAuthenticatedRagClient } from "@/features/rag/server";

interface RagDocumentRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(
  _request: Request,
  context: RagDocumentRouteContext,
) {
  const auth = await getAuthenticatedRagClient();

  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const { data, error } = await auth.supabase
    .from("rag_documents")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return Response.json(
      { error: "No pudimos eliminar el material." },
      { status: 500 },
    );
  }

  if (!data) {
    return Response.json(
      { error: "No encontramos ese material." },
      { status: 404 },
    );
  }

  return Response.json({ success: true });
}
