# VOJAS 2.0 — M1 Summary

## What M1 Implements

M1 (Milestone 1) is the foundational rebuild of VOJAS into a TypeScript monorepo with Next.js + Express. It establishes the package structure, shared domain logic, PostgreSQL schema with PostGIS, authentication, and core CRUD APIs.

### Package structure

- [x] Monorepo root with `pnpm workspaces`
- [x] `packages/shared` — enums, constants, utilities (used by FE and BE)
- [x] `packages/domain` — Zod schemas, domain services, provider interfaces, error types
- [x] `packages/db` — Prisma schema (PostgreSQL + PostGIS), seed data
- [x] `packages/api-client` — typed HTTP client for the frontend
- [x] `apps/web` — Next.js 15 App Router frontend
- [x] `apps/api` — Express.js API (existing backend, refactored to use shared packages)

### Data layer

- [x] PostgreSQL schema with all 40+ models (projects, reports, anomalies, expenditures, satellite observations, etc.)
- [x] PostGIS spatial indexes on `(latitude, longitude)` columns
- [x] Append-only audit log (`AuditLog`, `ProjectEvent`)
- [x] Provenance tracking (`source`, `sourceWorkId`, `sourceRef`) on all ingested records
- [x] Risk scoring model (`ProjectRisk` with 4-signal composition)

### Authentication & Authorization

- [x] JWT HS256 auth (7-day access token, 30-day refresh token with rotation)
- [x] bcrypt cost factor 12
- [x] RBAC middleware enforcing permissions per endpoint
- [x] Rate limiting (120/min general, 10/15min auth)
- [x] PII redaction service (non-ADMIN roles see redacted reporter data)
- [x] Security headers (helmet)

### API (Express)

- [x] REST API at `/api/v1/*` with consistent response format
- [x] Zod input validation on all endpoints (shared with Next.js via packages/domain)
- [x] Auth routes: register, login, logout, refresh
- [x] Project CRUD with filters, pagination, geospatial queries
- [x] Report submission with PII redaction
- [x] Anomaly detection with rule engine
- [x] Satellite observation ingestion (CDSE Sentinel-2, null provider in dev)
- [x] Expenditure tracking with vendor normalization
- [x] Document upload with magic byte verification
- [x] MP attribution and constituency queries
- [x] Audit logging for all state-changing operations

### Frontend (Next.js)

- [x] App Router pages (SSR for dashboard, RSC for data-heavy pages)
- [x] API routes as BFF layer (aggregates Express API data)
- [x] React Query hooks for client-side data fetching
- [x] Shared component library (Button, Input, Modal, DataTable, Panel, DonutChart)
- [x] Authentication pages (login, register)
- [x] Project list with filters
- [x] Project detail page with tabs (overview, financials, anomalies, documents, satellite)
- [x] Anomaly dashboard
- [x] Report submission form
- [x] i18n with 23 Indian languages (from Phase 52)

---

## What M1 Does NOT Implement

The following features exist in the current VOJAS 1.0 (Phases 1-53) but are deferred to M2+:

| Feature | Reason deferred |
|---|---|
| Interactive dashboard with charts | Will be built in Next.js with RSC; current Vite dashboard not migrated |
| 3D globe with GLSL shaders | Design investment deferred until dashboard wireframe is stable |
| Sentinel-2 analysis (NDVI/NDBI/BSI computation) | Provider interface exists; actual tile processing needs CDSE credentials |
| AI anomaly explanation | Provider interface exists; OpenAI integration deferred until provider is wired |
| Real-time notifications (WebSocket) | Polling via React Query is sufficient for MVP |
| Field inspection mobile app | Separate project; will be a distinct app consuming the same API |
| Public MP profile page | SEO considerations require SSR + metadata; deferred to M2 |
| PDF export (project reports) | `pdfkit` integration exists in current BE; not yet migrated to monorepo |
| Law enforcement escalation UI | API supports it; UI deferred to M2 |

---

## Package Dependencies

```
packages/shared
  └── (no dependencies)

packages/domain
  └── packages/shared
  └── packages/db (Prisma types only)

packages/db
  └── (no production dependencies — schema only)

packages/api-client
  └── packages/shared
  └── packages/domain

apps/api
  └── packages/domain
  └── packages/db
  └── packages/shared
  └── packages/api-client

apps/web
  └── packages/shared
  └── packages/domain
  └── packages/api-client
```

