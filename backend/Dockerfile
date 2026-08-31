# ── Minimal production Dockerfile for VOJAS backend ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' ./prisma/schema.prisma
RUN npx prisma generate && npm run build

FROM node:20-alpine
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
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/v1/health || exit 1
CMD ["node", "dist/server.js"]
