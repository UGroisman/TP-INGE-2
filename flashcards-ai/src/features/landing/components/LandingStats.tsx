import type { LandingStat } from "@/features/landing/types";
import { getLandingStudyStats } from "@/features/landing/server";
import { createClient } from "@/lib/supabase/server";

type LandingStatsState = "anonymous" | "error" | "loading";

export async function AuthenticatedLandingStats() {
  const supabase = await createClient();
  let stats: LandingStat[] | null = null;

  try {
    const studyStats = await getLandingStudyStats(supabase);
    stats = [
      {
        label: "Correctas",
        value: String(studyStats.correctAnswers),
        detail: "respuestas acertadas",
      },
      {
        label: "Intentos",
        value: String(studyStats.totalAttempts),
        detail: "respuestas registradas",
      },
      {
        label: "Precisión",
        value: studyStats.accuracy === null ? "—" : `${studyStats.accuracy}%`,
        detail:
          studyStats.accuracy === null
            ? "respondé una pregunta para calcularla"
            : "sobre todos tus intentos",
      },
      {
        label: "Temas",
        value: String(studyStats.topicsPracticed),
        detail: "temas únicos practicados",
      },
    ];

  } catch {
    stats = null;
  }

  return stats ? (
    <LandingStatsGrid stats={stats} />
  ) : (
    <LandingStatsStatus state="error" />
  );
}

export function LandingStatsStatus({ state }: { state: LandingStatsState }) {
  const stats = ["Correctas", "Intentos", "Precisión", "Temas"].map(
    (label): LandingStat => {
      if (state === "loading") {
        return { label, value: "…", detail: "cargando estadísticas" };
      }

      if (state === "anonymous") {
        return {
          label,
          value: "—",
          detail: "iniciá sesión para registrar esta métrica",
        };
      }

      return {
        label,
        value: "—",
        detail: "no pudimos cargar esta métrica",
      };
    },
  );

  return <LandingStatsGrid stats={stats} loading={state === "loading"} />;
}

function LandingStatsGrid({
  stats,
  loading = false,
}: {
  stats: LandingStat[];
  loading?: boolean;
}) {
  return (
    <section
      aria-label="Estadísticas de estudio"
      aria-busy={loading}
      className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {stats.map((stat) => (
        <article
          key={stat.label}
          className="min-h-40 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm font-semibold text-zinc-600">{stat.label}</p>
          <p className="mt-3 text-4xl font-bold tracking-normal text-zinc-950">
            {stat.value}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {stat.detail}
          </p>
        </article>
      ))}
    </section>
  );
}
