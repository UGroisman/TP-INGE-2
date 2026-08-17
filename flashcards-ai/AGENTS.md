<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project

This is a small EdTech study application powered by a local AI model through Ollama, with Supabase for authentication, database storage, and persistence.

The app has these main sections:

1. Inicio: a landing/dashboard with a welcome message, user session state, future Supabase-backed stats, and shortcuts to study modes.
2. Flashcards: a student enters a topic and level, receives exactly 10 question/answer flashcards, and studies them one at a time.
3. Opción múltiple: a student enters a topic, level, and question count, receives AI-generated questions with 4 options, selects an answer, and sees whether it was correct.
4. Autenticación: users can register, log in, and log out with Supabase Auth.

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
* Supabase Auth and database
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

Ollama is used only for study content generation. It is not used for authentication, persistence, or dashboard stats.

---

## Supabase

Use Supabase for:

* authentication
* user sessions
* database persistence
* future study stats

Required environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

These are public Supabase browser credentials, but `.env.local` must still remain uncommitted. `.env.example` should contain only placeholders.

Use helpers under:

```text
src/lib/supabase/
```

Use:

* `createBrowserClient` from Client Components
* `createServerClient` from Server Components and server-side code
* `src/proxy.ts` for session refresh, because Next.js 16 renamed Middleware to Proxy

Do not keep duplicate Supabase helpers in `src/utils/supabase`.

---

## Feature Scope

### Inicio

The landing page at `/` must welcome the user, show session state, include an info box for future metrics, and provide buttons to `/flashcards` and `/multiple-choice`.

Stats should come from Supabase once the database schema exists. Until then, use a pending/empty state rather than fake production data.

### Auth

The auth feature must allow:

* register with email/password at `/register`
* login with email/password at `/login`
* logout from the landing
* session display on the landing

Auth pages should not use the study sidebar.

Study routes stay public for now. Require login only when saving or reading user-specific persisted data.

### Flashcards

The flashcards feature must allow the user to enter a topic and level, generate exactly 10 cards, reveal answers, navigate one card at a time, see position, loading, errors, and retry.

### Multiple Choice

The multiple choice feature must allow the user to enter a topic, level, and count (`5`, `10`, or `15`), generate questions with exactly 4 options, pick one option, see correct/incorrect feedback, navigate one question at a time, and retry after errors.

---

## Navigation

The app uses routes and a shared sidebar for study routes.

Routes:

```text
/
/flashcards
/multiple-choice
/login
/register
```

`/` is the landing/dashboard page. It must not redirect to another route.

The study sidebar must let the user choose between:

```text
Inicio
Flashcards
Opción múltiple
```

Auth routes (`/login`, `/register`) should render without the sidebar.

---

## Suggested Structure

Keep each feature separated:

```text
src/
|-- app/
|   |-- (auth)/
|   |   |-- login/page.tsx
|   |   `-- register/page.tsx
|   |-- (study)/
|   |   |-- page.tsx
|   |   |-- layout.tsx
|   |   |-- flashcards/page.tsx
|   |   `-- multiple-choice/page.tsx
|   |-- api/
|   |   |-- flashcards/route.ts
|   |   `-- multiple-choice/route.ts
|   |-- layout.tsx
|   `-- globals.css
|
|-- components/
|   `-- AppSidebar.tsx
|
|-- features/
|   |-- auth/
|   |   `-- components/
|   |-- landing/
|   |   |-- components/
|   |   `-- types.ts
|   |-- study/
|   |   `-- types.ts
|   |-- flashcards/
|   |   |-- components/
|   |   |-- services/
|   |   `-- types.ts
|   `-- multiple-choice/
|       |-- components/
|       |-- services/
|       `-- types.ts
|
|-- lib/
|   |-- ollama.ts
|   `-- supabase/
|       |-- client.ts
|       |-- server.ts
|       `-- middleware.ts
|
`-- proxy.ts
```

Do not create extra architecture unless it removes real duplication.

---

## Domain Types

Use TypeScript and avoid `any`.

Shared study types live in:

```text
src/features/study/types.ts
```

Flashcard types live in:

```text
src/features/flashcards/types.ts
```

Multiple choice types live in:

```text
src/features/multiple-choice/types.ts
```

Landing types live in:

```text
src/features/landing/types.ts
```

Do not recreate domain types in route handlers or components when a feature type already exists.

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
  "topic": "Fotosíntesis",
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

When persistence is added, validate Supabase writes server-side and rely on RLS for user ownership.

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

Auth state should come from Supabase session helpers, not from custom global stores.

---

## UI Language

User-facing text should be in Spanish.

Code identifiers should generally remain in English.

Examples:

```text
Bienvenido
Inicio
¿Qué querés estudiar?
Tema
Nivel educativo
Generar flashcards
Mostrar respuesta
Anterior
Siguiente
Opción múltiple
Iniciar sesión
Registrarse
Cerrar sesión
```

---

## Security

Never expose secrets to the browser.

Do not log API keys or sensitive configuration.

Validate user input.

Validate AI output.

Do not put local model calls in Client Components.

Do not use Supabase service-role keys in this frontend app.

Use Supabase RLS for user-specific tables.

---

## Dependencies

Keep dependencies minimal.

Allowed persistence/auth dependencies:

```text
@supabase/supabase-js
@supabase/ssr
```

Prefer:

```text
fetch
useState
Next.js Route Handlers
Tailwind
Supabase helpers
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

* `/` shows the landing/dashboard with session state and navigation buttons
* `/login` signs users in with Supabase Auth
* `/register` signs users up with Supabase Auth
* logout clears the session
* `/flashcards` works with 10 AI flashcards from Ollama
* `/multiple-choice` works with 5, 10, or 15 AI questions from Ollama
* the sidebar navigates between Inicio, Flashcards, and Opción múltiple
* invalid input is rejected
* loading and errors are handled
* retry works
* no model call runs in the browser
* Supabase helpers live only under `src/lib/supabase`
* TypeScript/lint/build succeed
* no unnecessary dependencies were added

---

## Core Rule

When unsure, prefer the simplest solution that supports these flows:

```text
Open app
    -> See session state
    -> Choose a study mode
```

```text
Register / login
    -> Supabase Auth session
    -> auth.uid()
    -> future RLS-backed persistence
```

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
