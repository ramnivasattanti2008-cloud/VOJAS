# Docker Deployment Guide

This guide covers running VOJAS locally with Docker Compose and deploying to production.

---

## Local Development with Docker Compose

Useful when you want to test the PostgreSQL production setup on your local machine.

```bash
# 1. Build and start all services
docker compose up --build

# 2. View logs
docker compose logs -f backend

# 3. Stop everything
docker compose down

# 4. Reset database (dangerous — wipes all data)
docker compose down -v
```

Frontend: **http://localhost**
Backend API: **http://localhost/api/v1**

---

## Switching Schema from SQLite to PostgreSQL

The schema is currently set to **SQLite** (for local dev). To switch to **PostgreSQL** for production:

### 1. Update `backend/prisma/schema.prisma`

```prisma
datasource db {
  // Switch to "postgresql" for production
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2. Update `backend/.env`

```bash
# Development (SQLite)
# Path is relative to the prisma schema file at backend/prisma/schema.prisma
# so ./dev.db resolves to backend/prisma/dev.db
DATABASE_URL=file:./dev.db

# Production (PostgreSQL — Docker)
DATABASE_URL=postgresql://vojas:vojas_dev_password@localhost:5432/vojas?schema=public
```

### 3. Regenerate Prisma client

```bash
cd backend
npx prisma generate
npx prisma db push        # Creates tables in PostgreSQL
npx prisma db seed        # Loads demo data
```

### 4. If migrating existing SQLite data

Use `prisma migrate dev` instead of `db push` for migration history, or use a data export/import tool.

---

## Production Environment Variables

When deploying to a cloud platform (Render, Railway, Fly.io, etc.), set these:

```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:password@host:5432/vojas
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
CLIENT_BASE_URL=https://your-domain.com
# Set true to seed demo data on first boot (staging/demo only)
SEED_ON_BOOT=false
```

---

## Build Images Separately

```bash
# Backend only
docker build -t vojas-backend ./backend

# Frontend only
docker build -t vojas-frontend ./frontend

# Full stack
docker compose build
```

---

## Monitoring

The backend exposes a health endpoint at `GET /api/v1/health` (no auth required).

### Basic health check

```bash
# Inside a container
docker compose exec backend wget -qO- http://localhost:5000/api/v1/health

# From host
curl http://localhost:5000/api/v1/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "checks": {
      "database": { "status": "connected", "latencyMs": 3 },
      "filesystem": { "writable": true, "uploadDir": "/app/uploads" }
    },
    "timestamp": "2026-08-31T...",
    "uptime": 1234
  }
}
```
Returns HTTP 200 when healthy, HTTP 503 when degraded.

### Container health check (Docker Compose)

The `db` service uses `pg_isready` as its healthcheck. The `backend` and `frontend` services restart automatically (`restart: unless-stopped`) but do not have a Docker healthcheck — rely on process exit codes instead.

### Log aggregation

```bash
# Tail all services
docker compose logs -f

# Tail a specific service
docker compose logs -f backend

# Last 50 lines of backend
docker compose logs --tail=50 backend
```

### Alerting (optional)

Point your monitoring tool at these signals:

| Signal | How to collect |
|---|---|
| Backend health | `curl http://backend:5000/api/v1/health` |
| Database connectivity | `pg_isready` or Prisma `db.stats()` |
| Backend error rate | Parse stdout/stderr logs for `ERROR` |
| Frontend availability | `curl http://frontend/` → expect HTTP 200 |

For production consider: **Grafana + Prometheus** (export `/metrics` from backend) or a managed APM (Datadog, Sentry for errors).

---

## Troubleshooting

**`connection refused` from backend to db:**
- Make sure the `db` service is healthy before `backend` starts (`depends_on` with `condition: service_healthy` handles this).

**Port 5432 already in use:**
- Change the port mapping: `"5433:5432"` in `docker-compose.yml`.

**`prisma db push` fails on first run:**
- Ensure `DATABASE_URL` in the backend container matches `POSTGRES_DB` in the `db` service.

**Nginx 502 Bad Gateway:**
- The backend isn't ready yet. The `depends_on: db: condition: service_healthy` ensures the DB is up, but the backend startup script also runs `db push` before starting the server — give it ~30 seconds. If `SEED_ON_BOOT=true`, seeding adds ~5 more seconds.

**`SEED_ON_BOOT` not seeding:**
- Make sure `tsx` is available in the backend container (it is when built with the provided Dockerfile). The seed script at `scripts/seed.ts` runs only when `SEED_ON_BOOT=true` AND the DB has zero users.
