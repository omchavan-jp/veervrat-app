# syntax=docker/dockerfile:1
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app/product-design/tooling

FROM base AS deps
COPY product-design/tooling/package.json product-design/tooling/pnpm-lock.yaml product-design/tooling/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/product-design/tooling/node_modules ./node_modules
COPY product-design/ /app/product-design/
RUN pnpm build --webpack

FROM node:24-slim AS d2
ARG D2_VERSION=v0.7.1
ARG TARGETARCH
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
  && mkdir -p /tmp/d2 \
  && curl -fsSL "https://github.com/d2lang/d2/releases/download/${D2_VERSION}/d2-${D2_VERSION}-linux-${TARGETARCH}.tar.gz" -o /tmp/d2.tar.gz \
  && tar -xzf /tmp/d2.tar.gz -C /tmp/d2 --strip-components=1 \
  && install -m 0755 /tmp/d2/bin/d2 /usr/local/bin/d2 \
  && /usr/local/bin/d2 version

FROM node:24-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nodejs
COPY --from=d2 /usr/local/bin/d2 /usr/local/bin/d2
COPY --from=build --chown=nodejs:nodejs /app/product-design/tooling/.next/standalone /app/
COPY --from=build --chown=nodejs:nodejs /app/product-design/tooling/.next/static /app/product-design/tooling/.next/static
COPY --from=build --chown=nodejs:nodejs /app/product-design/README.mdx /app/product-design/README.mdx
COPY --from=build --chown=nodejs:nodejs /app/product-design/00-governance /app/product-design/00-governance
COPY --from=build --chown=nodejs:nodejs /app/product-design/01-product-model /app/product-design/01-product-model
COPY --from=build --chown=nodejs:nodejs /app/product-design/tooling/content /app/product-design/tooling/content
USER nodejs
WORKDIR /app/product-design/tooling
EXPOSE 3000
CMD ["node", "server.js"]
