import { redirect } from "next/navigation";
import { RagMultipleChoiceGenerator } from "@/features/rag/components/RagMultipleChoiceGenerator";
import { createClient } from "@/lib/supabase/server";

export default async function RagMultipleChoicePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/rag/multiple-choice");
  }

  return (
    <div className="flex w-full flex-col items-center">
      <header className="mb-7 w-full max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
          Opción múltiple RAG
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-normal text-zinc-950">
          Practicá con tus apuntes
        </h1>
        <p className="mt-3 text-base leading-7 text-zinc-600">
          Combiná varios materiales y generá preguntas cuya respuesta correcta
          esté respaldada por el contexto recuperado.
        </p>
      </header>

      <RagMultipleChoiceGenerator />
    </div>
  );
}
