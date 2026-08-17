<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project

This is a small EdTech study application powered by a local AI model through Ollama, with Supabase for authentication, database storage, and persistence.

The app has these main sections:

1. Inicio: a landing/dashboard with welcome text, user session state, future Supabase-backed stats, and shortcuts to study modes.
2. Flashcards: a student enters a topic and level, receives exactly 10 question/answer flashcards, and studies them one at a time.
3. Opción múltiple: a student enters a topic, level, and question count, receives AI-generated questions with 4 options, selects an answer, and sees whether it was correct.
4. RAG con material: authenticated users load study notes, select one or more documents, and generate grounded flashcards or multiple choice questions.
5. Study sets: authenticated users can create study sets and save selected generated items into them.
6. Autenticación: users can register, log in, and log out with Supabase Auth.

The project may grow beyond the original MVP, but it should remain simple enough for an academic project.

## Stack

Use Next.js, App Router, React, TypeScript, Tailwind CSS, Ollama local API, Supabase Auth/database, and native `fetch`.

Do not add a separate backend. Do not use Express. Use Next.js Route Handlers under `src/app/api/`.

## AI Provider

Use Ollama through its local HTTP API.

Default configuration:

```text
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:1b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

These variables are optional because the app should use those defaults when they are missing.

`OLLAMA_MODEL` generates study content. `OLLAMA_EMBEDDING_MODEL` creates the 768-dimensional vectors used by RAG.

Never call Ollama directly from the browser. The browser calls a Next.js Route Handler, and the Route Handler calls Ollama for chat or embeddings.

Ollama is used only for study content generation. It is not used for authentication, persistence, or dashboard stats.

For `nomic-embed-text`, prefix stored chunks with `search_document:` and retrieval queries with `search_query:`. Always use the same embedding model and dimension when indexing and searching.

## Supabase

Use Supabase for authentication, user sessions, database persistence, and future study stats.

Required environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

These are public Supabase browser credentials, but `.env.local` must still remain uncommitted. `.env.example` should contain only placeholders.

Use helpers under `src/lib/supabase/`.

Use `src/proxy.ts` for session refresh, because Next.js 16 renamed Middleware to Proxy.

Do not keep duplicate Supabase helpers in `src/utils/supabase`.

## Supabase Migrations

Use Supabase CLI as a local dev dependency, executed with Windows commands:

```bash
npx.cmd supabase ...
```

Use this workflow:

* `npx.cmd supabase db pull` is only for importing changes that were made directly in the Supabase Dashboard or remote database.
* If a schema change starts in this repo, create or edit a migration locally and apply it to Supabase with `db push`.
* Before applying remote changes, always run:

```bash
npx.cmd supabase db push --dry-run
```

Then apply:

```bash
npx.cmd supabase db push
```

Do not run `db pull` after every code change. Pull only when the remote database changed outside the repo.

Do not commit tokens, database passwords, `.env.local`, or connection strings.

## Supabase Tables

Use the existing tables:

```text
study_sets
  id uuid primary key
  topic text
  user_id uuid references auth.users.id
  created_at timestamptz

flashcards
  id uuid primary key
  study_set_id uuid references study_sets.id
  question text
  answer text

multiple_choice_questions
  id uuid primary key
  study_set_id uuid references study_sets.id
  question text

multiple_choice_options
  id uuid primary key
  question_id uuid references multiple_choice_questions.id
  answer text
  is_correct boolean

rag_documents
  id uuid primary key
  user_id uuid references auth.users.id
  name text
  embedding_model text
  chunk_count integer
  created_at timestamptz

rag_document_chunks
  id uuid primary key
  document_id uuid references rag_documents.id
  position integer
  content text
  embedding extensions.vector(768)
  created_at timestamptz
