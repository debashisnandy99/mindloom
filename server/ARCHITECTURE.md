# Mindloom Server — Architecture

How the backend actually works, derived from the source in `server/src`. This
is the "how it runs" companion to [`README.md`](./README.md) (which covers
setup and the API surface).

Mindloom is a NotebookLM-style research workspace: a user signs in with OAuth,
creates **notebooks**, adds **sources** (PDF / URL / YouTube / Google Doc /
pasted text), and the backend indexes those sources into a per-notebook vector
collection so they can later be queried and turned into study **tools**
(mind map, quiz, flashcards, etc.).

---

## 1. Two processes, one codebase

The system runs as **two separate Node processes** that share the same `src/`
tree and talk to each other only through **Redis** and **Postgres** — never in
memory.

```
┌─────────────────────────┐         ┌─────────────────────────┐
│      API process        │         │     Worker process      │
│   (src/index.ts)        │         │ (src/workers/           │
│                         │         │      indexing.worker.ts)│
│  Express HTTP server    │         │  BullMQ Worker          │
│  - REST + SSE           │         │  - extract → chunk →    │
│  - enqueues jobs        │         │    embed → upsert       │
│  - subscribes to SSE    │         │  - publishes progress   │
└───────────┬─────────────┘         └───────────┬─────────────┘
            │                                     │
            │   BullMQ (jobs)  +  Pub/Sub (events)│
            └──────────────┬──────────────────────┘
                           ▼
        ┌────────┐  ┌────────┐  ┌────────┐  ┌──────┐
        │ Redis  │  │Postgres│  │ Qdrant │  │  S3  │
        │queue + │  │ Prisma │  │vectors │  │ PDFs │
        │session+│  │        │  │        │  │      │
        │pub/sub │  │        │  │        │  │      │
        └────────┘  └────────┘  └────────┘  └──────┘
```

Why split: chunking, embedding (network calls to OpenAI), and S3 uploads are
slow and CPU/IO-heavy. Keeping them in a dedicated worker means the API event
loop stays responsive while a large PDF is being indexed. `POST /sources`
returns `202 Accepted` almost immediately; the actual work happens out of band.

- **API** — `bun run dev` → `src/index.ts` → `createApp()` in `src/app.ts`.
- **Worker** — `bun run dev:worker` → `src/workers/indexing.worker.ts`.

Both register `SIGINT`/`SIGTERM` handlers for **graceful shutdown**: the API
stops accepting connections, drains SSE clients, closes the queue, and
disconnects Postgres/Redis; the worker calls `worker.close()` which waits for
in-flight jobs so a restart never drops work.

---

## 2. Backing services

| Service | Role | Config |
| --- | --- | --- |
| **PostgreSQL** | Source of truth for users, notebooks, sources, queries, and all tool artifacts. Accessed via Prisma 7 with the `@prisma/adapter-pg` driver adapter (pool max 10). | `config/prisma.ts` |
| **Redis** | Three distinct uses: (1) BullMQ job queue, (2) session store via `connect-redis`, (3) pub/sub channel for indexing progress events. | `config/redis.ts` |
| **Qdrant** | Vector database. **One collection per notebook** (`notebook_<uuid>`), cosine distance, `sourceId` payload index for per-source filter/delete. | `config/qdrant.ts`, `services/indexing/vectorStore.ts` |
| **AWS S3** | Stores uploaded **PDF files only**. The bucket stays private; reads go through time-limited presigned URLs. | `config/s3.ts`, `services/storage/s3.service.ts` |
| **OpenAI** | Embeddings (`text-embedding-3-large`, 3072 dims). Batched at 64 texts/request. | `services/indexing/embedder.ts` |

Redis needs **multiple connections** because of protocol constraints, all
minted from `config/redis.ts`:
- `redis` — shared connection for sessions and general commands.
- `createQueueConnection()` — BullMQ requires `maxRetriesPerRequest: null`.
- `createSubscriber()` / `createPublisher()` — a Redis connection in subscriber
  mode can't issue normal commands, so pub and sub each need their own.

