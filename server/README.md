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
| Queue | BullMQ on Redis, run as a separate worker process |
| Vectors | Qdrant, one collection per notebook |
| Embeddings | OpenAI `text-embedding-3-large` (3072 dims) |
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
bun run dev:worker            # indexing worker
```

The worker is a **separate process on purpose**: chunking, embedding and
uploading never touch the API event loop, so requests stay fast while a large
PDF is being indexed.

### Scripts

| Script | Purpose |
| --- | --- |
| `bun run dev` | API with nodemon + tsx |
| `bun run dev:worker` | Indexing worker with nodemon + tsx |
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
│   ├── retrieval/      RAG stubs
│   ├── generation/     tool generation stubs
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
GET               /notebooks/:notebookId/events        (SSE)
GET|POST          /notebooks/:notebookId/sources       (multipart for PDF)
GET|DELETE        /sources/:sourceId
POST              /sources/:sourceId/reindex
```

### Tools

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

### Retrieval

```
POST   /notebooks/:notebookId/query     persists the question, returns the answer
POST   /notebooks/:notebookId/search    raw chunk retrieval
GET    /notebooks/:notebookId/queries
DELETE /notebooks/:notebookId/queries/:queryId
```

`retrieveRelevantChunks` and `answerQuery` in
`src/services/retrieval/retrieval.service.ts` are intentional stubs; the
endpoints are wired and return empty results until they are implemented. Tool
*generation* is likewise stubbed in `src/services/generation/`, while all tool
CRUD is complete.

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
