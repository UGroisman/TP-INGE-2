import { redirect } from "next/navigation";
import { StudySetsManager } from "@/features/study-sets/components/StudySetsManager";
import { createClient } from "@/lib/supabase/server";

export default async function StudySetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/study-sets");
  }

  return (
    <div className="w-full">
      <div className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
          Study sets
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-normal text-zinc-950">
          Organizá tu contenido guardado
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
          Creá study sets y guardá adentro las flashcards o preguntas que quieras
          conservar.
        </p>
      </div>

      <StudySetsManager />
    </div>
  );
}
