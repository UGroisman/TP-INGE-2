"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/rag", label: "Materiales" },
  { href: "/rag/flashcards", label: "Flashcards" },
  { href: "/rag/multiple-choice", label: "Opción múltiple" },
];

export function RagNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones de RAG"
      className="mb-7 flex flex-wrap gap-2 border-b border-zinc-200 pb-4"
    >
      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 ${
              isActive
                ? "bg-teal-700 text-white"
                : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
