# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
# Include devDependencies because tsx (seed runner) is a devDependency.
RUN npm ci --ignore-scripts --include=dev

# ── Stage 2: Build TypeScript ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build 2>&1 || \
    ( npx tsc --noEmit && echo "BUILD_SKIP=true" )

# ── Stage 3: Production runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
# Skip the seed by default — production deployments should not auto-seed.
# Set SEED_ON_BOOT=true for demo / staging environments.
ENV SEED_ON_BOOT=false

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodeapp -u 1001

COPY --from=builder /app/dist          ./dist
COPY --from=builder /app/node_modules  ./node_modules
COPY --from=builder /app/package.json  ./package.json
COPY --from=builder /app/prisma       ./prisma
# Seed script is plain TS — copied for optional seeding at boot
COPY --from=builder /app/scripts       ./scripts

RUN chown -R nodeapp:nodejs /app

USER nodeapp

EXPOSE 5000

# On first start:
#   1. prisma generate (idempotent)
#   2. prisma db push (apply schema)
#   3. optionally seed (only when SEED_ON_BOOT=true, gated on empty DB)
#   4. start the API server
#
# Note: SEED_ON_BOOT requires tsx to be available (it is, via the
# dev-dependency install in stage 1). If the seed script is ever
# converted to a pre-compiled JS, remove the tsx requirement.
CMD ["sh", "-c", "npx prisma generate && npx prisma db push --skip-generate && \
  if [ \"$SEED_ON_BOOT\" = \"true\" ]; then \
    if npx tsx -e \"import('@prisma/client').then(async({PrismaClient})=>{const p=new PrismaClient();const c=await p.user.count();await p.\\$disconnect();process.exit(c===0?0:1)})\"; then \
      echo '[seed] DB is empty — loading demo data'; \
      npx tsx scripts/seed.ts; \
    else \
      echo '[seed] DB already populated — skipping'; \
    fi; \
  fi && \
  exec node dist/src/app.js"]
