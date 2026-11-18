import type { LandingStat } from "@/features/landing/types";
import { getLandingStudyStats } from "@/features/landing/server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getTopicsForReview } from "@/features/adaptive-learning/server";
import { getMasteryLabel } from "@/features/adaptive-learning/algorithm";
import { educationLevelLabels } from "@/features/study/types";

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
    <><LandingStatsGrid stats={stats} /><WeakTopics /></>
  ) : (
    <LandingStatsStatus state="error" />
  );
}

async function WeakTopics() {
  const supabase = await createClient();
  let topics;
  try {
    topics = await getTopicsForReview(supabase);
  } catch {
    topics = null;
  }
  return <section className="mt-8 rounded-lg border border-teal-200 bg-white p-5">
    <h2 className="text-xl font-semibold">Temas a reforzar</h2>
    {!topics ? <p role="alert">No pudimos cargar tu progreso.</p> : !topics.length ?
      <p className="mt-3 text-sm text-zinc-600">Respondé al menos cinco preguntas de un tema para recibir recomendaciones.</p> :
      <ul className="mt-4 space-y-3">{topics.map((row, index) => {
        const query = new URLSearchParams({ topic: row.topic, level: row.level });
        return <li key={`${row.topicKey}-${row.level}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-teal-50 p-3">
          <div><strong>{row.topic}</strong><p className="text-sm">Prioridad {index + 1} · {educationLevelLabels[row.level]} · {getMasteryLabel(row.mastery)} · {Math.round(row.mastery * 100)}% · {row.totalAttempts} respuestas</p></div>
          <Link className="font-semibold text-teal-800 underline" href={`/multiple-choice?${query}`}>Practicar este tema</Link>
        </li>;
      })}</ul>}
  </section>;
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