Environment is validated once at boot by **Zod** in `src/env.ts`; a missing or
malformed variable fails the process fast with a printed list of issues.

---

## 3. Request lifecycle (API process)

`createApp()` in `app.ts` builds the middleware chain in this order:

1. `trust proxy` + disable `x-powered-by`.
2. **helmet** (CSP off — this is a JSON/SSE API), CORS locked to `CLIENT_URL`
   with credentials, `X-CSRF-Token` exposed.
3. **compression** — explicitly disabled for `text/event-stream` (compressing
   an SSE stream buffers it and breaks live delivery).
4. Body parsers (`json`/`urlencoded`, 1 MB cap), `cookie-parser`, `hpp`.
5. **pino-http** request logging (skips `/health`).
6. **session** (`express-session` + RedisStore) → `passport.initialize()` →
   `passport.session()`.
7. `GET /health` (liveness, no auth).
8. `/api/v1` → `apiLimiter` → the router tree.
9. `notFoundHandler` → `errorHandler` (last).

### Route tree (`routes/index.ts`)

```
/api/v1
├── /auth                      → auth.routes.ts        (public)
├── /notebooks   requireAuth   → notebook.routes.ts
│   └── /:notebookId  loadNotebook (ownership check)
│       ├── GET/PATCH/DELETE            notebook CRUD
│       ├── /events        (SSE)        indexing stream
│       ├── /sources                    nested source router (create/list)
│       ├── /queries, /query, /search   retrieval (see §6)
│       └── /<tool>                     7 tool routers (see §5)
└── /sources     requireAuth   → source.routes.ts
    └── /:sourceId  loadSourceNotebook  (ownership via parent notebook)
        ├── GET/DELETE
        └── /reindex
```

### Auth & ownership

- **`requireAuth`** — rejects unless `req.isAuthenticated()` and `req.user` are
  present.
- **`loadNotebook`** — resolves `:notebookId`, 404s if missing, **403s if
  `notebook.ownerId !== req.user.id`**, then attaches `req.notebook` so
  downstream handlers never re-check ownership.
- **`loadSourceNotebook`** — same guarantee for `/sources/:sourceId`, walking
  up to the owning notebook.

Tool child routes (e.g. deleting one quiz question) re-verify ownership by
walking the child back to its notebook (`assertItemInNotebook` in the tool
factory) — so you can't mutate another notebook's child by guessing its id.

### Authentication (Passport, `config/passport.ts`)

Google and GitHub OAuth strategies. On callback, `findOrCreateUserFromOAuth`
(`models/account.model.ts`) **matches on email first**, so signing in with both
Google and GitHub lands on the *same* `User`, with one linked `Account` row per
provider. The user id is serialized into the session; `deserializeUser` loads
the user each request (a deleted user resolves to `false`, not an error).
Sessions live in Redis (`mindloom:sess:` prefix, rolling, 7-day TTL);
successful login redirects the browser to `CLIENT_URL/notebooks`.

### Cross-cutting middleware

- **Validation** — `validate({ body })` runs a Zod schema on writes; failures
  become a structured 400 with per-field `errors`.
- **Rate limiting** (`rateLimit.middleware.ts`) — keyed by user id (falling back
  to IP), skipped entirely outside production. Tiers: general `apiLimiter`
  (600/15m), `authLimiter` (30/10m), `uploadLimiter` (60/hr — S3 + embedding
  spend), `queryLimiter` (30/min).
- **CSRF** (`csrf.middleware.ts`) — double-submit token, **off by default**
  (`ENABLE_CSRF=false`) since the session cookie is already SameSite-scoped;
  `csrfProtection` is a no-op passthrough until enabled.
- **Errors** — controllers throw `ApiError` (`.notFound()`, `.forbidden()`,
  `.conflict()`, …); `asyncHandler` forwards rejected promises to
  `errorHandler`, which shapes the uniform failure envelope.

### Response envelope (`utils/ApiResponse.ts`)

```jsonc
{ "success": true,  "data": { /* ... */ } }
{ "success": false, "message": "...", "errors": [ /* ... */ ] }
```

Helpers: `sendSuccess` (200), `sendCreated` (201), `sendAccepted` (202, used for
enqueued indexing), `sendNoContent` (204).

