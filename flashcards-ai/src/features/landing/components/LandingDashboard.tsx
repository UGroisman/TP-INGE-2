import Link from "next/link";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import type { LandingAction, LandingStat } from "@/features/landing/types";

interface LandingDashboardProps {
  userEmail?: string | null;
}

const stats: LandingStat[] = [
  {
    label: "Correctas",
    value: "-",
    detail: "se calcularán desde respuestas guardadas",
  },
  {
    label: "Flashcards",
    value: "-",
    detail: "se calcularán desde sets persistidos",
  },
  {
    label: "Sesiones",
    value: "-",
    detail: "se calcularán desde actividad real",
  },
  {
    label: "Temas",
    value: "-",
    detail: "se calcularán desde tu historial",
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
  {
    href: "/study-sets",
    label: "Ver study sets",
    description: "Revisá el contenido que guardaste.",
  },
];

const futureStats = [
  "Precisión por tema",
  "Tiempo de estudio",
  "Temas más practicados",
  "Historial de sesiones",
];

export function LandingDashboard({ userEmail }: LandingDashboardProps) {
  const isLoggedIn = Boolean(userEmail);

  return (
    <div className="w-full">
      <section className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Inicio
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-normal text-zinc-950">
            Bienvenido a tu espacio de estudio
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
            Repasá con flashcards, practicá con opción múltiple y prepará tu
            avance para guardarlo con Supabase.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          {isLoggedIn ? (
            <div className="grid gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  Sesión activa
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Logueado como: {userEmail}
                </p>
              </div>
              <LogoutButton />
            </div>
          ) : (
            <div className="grid gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  Sin sesión
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Iniciá sesión para preparar el guardado de tus datos.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/login"
                  className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                >
                  Registrarse
                </Link>
              </div>
            </div>
          )}
        </div>
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
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
            Espacio reservado para métricas persistidas
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
