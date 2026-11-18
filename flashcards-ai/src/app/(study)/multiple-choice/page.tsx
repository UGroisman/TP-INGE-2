import { MultipleChoiceGenerator } from "@/features/multiple-choice/components/MultipleChoiceGenerator";

export default async function MultipleChoicePage({ searchParams }: { searchParams: Promise<{ topic?: string; level?: string }> }) {
  const params = await searchParams;
  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-7 w-full max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
          Opción múltiple
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-normal text-zinc-950">
          Practicá con preguntas
        </h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600">
          Elegí un tema, un nivel educativo y cuántas preguntas querés generar.
        </p>
      </div>

      <MultipleChoiceGenerator initialTopic={params.topic} initialLevel={params.level} />
    </div>
  );
}
