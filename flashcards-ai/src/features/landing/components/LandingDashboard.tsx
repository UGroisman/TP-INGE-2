import Link from "next/link";
import type { LandingAction, LandingStat } from "@/features/landing/types";

const stats: LandingStat[] = [
  {
    label: "Correctas",
    value: "24",
    detail: "respuestas correctas en opción múltiple",
  },
  {
    label: "Flashcards",
    value: "80",
    detail: "tarjetas creadas para estudiar",
  },
  {
    label: "Sesiones",
    value: "6",
    detail: "sesiones de estudio completadas",
  },
  {
    label: "Temas",
    value: "4",
    detail: "temas practicados recientemente",
  },
];

const actions: LandingAction[] = [
  {
    href: "/flashcards",
    label: "Crear flashcards",
    description: "Generá 10 tarjetas con pregunta y respuesta.",
  },
  {
    href: "/multiple-choice",
    label: "Practicar opción múltiple",
    description: "Respondé preguntas con 4 opciones.",
  },
];

const futureStats = [
  "Precisión por tema",
  "Tiempo de estudio",
  "Temas más practicados",
  "Historial de sesiones",
];

export function LandingDashboard() {
  return (
    <div className="w-full">
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
          Inicio
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-normal text-zinc-950">
          Bienvenido a tu espacio de estudio
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
          Repasá con flashcards, practicá con opción múltiple y seguí tu avance
          desde un solo lugar.
        </p>
      </section>

      <section
        aria-label="Estadísticas de estudio"
        className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
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

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">
            Elegí cómo querés practicar
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {actions.map((action, index) => (
              <Link
                key={action.href}
                href={action.href}
                className={`rounded-md px-4 py-4 font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 ${
                  index === 0
                    ? "bg-zinc-950 text-white hover:bg-zinc-800"
                    : "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
                }`}
              >
                <span className="block">{action.label}</span>
                <span
                  className={`mt-1 block text-sm font-normal leading-6 ${
                    index === 0 ? "text-zinc-200" : "text-zinc-500"
                  }`}
                >
                  {action.description}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-teal-200 bg-teal-50 p-5 text-teal-950">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Próximas stats
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            Espacio reservado para métricas reales
          </h2>
          <ul className="mt-4 space-y-2 text-sm leading-6">
            {futureStats.map((item) => (
              <li key={item} className="rounded-md bg-white/70 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}
