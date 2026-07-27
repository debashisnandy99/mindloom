# Mindloom Server

Express + TypeScript API for Mindloom, a NotebookLM-style research workspace.
Sources are uploaded, indexed into Qdrant in the background, and surfaced
through seven study tools.

## Stack

| Concern | Choice |
| --- | --- |
| Runtime | Node 20+, ESM (`"type": "module"`) |
| Package manager | Bun |
| Framework | Express 4 |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Passport (Google + GitHub OAuth), cookie sessions in Redis |
| Queues | BullMQ on Redis — **two** queues (indexing + tool generation), run in a separate worker process |
| Vectors | Qdrant, one collection per notebook |
| Embeddings | OpenAI `text-embedding-3-large` (3072 dims) |
| Answer generation (RAG) | xAI Grok (`grok-4.5`) via the Vercel AI SDK, streaming + non-streaming |
| Tool generation | OpenAI (`gpt-4o-mini`) structured output via the AI SDK |
| Object storage | AWS S3 (PDFs only) |
| Live updates | Server-Sent Events fed by Redis pub/sub |

## Getting started

```bash
# 1. Infrastructure (Redis + Qdrant)
docker compose up -d          # from the repository root

# 2. Configuration
cp .env.example .env          # then fill in the secrets

# 3. Install and migrate
bun install
bun run db:migrate

# 4. Run both processes
bun run dev                   # API on :3000
bun run dev:worker            # worker: indexing + tool generation
# or: bun run dev:all         # both, in parallel
```

The worker is a **separate process on purpose**: chunking, embedding, uploading,
and LLM tool generation never touch the API event loop, so requests stay fast
while a large PDF is being indexed. It runs two BullMQ queues — indexing and
tool generation — in the one process.

### Scripts

| Script | Purpose |
| --- | --- |
| `bun run dev` | API with nodemon + tsx |
| `bun run dev:worker` | Worker (indexing + tool generation) with nodemon + tsx |
| `bun run dev:all` | API and worker together (parallel) |
| `bun run build` | `prisma generate` then `tsc` into `dist/` |
| `bun start` / `bun run start:worker` | Run the compiled output |
| `bun run typecheck` | Types only, no emit |
| `bun run db:migrate` / `db:reset` / `db:generate` / `db:studio` | Prisma |

### Development helpers

```bash
# Mint a signed session cookie without an OAuth round-trip
bunx tsx scripts/make-dev-session.ts you@example.com

# Publish a fake progress event to verify the SSE relay
bunx tsx scripts/publish-test-event.ts <notebookId> embedding 50
```

## Layout

```
src/
├── index.ts            http bootstrap + graceful shutdown
├── app.ts              middleware chain and route mounting
├── env.ts              zod-validated environment, fails fast at boot
├── config/             prisma, redis, qdrant, s3, session, passport
├── models/             Prisma data access (no Express types)
├── controllers/        request handling
├── routes/             URL surface, mounted under /api/v1
├── middlewares/        auth, validation, uploads, rate limits, errors
├── services/
│   ├── indexing/       queue, extractors, chunker, embedder, vector store
│   ├── retrieval/      RAG: query rewrite, RRF fusion, thresholding
│   ├── generation/     answer generation (xAI) + tool generation (OpenAI) queue/worker
│   ├── storage/        S3
│   └── sse/            Redis pub/sub to SSE fan-out
├── validators/         zod schemas
└── workers/            BullMQ worker entrypoint
```

## Indexing pipeline

```
POST /sources ─▶ [PDF only] S3 ─▶ Source row (PENDING) ─▶ BullMQ ─▶ 202 Accepted
                                                             │
                             worker: extract ▸ chunk ▸ embed ▸ upsert to Qdrant
                                                             │
                                    publish progress ─▶ Redis ─▶ SSE ─▶ client
```

Per source type:

| Type | Stored in `content` | Extraction |
| --- | --- | --- |
| `PDF` | S3 object URL | `pdf-parse`, one segment per page |
| `URL` | the URL | `cheerio` on the main content region |
| `YT` | the URL | transcript, grouped into 2-minute windows |
| `GDOC` | the URL | plain-text export endpoint |
| `TEXT` | the raw text | passthrough |

Chunks carry `sourceId`, `sourceName`, `sourceType`, `chunkIndex` and a page
number or timestamp where available, so citations can point at a location
rather than just a document.

## API

All routes are under `/api/v1`. Everything except `/auth/*` requires a session,
and notebook-scoped routes additionally verify ownership.

