<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project

This is a small EdTech study application powered by a local AI model through Ollama, with Supabase for authentication, database storage, and persistence.

The app has these main sections:

1. Inicio: a landing/dashboard with session state, real multiple-choice stats, and shortcuts to study modes.
2. Flashcards: a student enters a topic and level, receives exactly 10 question/answer flashcards, and studies them one at a time.
3. Opción múltiple: a student enters a topic, level, and question count, receives questions with four options, selects an answer, and sees whether it was correct.
4. RAG con material: authenticated users paste notes or upload PDF/TXT files, select documents, and generate grounded flashcards or multiple-choice questions.
5. Study sets: authenticated users create study sets and save selected generated items into them.
6. Autenticación: users register, log in, and log out with Supabase Auth.

Authenticated multiple-choice generation is adaptive. It uses persisted performance for the manually entered topic and educational level to choose a difficulty mix. Standard and RAG multiple-choice answers feed the same progress history.

The project may grow, but it should remain simple enough for an academic project. Do not add knowledge graphs, automatic weak-topic selection, topic importance controls, or sophisticated knowledge tracing unless explicitly requested.

## Stack

Use Next.js App Router, React, TypeScript, Tailwind CSS, Ollama local API, Supabase Auth/database, and native `fetch`.

Use Node.js 22 or newer because the PDF parser requires it.

Do not add a separate backend or Express. Use Next.js Route Handlers under `src/app/api/`.

## AI Provider

Use Ollama through its local HTTP API.

```text
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

These variables are optional because the app uses those defaults when missing.

`OLLAMA_MODEL` generates study content. `OLLAMA_EMBEDDING_MODEL` creates the 768-dimensional vectors used by RAG.

Never call Ollama directly from the browser. The browser calls a Route Handler, and the Route Handler calls Ollama.

Generation uses at most two Ollama calls. Flashcards request 12 candidates, keep the first 10 valid unique cards, and make one completion call only when needed. Multiple-choice requests the exact public count and makes one positional repair call only for invalid or duplicate questions, preserving each adaptive difficulty slot. Connectivity and missing-model errors are returned immediately instead of retried.

For `nomic-embed-text`, prefix stored chunks with `search_document:` and retrieval queries with `search_query:`. Always use the same embedding model and dimension when indexing and searching.

## Supabase

Use Supabase for authentication, sessions, persistence, answer history, and dashboard stats.

Required environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

These are publishable browser credentials, but `.env.local` must remain uncommitted. `.env.example` contains placeholders only.

Use helpers under `src/lib/supabase/`. Use `src/proxy.ts` for session refresh because Next.js 16 renamed Middleware to Proxy. Do not create duplicate helpers under `src/utils/supabase`.

Authentication mutations (`login`, `register`, and `logout`) use Server Actions so cookie updates and redirects happen in one server-side flow. Preserve a safe internal `next` destination and never combine client-side `router.push()` with `router.refresh()` after authentication.

The Next.js server must have outbound HTTPS access to the configured Supabase project. If that connection is blocked, server-side login and claim verification cannot work; report it as a temporary service error rather than invalid credentials or a logout.

Server-side authorization must use `supabase.auth.getClaims()`, not `getUser()` or an untrusted `getSession()`. Model session checks with three distinct states:

* `authenticated`: verified claims include a user id
* `anonymous`: the session is missing or definitively invalid
* `unavailable`: Supabase, JWKS, or the network temporarily failed

Only `anonymous` may redirect to `/login`. An `unavailable` result must preserve cookies and show a retry state on pages, or return `503` from APIs. Authenticated APIs return `401` only when the session is absent. Server-side Supabase requests use an abortable 10-second timeout.

Keep the Proxy matcher limited to routes that read or refresh session state. Do not run session verification for `/login`, `/register`, static assets, or public pages that do not consume authentication.

## Supabase Migrations

Use the locally installed Supabase CLI with Windows commands:

```bash
npx.cmd supabase ...
```

Migration workflow:

* Run `npx.cmd supabase db pull` only when the remote schema changed outside this repository.
* When a schema change starts here, create a local migration and apply it with `db push`.
* Always run `npx.cmd supabase db push --dry-run` before `npx.cmd supabase db push`.
* Commit migrations and `supabase/config.toml`.
* Never commit tokens, database passwords, `.env.local`, connection strings, or `supabase/.temp`.

## Supabase Tables

Existing persisted content:

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
```

RAG persistence:

```text
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

Adaptive learning persistence:

```text
multiple_choice_attempts
  id uuid primary key
  user_id uuid references auth.users.id
  question_instance_id uuid
  topic text
  topic_key text
  education_level text
  source text
  difficulty text
  question text
  selected_option_index smallint
  correct_option_index smallint
  is_correct boolean generated
  created_at timestamptz

