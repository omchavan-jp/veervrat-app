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
# ⚠️ Build args here are BAKED INTO THE IMAGE, and CD promotes one image from UAT to prod
# without rebuilding. So nothing environment-specific may be passed here — it would make the
# promoted image carry UAT's values into production. That is not hypothetical: API_ORIGIN and
# NEXT_PUBLIC_SITE_URL used to be build args and did exactly that
# (documentation/21_Infrastructure-Conventions.md §17).
#
# Per-environment values are read at RUNTIME instead — see apps/web/lib/runtime-config.ts and
# the API_BASE_URL / SITE_URL / FEEDBACK_MODE env vars set on the Container App.
#
# The only value legitimately baked is the commit SHA: it describes the image itself, not the
# environment the image runs in. That is the test to apply before adding anything below.
ARG NEXT_PUBLIC_COMMIT_SHA=dev
ENV NEXT_PUBLIC_COMMIT_SHA=${NEXT_PUBLIC_COMMIT_SHA}
# In-context content editor. Deliberately still BUILD-time, and deliberately never passed by
# CD, so the editor is absent from every deployed bundle.
#
# This is the one case where build-time is the point rather than a bug: being inlined lets the
# bundler drop the editor's code entirely, so dev tooling never ships to users. Moving it to
# runtime config would put that code in the production bundle, gated only by a flag — a
# security posture change, not a refactor. D20 wants the editor available on UAT for Nachiket
# and never on prod, which one promoted image cannot express this way; resolving that belongs
# with B1's per-user capability model, not here.
ARG NEXT_PUBLIC_CONTENT_EDIT
ENV NEXT_PUBLIC_CONTENT_EDIT=${NEXT_PUBLIC_CONTENT_EDIT}
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
