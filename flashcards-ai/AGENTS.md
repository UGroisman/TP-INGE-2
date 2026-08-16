<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` - verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project

This is a small EdTech study application powered by a local AI model through Ollama.

The app has two main study modes:

1. Classic flashcards: a student enters a topic and level, receives exactly 10 question/answer flashcards, and studies them one at a time.
2. Multiple choice practice: a student enters a topic, level, and question count, receives AI-generated questions with 4 options, selects an answer, and sees whether it was correct.

The project may grow beyond the original MVP, but it should remain simple enough for an academic project.

---

## Stack

Use:

* Next.js
* App Router
* React
* TypeScript
* Tailwind CSS
* Ollama local API
* Native `fetch`

Do not add a separate backend.

Use Next.js Route Handlers under:

```text
src/app/api/
```

Do not use Express.

---

## AI Provider

Use Ollama through its local HTTP API.

Default configuration:

```text
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:1b
```

These variables are optional because the app should use those defaults when they are missing.

Do not require API keys for local Ollama.

Never call Ollama directly from the browser. The browser calls a Next.js Route Handler, and the Route Handler calls Ollama.

---

## Feature Scope

### Flashcards

The flashcards feature must allow the user to enter a topic and level, generate exactly 10 cards, reveal answers, navigate one card at a time, see position, loading, errors, and retry.

### Multiple Choice

The multiple choice feature must allow the user to enter a topic, level, and count (`5`, `10`, or `15`), generate questions with exactly 4 options, pick one option, see correct/incorrect feedback, navigate one question at a time, and retry after errors.

---

## Navigation

The app uses routes and a shared sidebar.

Routes:

```text
/
/flashcards
/multiple-choice
```

`/` should redirect to `/flashcards`.

The sidebar must let the user choose between:

```text
Flashcards
Opcion multiple
```

---

## Suggested Structure

Keep each feature separated:

```text
src/
├── app/
│   ├── api/
│   │   ├── flashcards/
│   │   │   └── route.ts
│   │   └── multiple-choice/
│   │       └── route.ts
│   ├── flashcards/
│   │   └── page.tsx
│   ├── multiple-choice/
│   │   └── page.tsx
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   └── AppSidebar.tsx
│
├── features/
│   ├── flashcards/
│   │   ├── components/
│   │   └── services/
│   └── multiple-choice/
│       ├── components/
│       ├── services/
│       └── types.ts
│
├── lib/
│   └── ollama.ts
│
└── types/
    └── flashcard.ts
```

Do not create extra architecture unless it removes real duplication.

---

## Domain Types

Use TypeScript and avoid `any`.

Flashcard:

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

Multiple choice question:

```typescript
export interface MultipleChoiceQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
}
```

Question count:

```typescript
export type QuestionCount = 5 | 10 | 15;
```

---

## API Contracts

### POST /api/flashcards

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

### POST /api/multiple-choice

Request:

```json
{
  "topic": "Fotosintesis",
  "level": "primary",
  "count": 10
}
```

Response:

```json
{
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctOptionIndex": 0
    }
  ]
}
```

A successful response must contain exactly `count` questions.

---

## Validation

Validate input both client-side and server-side.

Topic:

* must be a string
* trim whitespace
* cannot be empty
* recommended length: 3-100 characters

Level must be:

```text
primary
secondary
university
```

Multiple choice count must be:

```text
5
10
15
```

Do not call Ollama if validation fails.

Treat AI output as external and untrusted. Validate it before returning it to the client.

---

## AI Output

Generated content requirements:

* Spanish language
* appropriate for selected educational level
* concise answers
* no duplicate questions
* focus on understanding
* stay on the requested topic

Prefer structured JSON output through Ollama's `format` option.

Do not parse manually formatted prose using regex.

---

## Client State

Simple React state is enough.

Do not introduce global state management.

Do not introduce Redux or Zustand.

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
Opcion multiple
```

---

## Security

Never expose secrets to the browser.

Do not log API keys or sensitive configuration.

Validate user input.

Validate AI output.

Do not put local model calls in Client Components.

---

## Dependencies

Keep dependencies minimal.

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
-> verify
-> next change
```

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

The expanded app is complete when:

* `/` redirects to `/flashcards`
* `/flashcards` works with 10 AI flashcards from Ollama
* `/multiple-choice` works with 5, 10, or 15 AI questions from Ollama
* the sidebar navigates between features
* invalid input is rejected
* loading and errors are handled
* retry works
* no model call runs in the browser
* TypeScript/lint/build succeed
* no unnecessary dependencies were added

---

## Core Rule

When unsure, prefer the simplest solution that supports these flows:

```text
Topic + level
    -> Flashcards
    -> Study one at a time
```

```text
Topic + level + count
    -> Multiple choice questions
    -> Pick an option
    -> See correct/incorrect feedback
```
