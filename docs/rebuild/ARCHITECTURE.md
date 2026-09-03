# VOJAS 2.0 — Architecture

## Overview

VOJAS 2.0 is a monorepo web application for the SIH 2026 **AI-Powered Anomaly Detection in MPLAD Scheme** platform. It tracks ~60,000 MPLAD projects across India, correlates satellite Earth-observation data, and surfaces anomalies to authorized government officers.

The rebuild migrates from a **React + Vite + Express** stack to **Next.js App Router + Express**, using a shared TypeScript monorepo with clear package boundaries.

---

## Why Next.js Instead of Express + Vite

The original Express + Vite stack served the MVP well. VOJAS 2.0 adopts Next.js for several structural reasons:

| Reason | Detail |
|---|---|
| **SSR for dashboard pages** | Dashboard pages (project lists, anomaly summaries) benefit from server-side rendering — faster first paint, no loading flicker, better SEO for public pages |
| **React Server Components** | Data-heavy pages (project detail, MP profile) can render data on the server, reducing client JS bundle and preventing waterfall fetches |
| **API routes as BFF** | Next.js API routes aggregate data from the Express backend and reshape it for the frontend — fewer round trips, custom response shapes |
| **Unified deployment** | Both frontend and API deploy to Vercel; no separate hosting, no CORS complexity |
| **Better caching** | Next.js `fetch` integration with `revalidate` tags gives fine-grained ISR without a Redis dependency |

The Express backend is **not replaced** — it is retained as the authoritative API, exposed as a BFF layer. This preserves all existing business logic, authentication middleware, and the Prisma data layer.

---

## Monorepo Structure

```
vojas/
├── apps/
│   ├── web/              # Next.js 15 App Router (TypeScript)
│   │   ├── app/          # App Router pages and layouts
│   │   ├── components/  # Shared UI components
│   │   ├── features/     # Feature-specific pages and components
│   │   ├── hooks/        # React Query data hooks
│   │   └── lib/          # Client-side utilities
│   │
│   └── api/              # Express.js API (TypeScript) — existing backend
│       ├── src/
│       │   ├── controllers/  # Request handlers
│       │   ├── services/      # Business logic
│       │   ├── middleware/    # Auth, RBAC, validation
│       │   ├── routes/       # Express route definitions
│       │   └── utils/        # Helpers (storage, JWT, PII)
│       ├── prisma/
│       │   ├── schema.prisma         # PostgreSQL schema (production)
│       │   └── schema.sqlite.prisma  # SQLite schema (development)
│       └── tests/
│           ├── unit/
│           └── integration/
│
├── packages/
│   ├── db/               # Prisma schema, migrations, seed data
│   │   ├── schema.prisma
│   │   └── seed/
│   │
│   ├── domain/            # Shared domain logic, Zod schemas, types
│   │   ├── src/
│   │   │   ├── schemas/  # Zod input schemas
│   │   │   ├── types/    # TypeScript types
│   │   │   ├── services/ # Domain services (risk, anomaly, redaction)
│   │   │   ├── errors/   # AppError hierarchy
│   │   │   └── providers/ # Provider interfaces (satellite, maps, AI, storage)
│   │   └── test/
│   │
│   ├── shared/            # Enums, constants, utilities used by both FE and BE
│   │   ├── src/
│   │   │   ├── enums/
│   │   │   ├── constants/
│   │   │   └── utils/
│   │   └── package.json
│   │
│   └── api-client/        # Typed API client for the frontend
│       ├── src/
│       │   ├── client.ts  # Base fetch wrapper with auth
│       │   ├── endpoints/ # Per-resource API methods
│       │   └── types.ts   # Shared request/response types
│       └── package.json
│
├── docs/
│   └── rebuild/           # This documentation
│
├── scripts/               # Data ingestion scripts
│   ├── ingest/
│   └── seed/
│
└── package.json           # Workspace root (pnpm workspaces)
```

---

