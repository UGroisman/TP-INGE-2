import { MultipleChoiceGenerator } from "@/features/multiple-choice/components/MultipleChoiceGenerator";
import { PageHeader } from "@/components/PageHeader";

export default async function MultipleChoicePage({ searchParams }: { searchParams: Promise<{ topic?: string; level?: string }> }) {
  const params = await searchParams;
  return (
    <div className="flex w-full flex-col items-center">
      <PageHeader
        eyebrow="Opción múltiple"
        title="Practicá con preguntas"
        description="Elegí un tema, un nivel educativo y cuántas preguntas querés generar."
        className="max-w-2xl"
      />

      <MultipleChoiceGenerator initialTopic={params.topic} initialLevel={params.level} />
    </div>
  );
}