```

`study_sets.topic` is the display name of the study set in the UI.

`multiple_choice_options.answer` stores the option text. UI/domain types may expose that value as `text`, but database reads and writes must use the real column name `answer`.

RAG chunks inherit ownership through `rag_documents.user_id`; do not duplicate `user_id` in `rag_document_chunks`. Deleting a document must cascade to its chunks.

Use the `match_rag_chunks` RPC as `SECURITY INVOKER`. It must filter by the authenticated user, selected document IDs, current embedding model, similarity threshold, and result limit. Only `authenticated` may execute it.

Do not propose schema changes unless the user asks for functionality that requires them. Real answer history, accuracy, attempts, time spent, and exact ordering would require additional columns or tables.

Rely on existing RLS policies so users can only access their own data.

## Feature Scope

### Inicio

The landing page at `/` must welcome the user, show session state, include an info box for future metrics, and provide buttons to `/flashcards`, `/multiple-choice`, `/rag`, and `/study-sets`.

Stats should come from Supabase once the database model supports them. Until then, use a pending/empty state rather than fake production data.

### Auth

The auth feature must allow register, login, logout, and session display.

Auth pages should not use the study sidebar.

Study generation routes stay public. Require login only when saving or reading user-specific persisted data.

### Study Sets

Authenticated users can create study sets, list their own study sets, open a detail page, see saved flashcards, and see saved multiple choice questions with the correct option marked.

Generated content is not saved automatically.

Saving is individual:

* saving one flashcard saves only that flashcard
* saving one multiple choice question saves only that question and its four options
* if the user wants to save all generated items, they save them one by one

### Flashcards

The flashcards feature must allow the user to enter a topic and level, generate exactly 10 cards, reveal answers, navigate one card at a time, see position, loading, errors, and retry.

After generation, the currently visible card can be saved into a selected study set.

### Multiple Choice

The multiple choice feature must allow the user to enter a topic, level, and count (`5`, `10`, or `15`), generate questions with exactly 4 options, pick one option, see correct/incorrect feedback, navigate one question at a time, and retry after errors.

After generation, the currently visible question can be saved into a selected study set.

### RAG With Material

RAG is an authenticated feature separate from normal generation. It must not change the behavior of `/flashcards` or `/multiple-choice`.

Users can create, list, and delete text materials. The first version accepts pasted text only; do not add PDF parsing yet.

Material is split into 1,000-character chunks with 150-character overlap. Generate embeddings in batch through Ollama `/api/embed`, validate exactly 768 finite numbers per chunk, and persist them in Supabase pgvector.

Users can select between 1 and 10 of their own documents. Retrieval returns at most 8 chunks with similarity of at least `0.30` and must respect RLS.

RAG supports exactly 10 flashcards or `5`, `10`, or `15` multiple choice questions. Prompts must use only retrieved context and must not add external knowledge.

Generated RAG items are not persisted automatically. The visible flashcard or multiple choice question can be saved individually into an existing study set.

## Navigation

Routes:

```text
/
/flashcards
/multiple-choice
/rag
/rag/flashcards
/rag/multiple-choice
/study-sets
/study-sets/[id]
/login
/register
```

The study sidebar must let the user choose between Inicio, Flashcards, Opción múltiple, RAG con material, and Study sets.

The RAG section must provide internal navigation between Materiales, Flashcards, and Opción múltiple.

Auth routes (`/login`, `/register`) should render without the sidebar.

## Suggested Structure

Keep each feature separated:

```text
src/
|-- app/
|   |-- (auth)/
|   |-- (study)/
|   |   |-- flashcards/
|   |   |-- multiple-choice/
|   |   |-- rag/
|   |   `-- study-sets/
|   |-- api/
|   |   |-- flashcards/
|   |   |-- multiple-choice/
|   |   |-- rag/
|   |   `-- study-sets/
|   `-- layout.tsx
|
|-- components/
|   `-- AppSidebar.tsx
|
|-- features/
|   |-- auth/
|   |-- landing/
|   |-- study/
|   |-- study-sets/
|   |-- flashcards/
|   |-- multiple-choice/
|   `-- rag/
|
|-- lib/
|   |-- ollama.ts
|   |-- rag/
|   `-- supabase/
|
`-- proxy.ts
```

Do not create extra architecture unless it removes real duplication.

## Domain Types

Use TypeScript and avoid `any`.

Domain types live in:

```text
src/features/study/types.ts
src/features/flashcards/types.ts
src/features/multiple-choice/types.ts
src/features/study-sets/types.ts
src/features/landing/types.ts
src/features/rag/types.ts
```

Do not recreate domain types in route handlers or components when a feature type already exists.

## API Contracts

`POST /api/flashcards` generates exactly 10 flashcards from Ollama. It does not save them.

`POST /api/multiple-choice` generates exactly `count` multiple choice questions from Ollama. It does not save them.

`GET /api/study-sets` returns the authenticated user's study sets.

`POST /api/study-sets` creates a study set for the authenticated user.

`GET /api/study-sets/[id]` returns one study set with its saved flashcards and multiple choice questions.

`POST /api/study-sets/[id]/flashcards` saves one flashcard into one study set.

`POST /api/study-sets/[id]/multiple-choice` saves one multiple choice question and its four options into one study set.

`GET /api/rag/documents` returns the authenticated user's RAG materials.

`POST /api/rag/documents` accepts `{ name, content }`, chunks the text, generates embeddings, and persists one document with its chunks.

