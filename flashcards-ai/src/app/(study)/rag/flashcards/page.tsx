import { redirect } from "next/navigation";
import { SessionUnavailable } from "@/features/auth/components/SessionUnavailable";
import { getServerAuthState } from "@/features/auth/server";
import { RagFlashcardGenerator } from "@/features/rag/components/RagFlashcardGenerator";

const pagePath = "/rag/flashcards";

export default async function RagFlashcardsPage() {
  const auth = await getServerAuthState();

  if (auth.status === "anonymous") {
    redirect(`/login?next=${encodeURIComponent(pagePath)}`);
  }

  if (auth.status === "unavailable") {
    return <SessionUnavailable retryHref={pagePath} />;
  }

  return (
    <div className="flex w-full flex-col items-center">
      <header className="mb-7 w-full max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
          Flashcards RAG
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-normal text-zinc-950">
          Generá desde tus materiales
        </h1>
        <p className="mt-3 text-base leading-7 text-zinc-600">
          Seleccioná hasta 10 fuentes. Las respuestas se construirán solamente
          con los fragmentos relacionados que encuentre la búsqueda semántica.
        </p>
      </header>

      <RagFlashcardGenerator />
    </div>
  );
}