---

## 4. Indexing pipeline (the core flow)

This is the heart of the system — how a raw source becomes searchable vectors.

### Enqueue side (API)

`source.controller.ts::create` handles **all five source types on one URL**.
The nested source router branches on content type: `multipart/form-data` →
`multer` (memory storage, PDF-only, `MAX_UPLOAD_MB` cap) → the buffer is
streamed straight to S3; anything else → JSON validated by a Zod **discriminated
union** on `type`.

```
POST /notebooks/:id/sources
  ├─ PDF?  → uploadPdfToS3()   → content = S3 object URL, s3Key stored
  └─ else  → content = URL / raw text
  → createSource(...)          → Source row, status = PENDING
  → enqueueIndexingJob({ sourceId, notebookId, userId })
  → 202 Accepted { source }
```

The **`sourceId` is reused as the BullMQ job id** (`queue.ts`), so a rapid
re-index can't queue the same source twice. Jobs get 3 attempts with
exponential backoff; completed jobs are swept after an hour, failures kept 24h.

### Processing side (Worker)

`workers/indexing.worker.ts` runs a BullMQ `Worker` (concurrency =
`INDEXING_CONCURRENCY`, default 3) whose processor is
`services/indexing/processor.ts::processIndexingJob`:

```
1. load Source row (skip if it was deleted meanwhile)
2. status → PROCESSING          ── publish "extracting" 10%
3. extractSource(source)        ── publish "chunking"   30%
4. chunkDocument(...)           ── publish "embedding"  50%
5. embedTexts(chunk texts)      ── publish "storing"    85%
6. deleteSourceVectors() then upsertChunks()   (delete-before-write = idempotent re-index)
7. derivePreviews(fullText)     (cheap, no model call)
8. status → INDEXED, chunkCount, indexedAt, keyPoints, excerpts, meta
                                ── publish "completed"  100%
   on any throw: status → FAILED, errorMessage   ── publish "failed"
```

Every step publishes an `IndexingProgressEvent` to Redis (see §7), which is how
the browser sees a live progress bar. A failure sets the row to `FAILED` with a
human-readable `errorMessage` **and** re-throws so BullMQ records the attempt.

### Extraction — per source type (`services/indexing/extractors/`)

`extractSource` is a switch over `SourceType` that returns a common
`ExtractedDocument` — a list of **segments**, each carrying its own **locator**
metadata so citations can point at a *location*, not just a document.

| Type | Source of text | Segmentation | Locator preserved |
| --- | --- | --- | --- |
| `PDF` | S3 download → `pdf-parse` | one segment per page | `pageNumber` |
| `URL` | `cheerio` on the main content region | (page content) | — |
| `YT` | `youtube-transcript` (InnerTube) | grouped into 2-minute windows | `timestamp` / `startSeconds` |
| `GDOC` | plain-text export endpoint | — | — |
| `TEXT` | the raw pasted body | passthrough | — |

Scanned/imageonly PDFs (no selectable text) throw a clear error rather than
indexing nothing.

### Chunking (`chunker.ts`)

Each segment is normalised and split with LangChain's
`RecursiveCharacterTextSplitter` (`CHUNK_SIZE` 1000, `CHUNK_OVERLAP` 200). Every
chunk is **prefixed with a `Source: <name> (<type>)` header** so a chunk
retrieved in isolation still carries provenance, and every chunk inherits the
segment's locator plus `sourceId`, `notebookId`, `sourceName`, `sourceType`,
`chunkIndex`, `totalChunks`.

### Embedding (`embedder.ts`)

`text-embedding-3-large` at 3072 dims, batched (`EMBEDDING_BATCH_SIZE`), results
re-sorted by `index` because the API may return items out of order.

### Vector store (`vectorStore.ts`)

- `ensureCollection` — lazily creates the notebook's Qdrant collection on first
  write and adds a `sourceId` keyword payload index.
- `upsertChunks` — one point per chunk, random UUID id, full chunk metadata as
  payload.
- `deleteSourceVectors` — filtered delete by `sourceId` (used before re-index
  and on source delete).
