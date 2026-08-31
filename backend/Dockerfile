# ── Stage 1: Install all dependencies (including devDeps for prisma + tsc) ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --include=dev

# ── Stage 2: Build TypeScript ─────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The committed schema.prisma is SQLite for local dev; swap to PostgreSQL for prod
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' ./prisma/schema.prisma && \
    echo "Swapped schema provider → postgresql"
RUN npx prisma generate && npm run build

# ── Stage 3: Production runtime ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

RUN chown -R nodeapp:nodejs /app
USER nodeapp
EXPOSE 5000

# Healthcheck: wait for the API to respond
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
