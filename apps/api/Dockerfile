# VOJAS API — production image.
#
# This is a pnpm WORKSPACE package (@vojas/api depends on @vojas/db,
# @vojas/domain, @vojas/shared via workspace:*), so the build context for
# this Dockerfile MUST be the monorepo root, not apps/api/ — the render.yaml
# service for this Dockerfile sets `dockerContext: .` for exactly that
# reason. Building with apps/api/ as context will fail: it cannot see
# packages/db, packages/domain, packages/shared, or pnpm-workspace.yaml.
#
# Local build/run from the repo root:
#   docker build -f apps/api/Dockerfile -t vojas-api .
#   docker run --rm -p 5000:5000 --env-file .env vojas-api

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# ---- deps: install with only the manifests present, so a source-only
# change below doesn't invalidate this (slow) layer. Every pnpm-workspace.yaml
# member needs its package.json present for `pnpm install --frozen-lockfile`
# to validate the lockfile, even members this image never builds.
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/api-client/package.json packages/api-client/package.json
RUN pnpm install --frozen-lockfile

# ---- build: full source (minus .dockerignore), generate the Prisma client,
# build the three workspace packages @vojas/api depends on, then @vojas/api
# itself. @vojas/api-client and @vojas/web are NOT built here — they're
# apps/web's dependencies, not this service's.
FROM deps AS build
COPY . .
RUN pnpm db:generate
RUN pnpm -r --filter @vojas/db --filter @vojas/shared --filter @vojas/domain build
RUN pnpm --filter @vojas/api build

# ---- runtime: the full workspace node_modules tree (this repo uses
# node-linker=hoisted in .npmrc — a single shared tree, not pnpm's default
# symlinked structure — so there is no separate lean "deploy" step that
# preserves correct module resolution; pruning it by hand risks reproducing
# the stale/duplicate-Prisma-client bug already found and fixed once this
# session). Image size is traded for correctness here.
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=5000
WORKDIR /app
COPY --from=build /app ./
EXPOSE 5000
# Matches apps/api/package.json's own "start" script (tsx, not plain node —
# the compiled ESM output needs tsx's loader; see that script for why).
CMD ["pnpm", "--filter", "@vojas/api", "start"]
