"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  {
    href: "/",
    label: "Inicio",
  },
  {
    href: "/flashcards",
    label: "Flashcards",
  },
  {
    href: "/multiple-choice",
    label: "Opción múltiple",
  },
  {
    href: "/study-sets",
    label: "Study sets",
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-zinc-200 bg-white px-4 py-4 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 lg:mx-0 lg:block">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Flashcards AI
          </p>
          <p className="mt-1 text-sm text-zinc-500">Modo de estudio</p>
        </div>

        <nav
          aria-label="Funcionalidades"
          className="flex gap-2 lg:mt-8 lg:flex-col"
        >
          {navigationItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-teal-700 text-white"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
