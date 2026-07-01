# Multi-stage build for the NestJS API. Build context is the REPO ROOT (monorepo),
# so Railway/docker must be pointed at the root with -f apps/api/Dockerfile.
# syntax=docker/dockerfile:1

# ---- Base: pnpm on Node 24 ----
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# openssl is required by Prisma engines at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# ---- Dependencies: install the full workspace (cached on lockfile) ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---- Build: generate Prisma client, compile TS ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter api db:generate
RUN pnpm --filter api build
# Prune dev dependencies for a lean runtime node_modules.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter api --prod deploy /app/pruned

# ---- Runtime: minimal image with compiled output + prod deps ----
FROM base AS runtime
ENV NODE_ENV=production
# Non-root user for the runtime process.
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nodejs
COPY --from=build --chown=nodejs:nodejs /app/pruned/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/apps/api/dist ./dist
# Prisma schema + migrations travel with the image so `migrate deploy` can run from here.
COPY --from=build --chown=nodejs:nodejs /app/apps/api/prisma ./prisma
USER nodejs
EXPOSE 3001
# Railway sets PORT; main.ts reads process.env.PORT (defaults to 3001).
CMD ["node", "dist/main"]
