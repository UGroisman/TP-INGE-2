<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project

This is a small EdTech application for generating AI-powered flashcards.

Main user story:

> As a student, I want to enter an educational topic and educational level and receive exactly 10 AI-generated flashcards so I can study the main concepts of that topic.

The application should remain approximately the size of one large user story.

Do not expand the scope without explicit instructions.

---

## Stack

Use:

* Next.js
* App Router
* React
* TypeScript
* Tailwind CSS
* OpenAI API
* Native `fetch`

Do not add a separate backend.

Use Next.js Route Handlers under:

```text
src/app/api/
```

Do not use Express.

---

## MVP Scope

The application must allow the user to:

1. Enter an educational topic.
2. Select an educational level:

   * Primary
   * Secondary
   * University
3. Generate exactly 10 flashcards.
4. See one flashcard at a time.
5. Initially see only the question.
6. Reveal the answer.
7. Navigate with Previous and Next.
8. See the current position, for example `3 / 10`.
9. See a loading state while generating.
10. See a useful error message if generation fails.
11. Retry after an error.

---

## Out of Scope

Do not implement unless explicitly requested:

* authentication
* users
* database
* saved decks
* history
* quizzes
* exams
* PDF upload
* spaced repetition
* gamification
* analytics
* payments
* social features
* Redux
* Zustand
* Axios
* Express
* Prisma
* Firebase
* Supabase

Generated flashcards may be lost when the page is refreshed.

That is acceptable for the MVP.

---

## Development Order

Develop incrementally.

### Phase 1

Create the UI using mock flashcards.

Do not integrate OpenAI yet.

Implement:

* `TopicForm`
* `Flashcard`
* `FlashcardDeck`

Verify navigation and answer reveal using mock data.

### Phase 2

Create:

```text
POST /api/flashcards
```

Initially return mock flashcards from the endpoint.

Connect the frontend to the endpoint using `fetch`.

### Phase 3

Integrate OpenAI server-side.

Replace the mock response with AI-generated flashcards.

### Phase 4

Add:

* loading
* errors
* validation
* responsive styling
* basic accessibility

---

## Suggested Structure

```text
src/
├── app/
│   ├── api/
│   │   └── flashcards/
│   │       └── route.ts
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── TopicForm.tsx
│   ├── Flashcard.tsx
│   └── FlashcardDeck.tsx
│
├── types/
│   └── flashcard.ts
│
└── data/
    └── mockFlashcards.ts
```

Do not create additional architecture unless necessary.

---

## Domain Types

Use TypeScript.

Avoid `any`.

Main type:

```typescript
export interface Flashcard {
  question: string;
  answer: string;
}
```

Educational level:

```typescript
export type EducationLevel =
  | "primary"
  | "secondary"
  | "university";
```

---

## API Contract

Endpoint:

```http
POST /api/flashcards
```

Request:

```json
{
  "topic": "Teorema de Bayes",
  "level": "university"
}
```

Response:

```json
{
  "cards": [
    {
      "question": "...",
      "answer": "..."
    }
  ]
}
```

A successful response must contain exactly 10 cards.

---

## Validation

Validate input both client-side and server-side.

Topic:

* must be a string
* trim whitespace
* cannot be empty
* recommended length: 3–100 characters

Level must be:

```text
primary
secondary
university
```

Do not call OpenAI if validation fails.

---

## OpenAI

Use the official OpenAI SDK.

OpenAI must only be called from server-side code.

Never call OpenAI directly from a Client Component.

Environment variable:

```text
OPENAI_API_KEY
```

Store it in:

```text
.env.local
```

Never use:

```text
NEXT_PUBLIC_OPENAI_API_KEY
```

Never commit the real API key.

Provide:

```text
.env.example
```

with:

```text
OPENAI_API_KEY=
```

---

## AI Output

Generate exactly 10 flashcards.

Requirements:

* Spanish language
* appropriate for selected educational level
* concise answers
* no duplicate questions
* focus on understanding
* stay on the requested topic

Prefer structured JSON output.

Do not parse manually formatted prose using regex.

Treat AI output as external/untrusted data and validate it.

---

## Client State

Simple React state is enough.

Do not introduce global state management.

Typical state:

```typescript
const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

`FlashcardDeck` may maintain:

```typescript
const [currentIndex, setCurrentIndex] = useState(0);
```

`Flashcard` may maintain:

```typescript
const [showAnswer, setShowAnswer] = useState(false);
```

Reset answer visibility when changing cards.

---

## UI Language

User-facing text should be in Spanish.

Code identifiers should generally remain in English.

Examples:

```text
¿Qué querés estudiar?
Tema
Nivel educativo
Generar flashcards
Mostrar respuesta
Anterior
Siguiente
```

---

## Security

Never expose secrets to the browser.

Never log API keys.

Validate user input.

Validate AI output.

Do not put the API key in frontend code.

---

## Dependencies

Keep dependencies minimal.

Before installing a package, determine whether the same task can reasonably be solved using the existing stack.

Prefer:

```text
fetch
useState
Next.js Route Handlers
Tailwind
```

Do not add libraries only for convenience.

---

## Coding Style

Prefer simple, readable code.

This is an academic project and the repository owner must be able to explain the implementation.

Avoid unnecessary abstractions.

Do not over-engineer.

Do not rewrite unrelated files.

Keep changes focused.

Follow existing project conventions when they are reasonable.

---

## Agent Workflow

Before changing code:

1. Inspect the repository.
2. Read this file.
3. Understand the existing implementation.
4. Modify only the files necessary for the requested task.

Work incrementally:

```text
small change
→ verify
→ next change
```

Do not attempt a large rewrite unless explicitly requested.

Do not add features that were not requested.

---

## Verification

After meaningful changes, run when appropriate:

```bash
npm run lint
```

and:

```bash
npm run build
```

If tests exist, run them as well.

Do not claim that something works if it was not verified.

If verification cannot be performed, state that clearly.

---

## Definition of Done

The MVP is complete when:

* the app runs locally
* the user can enter a topic
* the user can choose a level
* invalid input is rejected
* generation shows loading feedback
* the backend securely calls OpenAI
* exactly 10 flashcards are returned
* one card is displayed at a time
* answers begin hidden
* answers can be revealed
* Previous and Next work correctly
* the card counter works
* errors are handled
* retry works
* no secret reaches the browser
* TypeScript/lint/build succeed
* no unnecessary features or dependencies were added

---

## Core Rule

When unsure about a decision, prefer the simplest solution that supports this flow:

```text
Topic + educational level
        ↓
Generate
        ↓
10 AI flashcards
        ↓
Study one at a time
```

Anything outside that flow should only be added when explicitly requested.

