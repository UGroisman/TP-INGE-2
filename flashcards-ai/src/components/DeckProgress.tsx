interface DeckProgressProps {
  current: number;
  total: number;
  label: string;
}

/** Contador y barra segmentada para recorrer tarjetas o preguntas. */
export function DeckProgress({ current, total, label }: DeckProgressProps) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium text-zinc-600">
          {label} {current + 1}
        </p>
        <p className="font-mono text-sm text-zinc-500">
          <span className="text-zinc-950">
            {String(current + 1).padStart(2, "0")}
          </span>{" "}
          / {String(total).padStart(2, "0")}
        </p>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              index < current
                ? "bg-teal-600"
                : index === current
                  ? "bg-marker"
                  : "bg-zinc-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