`DELETE /api/rag/documents/[id]` deletes one owned document and cascades to its chunks.

`POST /api/rag/flashcards` accepts `{ topic, level, documentIds }` and returns exactly 10 grounded flashcards.

`POST /api/rag/multiple-choice` accepts `{ topic, level, count, documentIds }` and returns grounded multiple choice questions.

## Validation

Validate input both client-side and server-side.

Topic and study set names must be strings, trimmed, non-empty, and 3-100 characters.

Level must be `primary`, `secondary`, or `university`.

Multiple choice count must be `5`, `10`, or `15`.

RAG material names must be 3-100 characters. Material content must be 100-50,000 characters and produce no more than 60 chunks.

RAG generation must receive 1-10 unique, valid document IDs owned by the authenticated user.

Do not call Ollama if generation validation fails.

Treat AI output as external and untrusted. Validate it before returning it to the client or saving it.

Validate Supabase writes server-side and rely on RLS for user ownership.

## AI Output

Generated content requirements:

* Spanish language
* appropriate for selected educational level
* concise answers
* no duplicate questions
* focus on understanding
* stay on the requested topic

RAG output must additionally be supported exclusively by retrieved material. If no selected chunk reaches the similarity threshold, return a useful error instead of asking the model to invent content.

Prefer structured JSON output through Ollama's `format` option.

Do not parse manually formatted prose using regex.

## Client State

Simple React state is enough. Do not introduce Redux or Zustand.

Auth state should come from Supabase session helpers, not from custom global stores.

## UI Language

User-facing text should be in Spanish. Code identifiers should generally remain in English.

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
Study sets
Guardar
Iniciar sesión
Registrarse
Cerrar sesión
```

## Security

Never expose secrets to the browser.

Do not log API keys or sensitive configuration.

Validate user input and AI output.

Do not put local model calls in Client Components.

Do not use Supabase service-role keys in this frontend app.

Use Supabase RLS for user-specific tables.

## Dependencies

Keep dependencies minimal.

Allowed persistence/auth dependencies:

```text
@supabase/supabase-js
@supabase/ssr
```

Prefer `fetch`, `useState`, Next.js Route Handlers, Tailwind, and Supabase helpers.

Do not add libraries only for convenience.

## Coding Style

Prefer simple, readable code. This is an academic project and the repository owner must be able to explain the implementation.

Avoid unnecessary abstractions. Do not rewrite unrelated files. Keep changes focused.

## Agent Workflow

Before changing code:

1. Inspect the repository.
2. Read this file.
3. Understand the existing implementation.
4. Modify only the files necessary for the requested task.

Do not add features that were not requested.

## Verification

After meaningful changes, run when appropriate:

```bash
npm run lint
npm run build
```

If verification cannot be performed, state that clearly.

## Definition of Done

The expanded app is complete when:

* `/` shows the landing/dashboard with session state and navigation buttons
* `/login` signs users in with Supabase Auth
* `/register` signs users up with Supabase Auth
* logout clears the session
* `/flashcards` works with 10 AI flashcards from Ollama
* `/multiple-choice` works with 5, 10, or 15 AI questions from Ollama
* `/rag` creates, lists, and deletes authenticated user materials
* `/rag/flashcards` generates 10 grounded flashcards from selected materials
* `/rag/multiple-choice` generates grounded questions from selected materials
* `/study-sets` lists and creates authenticated user study sets
* `/study-sets/[id]` shows saved flashcards and multiple choice questions
* generated items are saved one by one, never automatically as a batch
* the sidebar navigates between Inicio, Flashcards, Opción múltiple, RAG con material, and Study sets
* RAG embeddings use `nomic-embed-text`, task prefixes, and exactly 768 dimensions
* RAG retrieval cannot return another user's chunks
* invalid input is rejected
* loading and errors are handled
* retry works
* no model call runs in the browser
* Supabase helpers live only under `src/lib/supabase`
* TypeScript/lint/build succeed
* no unnecessary dependencies were added

## Core Rule

When unsure, prefer the simplest solution that supports these flows:

```text
Topic + level
    -> Flashcards
    -> Study one at a time
    -> Save selected cards one by one
```

```text
Topic + level + count
    -> Multiple choice questions
    -> Pick an option
    -> See correct/incorrect feedback
    -> Save selected questions one by one
```

```text
Study sets
    -> Create a set
    -> Open detail
    -> Review saved flashcards and multiple choice questions
```

```text
Authenticated user + selected materials
    -> Chunk and embed with Ollama
    -> Persist and retrieve with Supabase pgvector + RLS
    -> Generate grounded flashcards or multiple choice questions
    -> Save selected items one by one
```
