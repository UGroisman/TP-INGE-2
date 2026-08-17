import { redirect } from "next/navigation";
import { RagDocumentsManager } from "@/features/rag/components/RagDocumentsManager";
import { createClient } from "@/lib/supabase/server";

export default async function RagDocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/rag");
  }

  return (
    <div className="w-full">
      <header className="mb-7 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
          RAG con material
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-normal text-zinc-950">
          Prepará tus fuentes de estudio
        </h1>
        <p className="mt-3 text-base leading-7 text-zinc-600">
          Pegá tus apuntes para convertirlos en fragmentos semánticos y usarlos
          como única fuente al generar contenido.
        </p>
      </header>

      <RagDocumentsManager />
    </div>
  );
}
