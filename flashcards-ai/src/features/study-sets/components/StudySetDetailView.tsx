import type { StudySetDetail } from "@/features/study-sets/types";

interface StudySetDetailViewProps {
  studySet: StudySetDetail;
}

export function StudySetDetailView({ studySet }: StudySetDetailViewProps) {
  const itemCount =
    studySet.flashcards.length + studySet.multipleChoiceQuestions.length;

  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="eyebrow">
          Study set
        </p>
        <h1 className="mt-3 text-4xl leading-tight text-zinc-950">
          {studySet.topic}
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          {itemCount} ítems guardados
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-950">Flashcards</h2>

        {studySet.flashcards.length === 0 ? (
          <p className="mt-4 rounded-md bg-zinc-50 p-3 text-sm text-zinc-600">
            Este study set todavía no tiene flashcards.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {studySet.flashcards.map((flashcard, index) => (
              <article
                key={flashcard.id}
                className="rounded-md border border-zinc-200 p-4"
              >
                <p className="text-sm font-semibold text-teal-700">
                  Flashcard {index + 1}
                </p>
                <h3 className="mt-2 font-semibold text-zinc-950">
                  {flashcard.question}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {flashcard.answer}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-950">
          Opción múltiple
        </h2>

        {studySet.multipleChoiceQuestions.length === 0 ? (
          <p className="mt-4 rounded-md bg-zinc-50 p-3 text-sm text-zinc-600">
            Este study set todavía no tiene preguntas de opción múltiple.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {studySet.multipleChoiceQuestions.map((question, index) => (
              <article
                key={question.id}
                className="rounded-md border border-zinc-200 p-4"
              >
                <p className="text-sm font-semibold text-teal-700">
                  Pregunta {index + 1}
                </p>
                <h3 className="mt-2 font-semibold text-zinc-950">
                  {question.question}
                </h3>
                <div className="mt-3 grid gap-2">
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={option.id}
                      className={`rounded-md border px-3 py-2 text-sm ${
                        option.isCorrect
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : "border-zinc-200 bg-zinc-50 text-zinc-600"
                      }`}
                    >
                      <span className="font-semibold">
                        {String.fromCharCode(65 + optionIndex)}.
                      </span>{" "}
                      {option.text}
                      {option.isCorrect ? (
                        <span className="ml-2 font-semibold">Correcta</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
