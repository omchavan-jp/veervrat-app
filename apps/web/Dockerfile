# Multi-stage build for the Next.js web app. Build context is the REPO ROOT (monorepo):
# point Railway/docker at the root with -f apps/web/Dockerfile.
# syntax=docker/dockerfile:1

# ---- Base: pnpm on Node 24 ----
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS build
# NEXT_PUBLIC_* is inlined into the browser bundle at BUILD time, so the API URL must be
# passed as a build arg (not just a runtime env var). Railway: set this as a build-time
# variable. Falls back to same-origin /api/v1 if omitted.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# API_ORIGIN is the proxy target for the /api/v1 rewrite (next.config.ts), baked
# into the build. Set it as a Railway build-time variable on the web service.
ARG API_ORIGIN
ENV API_ORIGIN=${API_ORIGIN}
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN pnpm --filter web build

# ---- Runtime: Next.js standalone server ----
FROM base AS runtime
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nodejs
# standalone output bundles a minimal server + node_modules; static/ and public/ are
# copied alongside it per Next.js docs.
COPY --from=build --chown=nodejs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nodejs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nodejs:nodejs /app/apps/web/public ./apps/web/public
USER nodejs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# standalone emits server.js at the workspace path.
CMD ["node", "apps/web/server.js"]
