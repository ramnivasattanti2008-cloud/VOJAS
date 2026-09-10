# Root Dockerfile for VOJAS Monorepo Backend API Deployment
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Install monorepo dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma DB Client and build shared packages
RUN pnpm --filter @vojas/db exec prisma generate
RUN pnpm --filter @vojas/shared build
RUN pnpm --filter @vojas/domain build

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["pnpm", "--filter", "@vojas/api", "dev"]
