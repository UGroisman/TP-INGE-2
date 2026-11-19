"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  BookmarkIcon,
  BrandMark,
  CardsIcon,
  ChecklistIcon,
  HomeIcon,
  LibraryIcon,
} from "@/components/icons";

interface NavigationItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const navigationGroups: { title: string; items: NavigationItem[] }[] = [
  {
    title: "General",
    items: [{ href: "/", label: "Inicio", icon: HomeIcon }],
  },
  {
    title: "Practicar",
    items: [
      { href: "/flashcards", label: "Flashcards", icon: CardsIcon },
      {
        href: "/multiple-choice",
        label: "Opción múltiple",
        icon: ChecklistIcon,
      },
    ],
  },
  {
    title: "Tus fuentes",
    items: [
      { href: "/rag", label: "RAG con material", icon: LibraryIcon },
      { href: "/study-sets", label: "Study sets", icon: BookmarkIcon },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  return href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();
  const allItems = navigationGroups.flatMap((group) => group.items);

  return (
    <>
      {/* Barra superior en mobile y tablet */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950 text-zinc-100 lg:hidden">
        <div className="flex items-center gap-3 px-4 pt-3">
          <BrandMark className="text-[1.6rem] text-marker" />
          <span className="font-display text-lg font-semibold tracking-tight">
            Flashcards AI
          </span>
        </div>
        <nav
          aria-label="Funcionalidades"
          className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 pt-2"
        >
          {allItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-marker ${
                  active
                    ? "bg-marker text-zinc-950"
                    : "text-zinc-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="text-base" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Barra lateral en escritorio */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-zinc-950 px-4 py-6 text-zinc-100 lg:flex">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-marker"
        >
          <BrandMark className="text-[2rem] text-marker" />
          <span>
            <span className="block font-display text-lg font-semibold leading-tight tracking-tight">
              Flashcards AI
            </span>
            <span className="block font-mono text-[0.65rem] uppercase tracking-[0.14em] text-zinc-400">
              Espacio de estudio
            </span>
          </span>
        </Link>

        <nav aria-label="Funcionalidades" className="mt-10 grid gap-7">
          {navigationGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-zinc-500">
                {group.title}
              </p>
              <ul className="mt-2 grid gap-1">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-marker ${
                          active
                            ? "bg-white/10 text-white"
                            : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute inset-y-2 left-0 w-1 rounded-full bg-marker transition ${
                            active ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <Icon
                          className={`text-lg transition ${
                            active
                              ? "text-marker"
                              : "text-zinc-500 group-hover:text-zinc-200"
                          }`}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-auto rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-zinc-500">
            Procesamiento
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Tus materiales se indexan en segundo plano mediante una cola de
            RabbitMQ.
          </p>
        </div>
      </aside>
    </>
  );
}
