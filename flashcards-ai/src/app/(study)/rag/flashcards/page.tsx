import { redirect } from "next/navigation";
import { SessionUnavailable } from "@/features/auth/components/SessionUnavailable";
import { getServerAuthState } from "@/features/auth/server";
import { RagFlashcardGenerator } from "@/features/rag/components/RagFlashcardGenerator";
import { PageHeader } from "@/components/PageHeader";

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
      <PageHeader
        eyebrow="Flashcards RAG"
        title="Generá desde tus materiales"
        description="Seleccioná hasta 10 fuentes. Las respuestas se construirán solamente con los fragmentos relacionados que encuentre la búsqueda semántica."
        className="max-w-2xl"
      />

      <RagFlashcardGenerator />
    </div>
  );
}
