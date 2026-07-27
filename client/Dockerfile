# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Build stage — build the Vite SPA. VITE_API_URL is baked in at build time,
# so it is a build ARG, not a runtime env var.
# Build context is the REPO ROOT (see .dockerignore / Jenkinsfile).
# ─────────────────────────────────────────────────────────────────────────────
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN bun install --frozen-lockfile

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY client ./client
RUN cd client && bun run build

# ─────────────────────────────────────────────────────────────────────────────
# Runtime stage — serve the static build with nginx (SPA history fallback).
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