### Auth
```
GET    /auth/google              GET  /auth/google/callback
GET    /auth/github              GET  /auth/github/callback
GET    /auth/me                  GET  /auth/csrf
POST   /auth/logout
```

### Notebooks and sources
```
GET|POST          /notebooks
GET|PATCH|DELETE  /notebooks/:notebookId
GET               /notebooks/:notebookId/events        (SSE — indexing + tool events)
GET|POST          /notebooks/:notebookId/sources       (multipart for PDF)
GET|DELETE        /sources/:sourceId
POST              /sources/:sourceId/reindex
```

Adding, re-indexing, or deleting a source automatically re-queues generation of
every AI tool for that notebook (see [Tool generation](#tool-generation)).

### Retrieval (RAG)

```
POST   /notebooks/:notebookId/query          ask a question, persist + return a grounded answer
POST   /notebooks/:notebookId/query/stream   same, streamed over SSE (meta ▸ delta* ▸ done|error)
POST   /notebooks/:notebookId/search         raw chunk retrieval (no generation)
GET    /notebooks/:notebookId/suggestions    LLM-generated starter questions
GET    /notebooks/:notebookId/queries
DELETE /notebooks/:notebookId/queries/:queryId
```

Fully implemented. A query is rewritten into recall-friendly variants, each
variant is embedded and searched against the notebook's Qdrant collection, the
result lists are fused with Reciprocal Rank Fusion, and chunks below
`RETRIEVAL_MIN_SCORE` are dropped. If nothing clears the threshold the answer is
refused ("not in your sources") rather than hallucinated; otherwise xAI Grok
generates a grounded, `[n]`-cited answer over the retrieved passages. See
`src/services/retrieval/` and `src/services/generation/answer.service.ts`.

### AI-generated tools

```
GET    /notebooks/:notebookId/tools/status     per-tool generation status/progress
POST   /notebooks/:notebookId/tools/generate   manually re-queue generation of all tools
```

The six generated tools (mind map, quiz, concept table, flashcards, summary,
timeline) are produced by OpenAI structured output from the notebook's indexed
content, run as background BullMQ jobs, with live progress over SSE. See
[Tool generation](#tool-generation) below.

### Tool CRUD

Each of `mindmap`, `quiz`, `concept-table`, `flashcards`, `summary`,
`audio-overview` and `timeline` exposes the same shape under
`/notebooks/:notebookId/<tool>`:

```
GET     /            read the artifact (null when absent)
POST    /            create or replace
PUT     /            create or replace
DELETE  /            remove
POST    /<items>              append one child
PATCH   /<items>/:itemId      update one child
DELETE  /<items>/:itemId      remove one child
```

Child collections are `nodes`, `questions`, `rows`, `cards`, `points` and
`events` respectively. `audio-overview` is a single record with no children.

## Tool generation

Six tools — mind map, quiz, concept table, flashcards, summary, timeline — are
generated by an LLM from the notebook's indexed chunks (`audio-overview` is
out of scope). Generation runs on a **second BullMQ queue** (`tool-generation`)
processed by the same worker process as indexing.

- **Trigger** — automatic whenever sources change (`regenerateNotebookTools`),
  or manual via `POST /tools/generate`.
- **Revisioning** — each tool's `ToolGeneration` row carries a `revision`;
  queuing bumps it, so a job whose revision is stale (a newer source edit landed
  mid-generation) aborts instead of overwriting fresher output.
- **Status** — `IDLE → QUEUED → PROCESSING → READY | FAILED`, with `progress`
  (0–100) streamed to the client as `tool` SSE events on the notebook channel.
- **Generation** — `generateObject` (Vercel AI SDK) with a per-tool Zod schema
  and OpenAI `TOOL_GENERATION_MODEL`; context is capped at `TOOL_CONTEXT_BUDGET`
  characters of source chunks. On worker startup, rows still `QUEUED` are
  re-enqueued (`requeueQueuedToolGenerations`).

## Responses

```jsonc
// success
{ "success": true, "data": { /* ... */ } }

// failure
{ "success": false, "message": "Request validation failed",
  "errors": [{ "path": "body.name", "message": "Too small" }] }
```

## Security

`helmet`, CORS locked to `CLIENT_URL` with credentials, `hpp`, body size caps,
per-user rate limits, `httpOnly` + `sameSite` session cookies backed by Redis,
zod validation on every write, and optional double-submit CSRF
(`ENABLE_CSRF=true`). Uploads are restricted to PDFs under `MAX_UPLOAD_MB`.
