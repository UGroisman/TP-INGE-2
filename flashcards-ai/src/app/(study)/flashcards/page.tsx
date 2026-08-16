import { FlashcardGenerator } from "@/features/flashcards/components/FlashcardGenerator";

export default function FlashcardsPage() {
  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-7 w-full max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
          Flashcards
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-normal text-zinc-950">
          ¿Qué querés estudiar?
        </h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600">
          Ingresá un tema, elegí el nivel educativo y generá 10 tarjetas para
          repasar una por una.
        </p>
      </div>

      <FlashcardGenerator />
    </div>
  );
}
