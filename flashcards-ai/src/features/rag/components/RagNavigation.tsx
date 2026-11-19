"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CardsIcon, ChecklistIcon, LibraryIcon } from "@/components/icons";

const items = [
  { href: "/rag", label: "Materiales", icon: LibraryIcon },
  { href: "/rag/flashcards", label: "Flashcards", icon: CardsIcon },
  { href: "/rag/multiple-choice", label: "Opción múltiple", icon: ChecklistIcon },
];

export function RagNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones de RAG"
      className="no-scrollbar mb-8 flex w-full overflow-x-auto"
    >
      <div className="inline-flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                isActive
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              }`}
            >
              <Icon className={isActive ? "text-marker" : "text-zinc-400"} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
