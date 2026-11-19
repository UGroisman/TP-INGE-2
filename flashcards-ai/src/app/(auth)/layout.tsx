import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/icons";

const highlights = [
  "Convertí tus apuntes en flashcards y preguntas.",
  "Tus materiales se procesan en segundo plano.",
  "Repasá primero los temas que más te cuestan.",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-zinc-950 p-12 text-zinc-100 lg:flex lg:flex-col">
        <Link
          href="/"
          className="flex items-center gap-3 self-start rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-marker"
        >
          <BrandMark className="text-[2.1rem] text-marker" />
          <span className="font-display text-xl font-semibold tracking-tight">
            Flashcards AI
          </span>
        </Link>

        <div className="relative z-10 mt-auto max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
            Espacio de estudio
          </p>
          <p className="mt-4 font-display text-[2.6rem] leading-[1.08] font-semibold">
            Estudiá con tus apuntes,{" "}
            <span className="italic text-marker">no contra ellos.</span>
          </p>
          <ul className="mt-8 grid gap-3 text-sm text-zinc-300">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-[2px] bg-marker" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Tarjetas decorativas */}
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 top-24">
          <div className="h-56 w-80 rotate-[-8deg] rounded-xl border border-white/10 bg-white/[0.04]" />
          <div className="-mt-44 ml-10 h-56 w-80 rotate-[4deg] rounded-xl border border-white/10 bg-white/[0.06] p-6">
            <span className="block h-2 w-24 rounded-full bg-marker/80" />
            <span className="mt-5 block h-2 w-52 rounded-full bg-white/15" />
            <span className="mt-3 block h-2 w-40 rounded-full bg-white/15" />
          </div>
        </div>
      </aside>

      <main className="paper-grid flex items-center justify-center px-4 py-10 text-zinc-950 sm:px-8">
        <div className="w-full max-w-md animate-rise">
          <Link
            href="/"
            className="mb-8 flex items-center gap-3 lg:hidden"
          >
            <BrandMark className="text-[1.8rem] text-teal-700" />
            <span className="font-display text-lg font-semibold">
              Flashcards AI
            </span>
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
