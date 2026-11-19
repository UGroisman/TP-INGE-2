import type { ComponentType, ReactNode, SVGProps } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookmarkIcon,
  CardsIcon,
  CheckIcon,
  ChecklistIcon,
  GearIcon,
  LibraryIcon,
  QueueIcon,
  UploadIcon,
} from "@/components/icons";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { SessionRetryButton } from "@/features/auth/components/SessionRetryButton";
import type { LandingAction } from "@/features/landing/types";

interface LandingDashboardProps {
  sessionStatus: "authenticated" | "anonymous" | "unavailable";
  userEmail?: string | null;
  statsContent: ReactNode;
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const actions: (LandingAction & { icon: IconComponent })[] = [
  {
    href: "/flashcards",
    label: "Crear flashcards",
    description: "Generá 10 tarjetas con pregunta y respuesta.",
    icon: CardsIcon,
  },
  {
    href: "/multiple-choice",
    label: "Practicar opción múltiple",
    description: "Respondé preguntas con 4 opciones.",
    icon: ChecklistIcon,
  },
  {
    href: "/rag",
    label: "Estudiar con material",
    description: "Generá contenido basado en tus propios apuntes.",
    icon: LibraryIcon,
  },
  {
    href: "/study-sets",
    label: "Ver study sets",
    description: "Revisá el contenido que guardaste.",
    icon: BookmarkIcon,
  },
];

const pipelineSteps: { title: string; detail: string; icon: IconComponent }[] =
  [
    {
      title: "Cargás tu material",
      detail: "PDF, TXT o texto pegado. La respuesta es inmediata.",
      icon: UploadIcon,
    },
    {
      title: "Se publica un evento",
      detail: "material.uploaded viaja por RabbitMQ hasta la cola.",
      icon: QueueIcon,
    },
    {
      title: "El worker lo procesa",
      detail: "Fragmenta, genera vectores y prepara tarjetas iniciales.",
      icon: GearIcon,
    },
    {
      title: "Listo para estudiar",
      detail: "El material aparece disponible en RAG.",
      icon: CheckIcon,
    },
  ];

export function LandingDashboard({
  sessionStatus,
  userEmail,
  statsContent,
}: LandingDashboardProps) {
  return (
    <div className="w-full">
      <section className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-end">
        <div className="max-w-3xl">
          <p className="eyebrow">Inicio</p>
          <h1 className="mt-3 text-4xl leading-[1.05] text-zinc-950 sm:text-[3.4rem]">
            Tu escritorio de <span className="marker">estudio</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
            Repasá con flashcards, practicá con opción múltiple y dejá que las
            próximas preguntas se ajusten a tu rendimiento.
          </p>
        </div>

        <SessionPanel status={sessionStatus} userEmail={userEmail} />
      </section>

      {statsContent}

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-2xl text-zinc-950">
              Elegí cómo querés practicar
            </h2>
            <span className="font-mono text-xs text-zinc-400">04 modos</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {actions.map((action, index) => {
              const Icon = action.icon;
              const featured = index === 0;

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-lg p-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
                    featured
                      ? "bg-zinc-950 text-white hover:bg-zinc-900"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-white hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`grid size-10 place-items-center rounded-md text-xl ${
                        featured
                          ? "bg-marker text-zinc-950"
                          : "bg-white text-teal-700 ring-1 ring-zinc-200"
                      }`}
                    >
                      <Icon />
                    </span>
                    <span
                      className={`font-mono text-xs ${
                        featured ? "text-zinc-500" : "text-zinc-400"
                      }`}
                    >
                      0{index + 1}
                    </span>
                  </div>
                  <div className="mt-6">
                    <span className="flex items-center gap-2 font-semibold">
                      {action.label}
                      <ArrowRightIcon className="text-base opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </span>
                    <span
                      className={`mt-1 block text-sm leading-6 ${
                        featured ? "text-zinc-400" : "text-zinc-500"
                      }`}
                    >
                      {action.description}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="eyebrow">Cómo procesamos tu material</p>
          <h2 className="mt-3 text-2xl text-zinc-950">
            Procesamiento asincrónico
          </h2>
          <ol className="relative mt-5 grid gap-4">
            <span
              aria-hidden="true"
              className="absolute bottom-5 left-[1.2rem] top-5 w-px bg-zinc-200"
            />
            {pipelineSteps.map((step) => {
              const Icon = step.icon;

              return (
                <li key={step.title} className="relative flex gap-4">
                  <span className="relative grid size-10 shrink-0 place-items-center rounded-full border border-zinc-200 bg-zinc-50 text-lg text-teal-700">
                    <Icon />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-sm leading-6 text-zinc-500">
                      {step.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>
      </section>
    </div>
  );
}

function SessionPanel({
  status,
  userEmail,
}: {
  status: LandingDashboardProps["sessionStatus"];
  userEmail?: string | null;
}) {
  if (status === "authenticated") {
    const initial = (userEmail?.trim()[0] ?? "U").toUpperCase();

    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-teal-700 font-display text-lg font-semibold text-white">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
              <span className="size-2 rounded-full bg-emerald-500" />
              Sesión activa
            </p>
            <p className="truncate text-sm text-zinc-500">
              {userEmail ?? "Usuario autenticado"}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <LogoutButton />
        </div>
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm">
        <p className="text-sm font-semibold">No pudimos validar tu sesión</p>
        <p className="mt-1 text-sm leading-6">
          No cerramos tu sesión. Puede ser una demora temporal de Supabase.
        </p>
        <SessionRetryButton
          href="/"
          className="mt-3 inline-flex rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-zinc-950">Sin sesión</p>
      <p className="mt-1 text-sm leading-6 text-zinc-500">
        Iniciá sesión para guardar tu progreso y tus materiales.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href="/login"
          className="rounded-md bg-zinc-950 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
        >
          Registrarse
        </Link>
      </div>
    </div>
  );
}
