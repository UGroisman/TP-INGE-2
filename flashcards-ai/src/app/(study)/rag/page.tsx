import { redirect } from "next/navigation";
import { SessionUnavailable } from "@/features/auth/components/SessionUnavailable";
import { getServerAuthState } from "@/features/auth/server";
import { RagDocumentsManager } from "@/features/rag/components/RagDocumentsManager";
import { PageHeader } from "@/components/PageHeader";

const pagePath = "/rag";

export default async function RagDocumentsPage() {
  const auth = await getServerAuthState();

  if (auth.status === "anonymous") {
    redirect(`/login?next=${encodeURIComponent(pagePath)}`);
  }

  if (auth.status === "unavailable") {
    return <SessionUnavailable retryHref={pagePath} />;
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="RAG con material"
        title="Prepará tus fuentes de estudio"
        description="Pegá tus apuntes o subí un PDF/TXT para convertirlo en fragmentos semánticos y usarlo como única fuente al generar contenido."
        className="max-w-2xl"
      />

      <RagDocumentsManager />
    </div>
  );
}
