import { SessionRetryButton } from "@/features/auth/components/SessionRetryButton";

interface SessionUnavailableProps {
  retryHref: string;
}

export function SessionUnavailable({ retryHref }: SessionUnavailableProps) {
  return (
    <section className="mx-auto max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
        Sesión no disponible
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        No pudimos validar tu sesión
      </h1>
      <p className="mt-2 text-sm leading-6 text-amber-900">
        Tu sesión no fue cerrada. Puede ser una demora temporal de Supabase.
      </p>
      <SessionRetryButton
        href={retryHref}
        className="mt-5 inline-flex rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
      />
    </section>
  );
}
