import { redirect } from "next/navigation";
import { SessionUnavailable } from "@/features/auth/components/SessionUnavailable";
import { getServerAuthState } from "@/features/auth/server";
import { RagDocumentsManager } from "@/features/rag/components/RagDocumentsManager";

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
      <header className="mb-7 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
          RAG con material
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-normal text-zinc-950">
          Prepará tus fuentes de estudio
        </h1>
        <p className="mt-3 text-base leading-7 text-zinc-600">
          Pegá tus apuntes o subí un PDF/TXT para convertirlo en fragmentos
          semánticos y usarlo como única fuente al generar contenido.
        </p>
      </header>

      <RagDocumentsManager />
    </div>
  );
}
