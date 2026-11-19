import { FlashcardGenerator } from "@/features/flashcards/components/FlashcardGenerator";
import { PageHeader } from "@/components/PageHeader";

export default function FlashcardsPage() {
  return (
    <div className="flex w-full flex-col items-center">
      <PageHeader
        eyebrow="Flashcards"
        title="¿Qué querés estudiar?"
        description="Ingresá un tema, elegí el nivel educativo y generá 10 tarjetas para repasar una por una."
        className="max-w-2xl"
      />

      <FlashcardGenerator />
    </div>
  );
}
