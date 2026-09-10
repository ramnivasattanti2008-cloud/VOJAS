# Production image for the VOJAS backend API (@vojas/api).
#
# Build from the repository root:
#   docker build -f Dockerfile -t vojas-api .
#
# The image contains no secrets. Every credential (DATABASE_URL, JWT_SECRET,
# CDSE_*) is supplied by the platform at runtime. The container does not seed
# or migrate the database on startup — that is an explicit, separate operation.

FROM node:20-alpine AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Workspace manifests and sources. apps/web is copied so the workspace still
# matches every importer in pnpm-lock.yaml, but its dependencies are never
# installed — the install below is filtered to the API dependency graph.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages ./packages
COPY apps ./apps

# Install only @vojas/api and the workspace packages it depends on.
# --prod=false is explicit: pnpm drops devDependencies whenever NODE_ENV is
# "production", and the TypeScript compiler and @types/* live there, so a
# platform that presets NODE_ENV would otherwise fail the build with TS7016.
RUN pnpm install --frozen-lockfile --prod=false --filter @vojas/api...

# Prisma client must exist before the TypeScript builds that import it.
RUN pnpm --filter @vojas/db exec prisma generate

# Workspace packages first — @vojas/api resolves them from their dist output.
# `pnpm -r` builds them in dependency order (@vojas/domain imports @vojas/db,
# so a hand-written order silently produces TS2307 "cannot find module").
RUN pnpm -r --filter @vojas/db --filter @vojas/shared --filter @vojas/domain build \
 && pnpm --filter @vojas/api build

# Fail the build here rather than at container start if the entrypoint is missing.
RUN test -f apps/api/dist/server.js


FROM node:20-alpine AS runner

ENV NODE_ENV=production
# PORT is read by apps/api/src/server.ts; platforms that inject their own PORT
# override this default.
ENV PORT=5000

WORKDIR /app

COPY --from=builder --chown=node:node /app /app

USER node

EXPOSE 5000

CMD ["node", "apps/api/dist/server.js"]