- `searchChunks` — cosine top-K with optional `sourceId` filter (returns `[]` if
  the collection doesn't exist yet).
- `tryDelete*` variants — best-effort deletes so an unreachable Qdrant can't
  block a user from removing a notebook/source; orphaned vectors get swept
  later.

### Delete & re-index semantics

- **Re-index** (`reindex`) — 409s if already `PROCESSING`; otherwise removes the
  old job, resets the row to `PENDING`, re-enqueues. The processor's
  delete-before-upsert ensures no duplicate vectors.
- **Delete source** — remove queued job → best-effort delete vectors → delete S3
  object → delete row.
- **Delete notebook** — delete all its S3 objects → best-effort drop the whole
  Qdrant collection → cascade-delete the rows.

---

## 5. Study tools — factory-generated CRUD

There are **seven tools**: mind map, quiz, concept table, flashcards, summary,
audio overview, timeline. Six follow the identical shape — *one artifact per
notebook* (`@unique notebookId`) with *one ordered child collection*; audio
overview is a lone record with no children.

Rather than hand-write seven near-identical stacks, the CRUD is **generated from
one definition** at two layers:

- **`controllers/tools/toolController.factory.ts`** — `createToolHandlers(def)`
  produces `show / upsert / destroy / addItem / updateItem / removeItem`.
  `upsert` returns 201 vs 200 depending on whether the artifact already existed;
  item routes enforce notebook ownership via `findItem` + `assertItemInNotebook`.
- **`routes/tools/toolRouter.factory.ts`** — `createToolRouter(config)` mounts
  the uniform REST surface and wires each route to its Zod schema.

`controllers/tools/index.ts` instantiates the seven controllers by pairing the
factory with the matching Prisma model module (`models/tools/*`), and
`routes/tools/index.ts` mounts them under `/notebooks/:notebookId/<tool>`:

```
GET    /<tool>                read artifact (null when absent)
POST   /<tool>                create or replace whole artifact
PUT    /<tool>                create or replace whole artifact
DELETE /<tool>                remove artifact
POST   /<tool>/<items>            append one child
PATCH  /<tool>/<items>/:itemId    update one child
DELETE /<tool>/<items>/:itemId    remove one child
```

Child paths per tool: `nodes`, `questions`, `rows`, `cards`, `points`,
`events`. All tool CRUD is **fully implemented**.

---

## 6. Retrieval & generation — implemented vs stubbed

This is important to state plainly because the endpoints exist and return
success but do not yet do the AI work:

| Area | Status |
| --- | --- |
| Source indexing (extract→chunk→embed→store) | ✅ implemented |
| Vector search primitives (`searchChunks`, `embedQuery`) | ✅ implemented |
| Tool artifact CRUD (all 7) | ✅ implemented |
| **RAG retrieval / answering** (`services/retrieval/retrieval.service.ts`) | ⛔ **stub** — `retrieveRelevantChunks`, `answerQuery`, `streamAnswer` return empty |
| **Tool generation** (`services/generation/tool-generation.service.ts`) | ⛔ **stub** — `generate*` return `null` |

So `POST /notebooks/:id/query` today **persists the question** and its (empty)
citations to the `Query` / `QueryToSource` tables and returns an empty answer;
`POST /search` returns `[]`. The wiring, persistence, and schema are all in
place — only the model-driven middle is deferred. The building blocks it will
use (`embedQuery` + `searchChunks`) already exist in the indexing layer.

---

## 7. Live progress — Redis pub/sub → SSE

Because indexing runs in a *different process* from the one holding the
browser's connection, progress can't be pushed directly. The path is:

```
Worker (processor.ts)
  publishIndexingEvent(evt)
      │  Redis PUBLISH  indexing:notebook:<notebookId>
      ▼
API process (sse.service.ts subscriber)
  on "message" → fan out to every SSE client registered for that notebook
      │  res.write("event: indexing\ndata: {...}")
      ▼
Browser  EventSource( /notebooks/:id/events )
```

Details (`services/sse/sse.service.ts`, `controllers/events.controller.ts`):

- **Publisher** lives in the worker; **subscriber** lives in the API. One shared
  ioredis subscriber connection; the API subscribes to a notebook's channel only
  while it has ≥1 client, and unsubscribes when the last one disconnects.
- On connect, the events controller disables the socket timeout, sends a
  `connected` event, then an immediate **`snapshot`** of every source's current
  status — so a client that connects *after* a job finished still renders
  correct state (the live stream alone would have missed it).
- A 30s heartbeat comment (`: ping`) keeps proxies from closing idle streams.
- `res.on("close")` cleans up the client; graceful shutdown ends all streams.

---

## 8. Data model (Prisma, `prisma/schema.prisma`)

```
User ──< Account            (OAuth identities; email is the merge key)
User ──< Notebook
Notebook ──< Source         (PENDING → PROCESSING → INDEXED | FAILED)
Notebook ──< Query ──< QueryToSource >── Source   (chat history + citations)
Notebook ──1 MindMap        ──< MindMapNode
Notebook ──1 Quiz           ──< QuizQuestion
Notebook ──1 ConceptTable   ──< ConceptRow
Notebook ──1 FlashcardDeck  ──< Flashcard
Notebook ──1 Summary        ──< SummaryPoint
Notebook ──1 AudioOverview  (PENDING → PROCESSING → READY | FAILED)
Notebook ──1 Timeline       ──< TimelineEvent
```

Notes:
- Every child relation is `onDelete: Cascade` — deleting a user or notebook
  cleans up the whole subtree in one go (external stores are cleared separately,
  best-effort, *before* the cascade).
- `Source.content` is overloaded by type: an **S3 object URL** for PDF, the
  **link** for URL/YT/GDOC, the **raw body** for TEXT (documented in the schema).
- Indexing artifacts on `Source`: `status`, `chunkCount`, `indexedAt`,
  `errorMessage`, plus cheap derived `keyPoints` / `excerpts` for the viewer.
- Each tool artifact is `@unique` on `notebookId` (one per notebook); children
  carry an `order` field for stable UI ordering.

---

## 9. Directory map

```
src/
├── index.ts            API bootstrap + graceful shutdown
├── app.ts              middleware chain + route mounting
├── env.ts              Zod-validated env, fails fast at boot
├── config/             prisma, redis, qdrant, s3, session, passport
├── models/             Prisma data access (plain funcs, no Express types)
│   └── tools/          one module per tool artifact
├── controllers/        request handlers (+ tools/ factory)
├── routes/             URL surface under /api/v1 (+ tools/ factory)
├── middlewares/        auth, validate, upload, rateLimit, csrf, error, asyncHandler
├── validators/         Zod schemas
├── services/
│   ├── indexing/       queue, extractors/, chunker, embedder, vectorStore, processor
│   ├── retrieval/      RAG (stub)
│   ├── generation/     tool generation (stub)
│   ├── storage/        S3
│   └── sse/            Redis pub/sub → SSE fan-out
├── types/              shared indexing types, express augmentation
└── workers/            BullMQ worker entrypoint
```

Layering convention: **models** hold Prisma access and know nothing about
Express; **controllers** speak HTTP and delegate to models/services;
**services** hold the cross-cutting machinery (indexing, storage, SSE). The
`generated/prisma/` client is emitted by `prisma generate` into `src/`.

---

## 10. Boot & operational notes

- `bun run build` = `prisma generate` then `tsc` → `dist/`; run with
  `bun start` (API) and `bun run start:worker` (worker).
- Infra (`compose.yaml`) brings up **Redis** and **Qdrant** locally; Postgres
  and S3 are expected to be provided (managed or otherwise) via env.
- Dev helpers: `scripts/make-dev-session.ts` mints a signed session cookie
  without an OAuth round-trip; `scripts/publish-test-event.ts` injects a fake
  progress event to exercise the SSE relay end-to-end.
- Failure isolation: an unreachable Qdrant/S3 degrades gracefully on delete
  paths (best-effort), OpenAI failures fail the *job* (retried) not the API, and
  a crashed worker is safe to restart (in-flight jobs drain, others re-run).
```