## Layer Separation

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER / MOBILE CLIENT                                    │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST (JSON)
┌────────────────────────▼────────────────────────────────────┐
│  Next.js App Router — apps/web                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  App Router Pages (SSR / RSC)                        │   │
│  │  e.g. /projects, /projects/[id], /mps/[id]          │   │
│  └──────────────────────────┬───────────────────────────┘   │
│  ┌──────────────────────────▼───────────────────────────┐   │
│  │  API Routes — /api/* (BFF layer)                     │   │
│  │  Aggregates data from Express API, reshapes for FE   │   │
│  └──────────────────────────┬───────────────────────────┘   │
└────────────────────────────┼────────────────────────────────┘
                             │ HTTP/REST (internal)
┌────────────────────────────▼────────────────────────────────┐
│  Express API — apps/api                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Controllers — request parsing, Zod validation         │   │
│  │  Services — business logic, risk scoring, redaction   │   │
│  │  Repositories — Prisma queries                        │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┼────────────────────────────────┘
                             │ Prisma Client
┌────────────────────────────▼────────────────────────────────┐
│  PostgreSQL + PostGIS                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Relational data: Projects, Users, Reports, etc.       │   │
│  │  Geospatial: geography(POINT) indexes, ST_DWithin    │   │
│  │  Full-text: SearchIndex for project/entity search      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **User navigates to `/projects/DELHI-2024-001`**
2. Next.js RSC fetches project data via internal API call to Express
3. Express validates JWT, checks RBAC, queries Prisma
4. Prisma queries PostgreSQL + PostGIS for project + locations + risk score
5. Service layer applies PII redaction (non-ADMIN roles)
6. Express returns JSON; RSC renders page with full data
7. Client receives pre-rendered HTML — no loading spinner

---

## Package Responsibilities

### `packages/shared`
Enums, constants, and pure utility functions used by both frontend and backend. Never imports from `packages/domain`, `packages/db`, or `packages/api-client`.

- **enums**: `Role`, `ProjectStatus`, `AnomalyCategory`, `ReportSeverity`, `LokSabhaTerm`, etc.
- **constants**: `PII_PATTERNS`, `DISTRICT_BOUNDS`, `BUCKET_SIZES`
- **utils**: `formatCurrency()`, `parseDate()`, `normalizeString()`

### `packages/domain`
All business logic that lives outside the web/API layer. Must be importable by both `apps/web` (via server-side calls) and `apps/api` (directly).

- **schemas**: Zod schemas for every API input. `projects.create`, `reports.submit`, `expenditures.add`, etc. These are the single source of truth for input validation — shared between Next.js API routes and Express controllers.
- **types**: TypeScript interfaces derived from Zod schemas (`z.infer<typeof projectsCreateSchema>`).
- **services**: Each service is a class that takes a PrismaClient (dependency injection), validates input with Zod, throws typed `AppError` subclasses, and never exposes internal DB structures in public return types. All services are async/Promise-based. No `any` types in strict mode.
- **errors**: `AppError` class hierarchy (`ValidationError`, `NotFoundError`, `ForbiddenError`, `ConflictError`, etc.)
- **providers**: Interfaces for all external services. Each has a null/mock implementation used in dev and a real implementation enabled via env vars:

  ```typescript
  // packages/domain/src/providers/
  export interface SatelliteProvider {
    findScene(lat: number, lng: number, date: Date): Promise<SatelliteScene>;
    fetchTile(sceneId: string, date: Date): Promise<string>; // tile URL
  }

  export interface MapsProvider {
    geocode(address: string): Promise<{ lat: number; lng: number }>;
    reverseGeocode(lat: number, lng: number): Promise<string>;
  }

  export interface AIProvider {
    analyzeDocument(text: string, type: DocumentType): Promise<AIDocumentAnalysis>;
    explainAnomaly(anomaly: Anomaly): Promise<string>;
    summarizeAuditLog(events: AuditEvent[]): Promise<string>;
  }

  export interface StorageProvider {
    upload(file: Buffer, filename: string, mimeType: string): Promise<string>; // returns URL
    delete(url: string): Promise<void>;
  }
  ```

### `packages/db`
The Prisma schema and all database concerns. Single `schema.prisma` targeting PostgreSQL (production). SQLite variant (`schema.sqlite.prisma`) for local dev via schema prefix swap.

- **schema.prisma**: All 40+ models, indexes, enums
- **migrations/**: Prisma migration files (committed, never auto-generated in production)
- **seed/**: Seed scripts for demo/development data

### `packages/api-client`
Typed HTTP client used by the Next.js frontend to call the Express API. Auto-generated from OpenAPI spec or hand-written with a consistent pattern:

```typescript
// packages/api-client/src/projects.ts
export const projectsApi = {
  list: (params: ProjectListParams) =>
    client.get<ApiResponse<ProjectListResponse>>('/api/v1/projects', { params }),

  get: (id: string) =>
    client.get<ApiResponse<Project>>(`/api/v1/projects/${id}`),

  create: (data: ProjectCreateInput) =>
    client.post<ApiResponse<Project>>('/api/v1/projects', data),

  // ... other methods
};
```

### `apps/web`
Next.js 15 App Router frontend. Pages are React Server Components where possible; client components only for interactive elements.

- **app/**: App Router structure (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`)
- **components/**: Shared UI — `Button`, `Input`, `Modal`, `DataTable`, `Panel`, `DonutChart`
- **features/**: Feature modules — `projects/`, `anomalies/`, `reports/`, `analytics/`, `mps/`
- **hooks/**: React Query hooks wrapping `api-client` — `useProjects`, `useAnomalies`, `useReports`

### `apps/api`
Express.js API — the existing backend, refactored to use shared packages. Business logic moves to `packages/domain/src/services/`. Only Express-specific concerns (routing, middleware, request parsing) remain in `apps/api`.

---

## Data Flow: Satellite Observation

```
Sentinel-2 L2A (CDSE)
       │
       ▼ (CDSE STAC API)
apps/api: satelliteService.ingestScene(projectId, sceneId)
       │
       ▼
SatelliteObservation row created (raw metadata)
       │
       ▼
NDVI/NDBI/BSI computed → stored in SatelliteObservation
       │
       ▼
ProgressObservation: compare satellite change vs reported progress
       │
       ▼
Anomaly check: progress discrepancy → Anomaly record created
       │
       ▼
ProjectRisk recalculated (anomalyScore component updated)
       │
       ▼
Notification fan-out to assigned ANALYST / OFFICER
```

---

## Environment Variables

### `apps/web` (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### `apps/api` (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
BCRYPT_ROUNDS=12
CLIENT_BASE_URL=http://localhost:3000
NODE_ENV=development

# Provider toggles (null providers used if unset)
SATELLITE_PROVIDER=cdse  # cdse | gee | null
MAPS_PROVIDER=null       # google | mapbox | null
AI_PROVIDER=null         # openai | null
STORAGE_PROVIDER=local   # s3 | supabase | local
```

---

## Deployment

| Component | Platform | Notes |
|---|---|---|
| `apps/web` | Vercel | SSR + Edge Functions, auto-deploys on push |
| `apps/api` | Render / Railway | Docker container, `npx prisma migrate deploy` on start |
| PostgreSQL | Supabase / Neon | Free tier, PostGIS extension enabled |
| File storage | Supabase Storage / Cloudflare R2 | S3-compatible, CDN-backed |

Vercel `vercel.json` rewrites `/api/*` to the Express API URL so the frontend and backend share a single origin in production.

---

## What This Architecture Enables

- **Independent scaling**: Express API scales separately from the Next.js frontend
- **Shared validation**: Zod schemas in `packages/domain` validate input on both sides
- **Provider swaps**: Satellite provider, AI provider, storage all injectable — test with mocks, enable with env vars
- **Future extraction**: If microservices become necessary, `packages/domain` provides a clean extraction boundary — just deploy the domain package as a separate service
- **Type safety end-to-end**: Prisma types → Domain types → API response types → React Query → UI components