**Dependency rule**: `apps/*` depend on `packages/*`; `packages/*` do NOT depend on each other (except `domain` → `shared`, `api-client` → `domain`).

---

## Development Environment Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop (for PostgreSQL + PostGIS)
- Git

### Quick start

```bash
# 1. Clone and install
git clone https://github.com/your-org/vojas.git
cd vojas
pnpm install

# 2. Start PostgreSQL with PostGIS
docker-compose up -d postgres

# 3. Set up environment
cp apps/api/.env.example apps/api/.env
# Edit .env: set DATABASE_URL, JWT_SECRET

# 4. Run migrations
cd apps/api
npx prisma migrate dev --name init

# 5. Seed demo data
npx ts-node scripts/seed/seed.ts

# 6. Start development servers
# Terminal 1: Express API
pnpm --filter @vojas/api dev

# Terminal 2: Next.js frontend
pnpm --filter @vojas/web dev

# 7. Open browser
open http://localhost:3000
```

### Environment files

**`apps/api/.env`**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vojas_dev
JWT_SECRET=your-super-secret-key-at-least-32-chars
CLIENT_BASE_URL=http://localhost:3000
NODE_ENV=development
BCRYPT_ROUNDS=12
PORT=5000

# Optional: enable real providers
# SATELLITE_PROVIDER=cdse
# CDSE_CLIENT_ID=your-client-id
# CDSE_CLIENT_SECRET=your-client-secret
# AI_PROVIDER=openai
# OPENAI_API_KEY=sk-...
```

**`apps/web/.env.local`**
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: vojas_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5

  pgadmin:
    image: dpage/pgadmin4:latest
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@vojas.local
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - '5050:80'
    depends_on:
      - postgres

volumes:
  postgres_data:
```

---

## Running Tests

```bash
# All tests
pnpm test

# Unit tests only (fast, no DB)
pnpm test:unit

# Integration tests (requires PostgreSQL)
pnpm test:integration

# E2E tests (requires full dev stack running)
pnpm test:e2e

# Type checking
pnpm build

# Linting
pnpm lint
```

---

## Migration from VOJAS 1.0

VOJAS 1.0 (React + Vite + Express, Phases 1-53) continues to run at `frontend/` and `backend/`. The rebuild in `apps/web` and `apps/api` is parallel, not in-place.

**Migration strategy:**
1. New packages (`packages/*`) are built in isolation with their own tests
2. `apps/api` is a refactor of `backend/` — same Express server, same routes, imports from shared packages
3. `apps/web` is a rewrite of `frontend/` — same pages, new App Router, new hooks layer
4. Data layer (Prisma schema) is extended from `backend/prisma/schema.prisma` — no data loss
5. When `apps/web` + `apps/api` pass the smoke test suite, the old `frontend/` + `backend/` are archived

**Backward compatibility:**
- `apps/api` uses the same Prisma schema as `backend/`
- Same PostgreSQL database — no migration of existing data required
- Same `DATABASE_URL` — swap the running process, not the database

---

## Monorepo Commands Reference

```bash
# Install all packages
pnpm install

# Add a dependency to a package
pnpm --filter @vojas/domain add zod
pnpm --filter @vojas/web add react-query

# Run a script in a specific package
pnpm --filter @vojas/api dev
pnpm --filter @vojas/web build

# Type-check all packages
pnpm --filter '*' --parallel tsc --noEmit

# Lint all packages
pnpm --filter '*' --parallel eslint src --ext .ts,.tsx

# Add a new workspace package
mkdir packages/my-package
echo '"packages/*"' >> package.json
pnpm install
```

---

## Next Steps (M2)

M2 will build on M1's foundation to add:

1. **Interactive dashboard** — SSR charts, project health overview, anomaly trends
2. **MP profile pages** — public SSR pages with OpenGraph metadata
3. **Satellite analysis pipeline** — real Sentinel-2 tile fetching, NDVI computation
4. **AI integration** — OpenAI-powered anomaly explanation, document OCR
5. **Real-time notifications** — WebSocket upgrade to existing React Query polling
6. **PDF export** — `pdfkit` integration migrated to `packages/domain/src/services/pdfService.ts`
7. **Law enforcement portal** — ACB/Police/CVC dashboard for escalated anomalies
