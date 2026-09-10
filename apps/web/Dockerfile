FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @vojas/shared build
RUN pnpm --filter @vojas/domain build
RUN pnpm --filter @vojas/api-client build
RUN pnpm --filter @vojas/web build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["pnpm", "--filter", "@vojas/web", "start"]
