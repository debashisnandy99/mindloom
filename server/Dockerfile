# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Build stage — install the whole Bun workspace, generate the Prisma client
# and compile the server TypeScript to dist/.
# Build context is the REPO ROOT (see .dockerignore / Jenkinsfile).
# ─────────────────────────────────────────────────────────────────────────────
FROM oven/bun:1 AS build
WORKDIR /app

# Workspace manifests first so `bun install` is cached until deps actually change.
COPY package.json bun.lock ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN bun install --frozen-lockfile

# Server sources (incl. prisma/schema.prisma) then build:
#   `bun run build` == `prisma generate && tsc -p tsconfig.json`
COPY server ./server
# prisma.config.ts resolves env("DATABASE_URL") at load time — even for
# `prisma generate`, which never connects. Provide a throwaway value scoped to
# this RUN so the build succeeds; the real URL is injected at runtime via the
# compose env_file. This placeholder is fake and never persists in the image.
RUN cd server && DATABASE_URL="postgresql://build:build@localhost:5432/build" bun run build

# ─────────────────────────────────────────────────────────────────────────────
# Runtime stage — plain Node (the app's `start` script uses `node`). Prisma 7
# with the pg driver adapter needs no query-engine binary at runtime; the CLI
# used for `migrate deploy` needs openssl.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/server

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

# Hoisted deps live at the workspace root; the server (dist, prisma, generated
# client) lives under /app/server. Copy both so module resolution still works.
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/server /app/server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:${PORT:-3000}/health || exit 1

# Default command runs the API. The worker service overrides this in compose:
#   command: ["node", "dist/workers/indexing.worker.js"]
CMD ["node", "dist/index.js"]
