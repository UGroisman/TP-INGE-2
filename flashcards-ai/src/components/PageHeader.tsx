import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`mb-8 w-full ${className}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 text-4xl leading-[1.08] text-zinc-950 sm:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
          {description}
        </p>
      ) : null}
    </header>
  );
}