multiple_choice_topic_progress (security-invoker view)
  user_id uuid
  topic text
  topic_key text
  education_level text
  total_attempts bigint
  correct_answers bigint
  incorrect_answers bigint
  mastery double precision
  last_answered_at timestamptz
```

`study_sets.topic` is the display name of the set. `multiple_choice_options.answer` is the real database column even when UI types expose it as `text`.

RAG chunks inherit ownership through `rag_documents.user_id`. Deleting a document cascades to its chunks. Use `match_rag_chunks` as a `SECURITY INVOKER` RPC and keep its user, document, model, threshold, and count filters.

Multiple-choice attempts are unique by `(user_id, question_instance_id)`. Progress is grouped by normalized topic plus educational level. RLS is mandatory for all user-owned data, and `anon` must not access RAG or adaptive-learning rows.

## Feature Scope

### Inicio

The landing at `/` welcomes the user, shows session state, and links to `/flashcards`, `/multiple-choice`, `/rag`, and `/study-sets`.

For authenticated users, multiple-choice stats come from Supabase: correct answers, total attempts, global accuracy, and unique topics practiced. Do not use mock production stats. Users without history see zero values and an empty accuracy state; anonymous users see the login invitation.

### Auth

Support register, login, logout, and session display. Auth pages do not use the study sidebar.

Login and register read `next` on the server, accept only internal paths beginning with a single `/`, and use `/` as fallback. Auth forms use `useActionState` only for pending and error UI; they do not instantiate the browser Supabase client.

Standard study generation stays public. Login is required for RAG, study sets, adaptive generation, and persisted attempt history. Anonymous multiple-choice generation remains non-adaptive and does not save answers.

### Study Sets

Authenticated users can create and list their own sets, open details, and review saved flashcards and multiple-choice questions with the correct option marked.

Generated content is never saved automatically. Save only the currently selected item; saving all items requires saving them one by one.

### Flashcards

Allow topic and level input, generate exactly 10 cards, reveal answers, navigate one at a time, show position/loading/errors, and retry. The visible card can be saved individually.

### Multiple Choice

Allow topic, level, and count (`5`, `10`, or `15`), exactly four options per question, one selection, feedback, navigation, loading/errors, retry, and individual study-set saving.

For authenticated users:

* normalize topics so casing, repeated whitespace, and accents do not split progress
* keep progress separate for each educational level
* persist the first answer to each generated question idempotently
* show feedback immediately, save in the background, and offer a retry when persistence fails
* use standard and RAG answers in the same mastery calculation

Adaptive difficulty is relative to the selected educational level and uses lifetime accuracy:

* fewer than 5 attempts: 100% medium
* mastery below `0.40`: 70% easy and 30% medium
* mastery from `0.40` through `0.75`: 20% easy, 60% medium, and 20% hard
* mastery above `0.75`: 30% medium and 70% hard

The exact integer distributions for counts `5`, `10`, and `15` are generated server-side. Adaptation remains invisible in the UI; do not add user controls or labels for its internals.

### RAG With Material

RAG is authenticated and separate from normal generation. Materials can come from pasted text, a UTF-8 TXT file, or a PDF with selectable text.

File extraction is server-side only. Use `unpdf` for PDF text extraction and never parse documents in Client Components. PDF uploads are limited to 5 MB, 50 pages, 50,000 extracted characters, and 60 chunks. PDF text extraction must enforce a 15-second timeout and release PDF resources afterward.

OCR and scanned-image PDF support are out of scope. Return a useful error when a PDF does not contain enough selectable text. Do not store original PDF or TXT binaries in Supabase Storage; discard them after extraction and persist only the existing document metadata, chunks, and embeddings.

Split material into 1,000-character chunks with 150-character overlap. Generate embeddings in batch through Ollama `/api/embed`, validate exactly 768 finite numbers per chunk, and persist them in Supabase pgvector.

Users can select 1-10 owned documents. Retrieval returns at most 8 chunks with similarity at least `0.30` and respects RLS. RAG prompts use only retrieved context and must not invent unsupported answers.

RAG generates exactly 10 flashcards or `5`, `10`, or `15` multiple-choice questions. RAG multiple-choice uses the same adaptive difficulty engine and attempt history as standard multiple-choice.

## Navigation

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

The sidebar links Inicio, Flashcards, Opción múltiple, RAG con material, and Study sets. RAG has internal navigation between Materiales, Flashcards, and Opción múltiple. Auth routes render without the sidebar. Do not create a separate adaptive route.

## Suggested Structure

```text
src/
|-- app/
|   |-- (auth)/
|   |-- (study)/
|   `-- api/
|-- components/
|-- features/
|   |-- adaptive-learning/
|   |-- auth/
|   |-- flashcards/
|   |-- landing/
|   |-- multiple-choice/
|   |-- rag/
|   |-- study/
|   `-- study-sets/
|-- lib/
|   |-- rag/
|   `-- supabase/
`-- proxy.ts
```

Keep each feature separated, but do not create extra architecture unless it removes meaningful duplication.

## Domain Types

Use TypeScript and avoid `any`. Domain types belong to their feature, including `src/features/adaptive-learning/types.ts`. Do not recreate existing domain types in route handlers or components.

Keep Ollama output types separate from enriched API question types: Ollama returns only question text, options, and correct index; the server adds the question instance id and planned difficulty.

## API Contracts

* `POST /api/flashcards`: generate 10 cards; do not save automatically.
* `POST /api/multiple-choice`: generate the requested count and return `questions` plus `trackingEnabled`.
* `POST /api/multiple-choice/attempts`: idempotently persist one authenticated answer.
* `GET|POST /api/study-sets`: list or create owned study sets.
* `GET /api/study-sets/[id]`: return one owned set and its content.
* `POST /api/study-sets/[id]/flashcards`: save one card.
* `POST /api/study-sets/[id]/multiple-choice`: save one question and its four options.
* `GET|POST /api/rag/documents`: list or create owned materials; `POST` accepts JSON for pasted text or multipart form data for PDF/TXT uploads.
* `DELETE /api/rag/documents/[id]`: delete one owned document and its chunks.
* `POST /api/rag/flashcards`: generate 10 grounded cards.
* `POST /api/rag/multiple-choice`: generate grounded adaptive questions and return `trackingEnabled: true`.

## Validation And AI Output

Validate client and server input. Topics and study-set names are trimmed and 3-100 characters. Level is `primary`, `secondary`, or `university`. Count is `5`, `10`, or `15`.

RAG material names are 3-100 characters. Pasted or extracted content is 100-50,000 characters and produces at most 60 chunks. File uploads accept only `.pdf` and `.txt`; validate size, extension, MIME type, PDF signature, PDF page count, and UTF-8 decoding server-side. RAG generation receives 1-10 unique owned document UUIDs.

Treat AI output as untrusted. Require Spanish, the requested topic and level, no duplicate questions/options, concise content, exactly four options, and a valid correct index. Prefer Ollama structured JSON and never parse prose with regex.

## Client State And UI

Use simple React state; do not add Redux or Zustand. Auth state comes from Supabase helpers.

User-facing text is Spanish and code identifiers are generally English. Keep the existing restrained zinc/teal visual system, small radii, responsive layouts, and accessible loading/error/focus states.

## Security

Never expose secrets or call Ollama from Client Components. Do not use a Supabase service-role key in this app. Validate all writes server-side and rely on RLS for ownership.

Adaptive metrics are self-study telemetry, not tamper-proof credentials. If verifiable assessment is introduced later, correct answers must no longer be sent before submission and generated questions must be persisted server-side.

## Dependencies And Style

Keep dependencies minimal. Allowed persistence/auth packages are `@supabase/supabase-js` and `@supabase/ssr`; `unpdf` is the only document-parsing dependency. Prefer native `fetch`, React state, Route Handlers, Tailwind, and existing helpers.

Prefer simple, readable code that the repository owner can explain. Avoid unrelated rewrites and unnecessary abstractions.

## Agent Workflow

Before changing code, inspect the repository, read this file, understand the current implementation, and modify only files needed for the request.

After meaningful changes, run:

```bash
npm.cmd run lint
npm.cmd run build
```

For schema changes, also run the migration dry run and push workflow. State clearly if verification cannot be completed.

For authentication changes, verify that `src/` contains no `auth.getUser()` route guards, that temporary Supabase failures do not redirect users to login, and that login performs one server redirect rather than a client push followed by refresh.

## Definition Of Done

The app is complete when auth, normal generation, RAG from pasted text/PDF/TXT, study sets, and individual saving continue working; authenticated normal and RAG answers are persisted idempotently; difficulty mixes follow mastery thresholds; anonymous quizzes remain public and untracked; landing stats are real; temporary Auth failures preserve the session and offer retry; RLS isolates users; invalid input and AI output are rejected; retries work; and lint/build succeed.

## Core Flows

```text
Authenticated topic + level + count
    -> Read progress for normalized topic and level
    -> Build hidden difficulty mix
    -> Generate questions with Ollama
    -> Answer with immediate feedback
    -> Persist one idempotent attempt
    -> Use updated mastery on the next generation
```

```text
Authenticated user + selected materials
    -> Retrieve owned RAG context
    -> Apply the same adaptive difficulty mix
    -> Generate grounded questions
    -> Persist answers in shared progress history
```
