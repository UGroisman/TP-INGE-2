import { redirect } from "next/navigation";
import { SessionUnavailable } from "@/features/auth/components/SessionUnavailable";
import { getServerAuthState } from "@/features/auth/server";
import { StudySetsManager } from "@/features/study-sets/components/StudySetsManager";
import { PageHeader } from "@/components/PageHeader";

const pagePath = "/study-sets";

export default async function StudySetsPage() {
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
        eyebrow="Study sets"
        title="Organizá tu contenido guardado"
        description="Creá study sets y guardá adentro las flashcards o preguntas que quieras conservar."
      />

      <StudySetsManager />
    </div>
  );
}
