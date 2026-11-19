import { redirect } from "next/navigation";
import { SessionUnavailable } from "@/features/auth/components/SessionUnavailable";
import { getServerAuthState } from "@/features/auth/server";
import { RagMultipleChoiceGenerator } from "@/features/rag/components/RagMultipleChoiceGenerator";
import { PageHeader } from "@/components/PageHeader";

const pagePath = "/rag/multiple-choice";

export default async function RagMultipleChoicePage() {
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
        eyebrow="Opción múltiple RAG"
        title="Practicá con tus apuntes"
        description="Combiná varios materiales y generá preguntas cuya respuesta correcta esté respaldada por el contexto recuperado."
        className="max-w-2xl"
      />

      <RagMultipleChoiceGenerator />
    </div>
  );
}
