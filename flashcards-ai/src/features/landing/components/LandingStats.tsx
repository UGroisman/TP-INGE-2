import type { LandingStat } from "@/features/landing/types";
import { getLandingStudyStats } from "@/features/landing/server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getTopicsForReview } from "@/features/adaptive-learning/server";
import { getMasteryLabel } from "@/features/adaptive-learning/algorithm";
import { educationLevelLabels } from "@/features/study/types";
import {
  ArrowRightIcon,
  CheckIcon,
  ChecklistIcon,
  LibraryIcon,
  TargetIcon,
} from "@/components/icons";

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
  return (
    <section className="mt-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="eyebrow">Refuerzo</p>
          <h2 className="mt-2 text-2xl text-zinc-950">Temas a reforzar</h2>
        </div>
        <p className="text-sm text-zinc-500">Ordenados por menor precisión</p>
      </div>
      {!topics ? (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">
          No pudimos cargar tu progreso.
        </p>
      ) : !topics.length ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
          <TargetIcon className="shrink-0 text-xl text-zinc-400" />
          Respondé al menos cinco preguntas de un tema para recibir recomendaciones.
        </div>
      ) : (
        <ul className="mt-5 grid gap-3">
          {topics.map((row, index) => {
            const query = new URLSearchParams({ topic: row.topic, level: row.level });
            const percent = Math.round(row.mastery * 100);
            const tone = masteryTone(row.mastery);
            return (
              <li
                key={`${row.topicKey}-${row.level}`}
                className="grid gap-3 rounded-lg border border-zinc-200 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-5"
              >
                <span className="font-mono text-sm text-zinc-400">#{index + 1}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="font-semibold text-zinc-950">{row.topic}</strong>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone.badge}`}>
                      {getMasteryLabel(row.mastery)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                      <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.max(percent, 3)}%` }} />
                    </div>
                    <span className="font-mono text-xs text-zinc-500">{percent}%</span>
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    {educationLevelLabels[row.level]} · {row.totalAttempts} respuestas
                  </p>
                </div>
                <Link
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:border-teal-600 hover:text-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                  href={`/multiple-choice?${query}`}
                >
                  Practicar este tema
                  <ArrowRightIcon />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function masteryTone(mastery: number) {
  if (mastery < 0.4) {
    return { badge: "bg-red-50 text-red-700", bar: "bg-red-500" };
  }
  if (mastery <= 0.75) {
    return { badge: "bg-amber-50 text-amber-800", bar: "bg-marker" };
  }
  return { badge: "bg-emerald-50 text-emerald-800", bar: "bg-teal-600" };
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

const statIcons = {
  Correctas: CheckIcon,
  Intentos: ChecklistIcon,
  "Precisión": TargetIcon,
  Temas: LibraryIcon,
} as const;

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
      {stats.map((stat, index) => {
        const Icon = statIcons[stat.label as keyof typeof statIcons] ?? TargetIcon;
        return (
          <article
            key={stat.label}
            style={{ animationDelay: `${index * 70}ms` }}
            className="animate-rise rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-zinc-500">
                {stat.label}
              </p>
              <Icon className="text-lg text-teal-600" />
            </div>
            <p
              className={`mt-4 font-display text-[2.6rem] leading-none font-semibold text-zinc-950 ${
                loading ? "animate-pulse text-zinc-300" : ""
              }`}
            >
              {stat.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{stat.detail}</p>
          </article>
        );
      })}
    </section>
  );
}
