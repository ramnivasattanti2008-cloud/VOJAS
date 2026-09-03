# VOJAS 2.0 — Architecture Decisions

This document records the rationale behind every significant architectural choice in the VOJAS 2.0 rebuild. Each decision follows the format: what was chosen, why, what was rejected, and what this enables.

---

## 1. PostgreSQL from Day One

**Chosen**: PostgreSQL (development + production)
**Rejected**: SQLite (dev) → PostgreSQL (production) migration path

### Rationale

The original VOJAS plan was SQLite for development (zero-config, fast iteration) migrating to PostgreSQL in production. This was a pragmatic choice for a hackathon. In the 15 phases since, three factors make the migration unnecessary:

1. **PostGIS is required** — VOJAS tracks satellite observations tied to project coordinates. `ST_DWithin`, `ST_Distance`, and `ST_Contains` queries need PostGIS. Supabase and Neon both offer free PostgreSQL with PostGIS enabled. There is no SQLite equivalent.

2. **PostgreSQL free tiers are excellent** — Neon (neon.tech) offers 0.5 GB storage and 0.5 GB RAM on the free tier. Supabase offers 500 MB storage. Both support PostGIS. The zero-config argument for SQLite no longer applies.

3. **The ingestion scripts are idempotent upserts** — `scripts/ingest/pilotProjects.ts` and `scripts/ingest/vonter.ts` run `upsert` operations. Re-running them on an empty PostgreSQL instance produces the same result as on SQLite.

### Trade-offs
- Developers need Docker or a local PostgreSQL installation (handled by `docker-compose.yml`)
- Prisma migrations run differently: `npx prisma migrate dev` in dev, `npx prisma migrate deploy` in production

### Enabling
- Use `docker-compose.yml` for local dev (PostgreSQL + pgAdmin)
- Schema variants: `schema.prisma` (PostgreSQL) and `schema.sqlite.prisma` (swap via schema prefix)
- All `Json` fields use PostgreSQL native `Json` type (not String-serialized JSON)

---

## 2. PostGIS for All Geospatial Operations

**Chosen**: PostGIS `geography(POINT)` columns with spatial indexes
**Rejected**: In-memory haversine calculations, external geocoding service

### Rationale

VOJAS stores ~60,000 project locations as `(latitude, longitude)` pairs. The satellite ingestion pipeline queries "all observations within 500m of project X." Without PostGIS:

- Haversine distance in SQL is slow at scale (no index support)
- In-memory filtering requires loading all rows into Node.js
- Geofencing (projects within a district polygon) is impossible

PostGIS provides:
```sql
-- Find all projects within 500m of a satellite observation
SELECT p.* FROM "Project" p, "SatelliteObservation" s
WHERE s.id = $1
  AND ST_DWithin(
    ST_MakePoint(p.longitude, p.latitude)::geography,
    ST_MakePoint(s.centerLng, s.centerLat)::geography,
    500
  );
```

Indexes on `geography(POINT)` columns make this O(log n) rather than O(n).

### Trade-offs
- Requires PostGIS extension (`CREATE EXTENSION postgis`) on the PostgreSQL instance
- Supabase and Neon both enable it by default
- Complex polygon operations (district boundary containment) require authoritative boundary GeoJSON data

### Enabling
- `datasource db` includes `schema.prisma` with `provider = "postgresql"` and `url = env("DATABASE_URL")`
- Prisma does not natively support PostGIS functions — raw SQL via `$queryRaw` for spatial queries:
  ```typescript
  const nearby = await prisma.$queryRaw<Project[]>`
    SELECT * FROM "Project"
    WHERE ST_DWithin(
      ST_MakePoint(longitude, latitude)::geography,
      ST_MakePoint(${lng}, ${lat})::geography,
      ${radiusMeters}
    )
    LIMIT 20
  `;
  ```

---

## 3. Next.js App Router as the Frontend

**Chosen**: Next.js 15 App Router (`apps/web`)
**Rejected**: Continue with Vite + React SPA

### Rationale

The Vite + React SPA served VOJAS well through all 15 phases. The rebuild to Next.js App Router is driven by three concrete needs:

1. **SSR for dashboard pages** — The project list dashboard, anomaly summary, and MP profile pages are data-heavy. With SSR, the browser receives fully-rendered HTML — no loading spinners on first paint, better Core Web Vitals, no authentication-flash on refresh.

2. **React Server Components for nested data** — `app/projects/[id]/page.tsx` can call the Express API server-side and render the project, MP, vendor, expenditures, anomalies, satellite observations, and risk score in a single RSC render. No client-side waterfall.

3. **API routes as BFF** — Next.js API routes at `app/api/*` aggregate data from the Express backend and reshape it for the frontend. This eliminates multiple `fetch()` calls from client components and allows response caching at the edge.

### What is NOT changing

- **The Express backend is the authoritative API** — Next.js API routes call Express, not Prisma directly. This preserves all existing auth, RBAC, and business logic.
- **React Query is retained** — Client-side data fetching (forms, mutations, real-time updates) uses React Query hooks, not RSC.
- **Vite is not removed** — Vite remains for the Express API's development server (`npm run dev` in `apps/api`).

### Trade-offs
- Next.js adds cognitive overhead (Server Component vs. Client Component distinction)
- The monorepo requires workspace configuration (pnpm workspaces)
- API routes as BFF add a network hop in production (mitigated by keeping Express and Next.js on the same origin via Vercel rewrite rules)

### Enabling
```jsonc
// package.json (workspace root)
{
  "workspaces": ["apps/*", "packages/*"]
}
```

---

## 4. Provider Interfaces with Null/Mock Implementations

**Chosen**: Typed interfaces for all external services (`SatelliteProvider`, `MapsProvider`, `AIProvider`, `StorageProvider`) with null implementations in dev
**Rejected**: Direct third-party SDK imports scattered across services

### Rationale

VOJAS integrates four external service categories:

| Provider | Used by | Production choice | Dev behavior |
|---|---|---|---|
| Satellite imagery | Satellite ingestion pipeline | CDSE (Copernicus Data Space Ecosystem) | Null provider (no-op, skips satellite features) |
| Maps/geocoding | Project creation, location tab | Google Maps API | Null provider (manual lat/lng entry) |
| AI/LLM | Document OCR, anomaly explanation | OpenAI GPT-4o | Null provider (returns mock results) |
| File storage | Document uploads, evidence packages | Supabase Storage / Cloudflare R2 | Local filesystem (`uploads/`) |

Every provider is behind an interface:

```typescript
// packages/domain/src/providers/satellite.ts
export interface SatelliteProvider {
  findScene(lat: number, lng: number, date: Date, maxCloudCover?: number): Promise<SatelliteScene>;
  fetchTileUrl(sceneId: string, date: Date): Promise<string>;
  computeNDVI(tileUrl: string, boundary: GeoJSON.Polygon): Promise<NDVIResult>;
}

export const NullSatelliteProvider: SatelliteProvider = {
  async findScene() { return null; },
  async fetchTileUrl() { return null; },
  async computeNDVI() { return null; },
};
```

Services receive the provider as a dependency:

```typescript
// apps/api/src/services/satelliteService.ts
export function createSatelliteService(opts: { satellite: SatelliteProvider }) {
  return {
    async ingestScene(projectId: string, sceneId: string) {
      const scene = await opts.satellite.findScene(/* ... */);
      if (!scene) return null; // null provider = no-op
      // ...
    },
  };
}
```

### Trade-offs
- Interface + implementation pattern adds indirection
- Each provider needs a factory/registry to instantiate based on env vars
- Mock implementations must stay realistic enough for UI development

### Enabling
```bash
# apps/api/.env
SATELLITE_PROVIDER=cdse   # enables CDSE provider
AI_PROVIDER=openai        # enables OpenAI provider
# SATELLITE_PROVIDER=      # unset = NullSatelliteProvider
```

---

## 5. JWT + bcrypt Authentication

**Chosen**: JWT HS256 (7-day expiry), bcrypt cost factor 12, refresh token rotation
**Rejected**: Sessions (Redis dependency), OAuth (complexity), JWT without refresh rotation

### Rationale

JWT is the right choice for a stateless REST API with multiple clients (web, potential mobile). Key implementation details:

- **HS256** (not RS256) — symmetric key, simpler deployment, sufficient for SIH scope. Key stored in `JWT_SECRET` env var.
- **7-day expiry** — balances security (short-lived tokens) with UX (users shouldn't re-login daily)
- **bcrypt cost 12** — OWASP recommendation for 2024. Cost 10 is the 2020 standard; cost 12 is current best practice for sensitive government data.
- **Refresh token rotation** — every `/auth/refresh` call issues a new refresh token and invalidates the old one. A stolen refresh token is usable only once.
- **Login rate limit**: 10 requests per 15 minutes per IP (enforced via `express-rate-limit`)

### Trade-offs
- JWT in `localStorage` is readable by XSS (acknowledged limitation; httpOnly cookie requires HTTPS + SameSite config)
- Token revocation requires a denylist or short expiry — no "logout everywhere" for HS256
- Refresh token rotation prevents replay attacks but adds complexity

### Enabling
```typescript
// packages/domain/src/auth.ts
export interface JWTPayload {
  sub: string;      // userId
  email: string;
  role: Role;
  iat: number;
  exp: number;
}

export const ACCESS_TOKEN_EXPIRY = '7d';
export const REFRESH_TOKEN_EXPIRY = '30d';
export const BCRYPT_ROUNDS = 12;
```

---

## 6. Zod Validation at Every API Boundary

**Chosen**: Zod schemas in `packages/domain/src/schemas/`, shared between Express controllers and Next.js API routes
**Rejected**: ad-hoc TypeScript type guards, Joi, Yup

### Rationale

The API boundary is the most important security surface. Every input — request body, query params, URL params — must be validated before reaching business logic.

Zod was chosen over alternatives:
- **TypeScript inference** — schemas produce types, no duplication between `interface` and `z.object()`
- **Composable** — `projects.create` schema extends `projects.base` which extends `projects.location`
- **Transform support** — `z.coerce.number()`, `z.string().trim()`, `z.string().datetime()`
- **Error messages** — human-readable field-level errors returned to clients

All schemas live in `packages/domain/src/schemas/` and are imported by both:
- `apps/api/src/controllers/` (Express request validation)
- `apps/web/app/api/*/route.ts` (Next.js BFF request validation)

```typescript
// packages/domain/src/schemas/projects.ts
export const projectsCreateSchema = z.object({
  name: z.string().min(1).max(200),
  district: z.string().min(1),
  state: z.string().min(1),
  sector: z.nativeEnum(ProjectSector),
  approvedAmount: z.number().positive().max(1e9),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  // ...
});

export type ProjectsCreateInput = z.infer<typeof projectsCreateSchema>;
```

### Trade-offs
- Schemas must be kept in sync with Prisma models — a schema change requires a corresponding migration
- Large schemas can slow startup (negligible at VOJAS scale)

---

## 7. Append-Only Audit Log

**Chosen**: `AuditLog` is append-only; `ProjectEvent` and `FinancialObservation` are append-only; historical values are never overwritten
**Rejected**: Mutable audit rows, soft-delete patterns that can be un-deleted

### Rationale

Government accountability systems have a legal requirement for audit integrity. Once an event is recorded, it must not be modified or deleted by any user — including ADMIN.

**What is append-only:**
- `AuditLog` — every state change (login, report transition, anomaly resolve, expenditure add)
- `ProjectEvent` — every project lifecycle event (proposal, approval, sanction, work start, completion)
- `Expenditure` — financial transactions are never reversed in the DB (reversed transactions are new rows with `status = REVERSED`)

**What is mutable (with audit trail):**
- `Project.status` — mutable, but every change creates a `ProjectEvent` record
- `Report.status` — mutable, but every change creates a `ReportStatusLog` record
- `Anomaly.status` — mutable, but every change is logged in `AuditLog`

**Immutable fields:**
- `createdAt`, `createdById` — never modified
- `AuditLog` rows — never modified or deleted
- `ProjectEvent` rows — never modified or deleted

### Trade-offs
- Schema requires explicit append-only discipline; Prisma does not enforce it at the DB level
- Historical queries (`SELECT * FROM "ProjectEvent" WHERE projectId = $1 ORDER BY eventDate`) are correct but require pagination for large timelines
- Storage grows indefinitely; `ProjectEvent` older than 5 years could be archived (future phase)

### Enabling
- `AuditLog` has no `UPDATE` or `DELETE` routes in the Express API
- Prisma middleware (future) could enforce append-only at the ORM level
- Soft-delete (`deletedAt`) is used for user-impersonatable entities (User, Document) but NOT for AuditLog, ProjectEvent, Expenditure

---

## 8. Test Fixtures Policy

**Chosen**: Only labeled test fixtures; production data comes from real ingestion scripts
**Rejected**: Fixtures that look like production data without clear labeling, seed scripts that produce demo-quality data

### Rationale

Test data must be obviously fake or obviously real:
- **Fake fixtures** (`*.test.ts`): Mock data with clearly unrealistic values — `"Test User"`, `"TEST_PROJECT_001"`, `lat: 0.0001`. Labeled with `// FIXTURE: fake` comment. Never committed as real data.
- **Real fixtures** (`scripts/seed/fixtures/`): Real MPLAD data (MP names, constituency names, scheme amounts) sourced from open government datasets. Clearly attributed in file headers. Used for smoke tests and E2E tests.
- **Ingestion scripts** (`scripts/ingest/`): Produce real data from Vonter, dataful, opencity.in, LGD datasets. Run as part of deployment setup.

### What this prevents
- Tests passing with fake data that breaks on real data
- Ingestion scripts silently producing wrong results because they were never tested
- "Demo polish" contaminating production data models

### Enabling
```typescript
// packages/domain/test/validation.test.ts
// FIXTURE: fake — not real MP data
const fakeProject = {
  name: 'TEST_PROJECT_001',
  district: 'TEST_DISTRICT',
  state: 'TEST_STATE',
  approvedAmount: 100000,
};
```

---

## 9. Storage Abstraction

**Chosen**: `StorageProvider` interface with `LocalStorageProvider` (dev) and `S3CompatibleStorageProvider` (prod)
**Rejected**: Direct local filesystem usage in production, S3-only with no dev alternative

### Rationale

File uploads (documents, evidence packages, report attachments) need to work in both environments:

**Local development**:
- Files stored in `apps/api/uploads/` (git-ignored)
- `LocalStorageProvider.upload()` writes to disk, returns `/uploads/{uuid}.{ext}`
- No AWS credentials needed

**Production**:
- `S3CompatibleStorageProvider.upload()` uses S3-compatible API (Supabase Storage or Cloudflare R2)
- Returns public CDN URL
- Same interface, zero code change

```typescript
export interface StorageProvider {
  upload(file: Buffer, filename: string, mimeType: string): Promise<string>;
  delete(url: string): Promise<void>;
}
```

### Trade-offs
- Multipart upload for large files (>5 MB) requires streaming; simple `Buffer` approach works for typical document sizes
- Local storage in Docker requires volume mounting (`uploads/` directory must persist across container restarts)

---

## 10. Why Not Microservices Yet

**Chosen**: Monolith with clear domain package boundaries — extract later when needed
**Rejected**: Separate services for satellite ingestion, anomaly detection, AI processing from day one

### Rationale

Microservices add four costs that are not justified at VOJAS's current scale:
1. **Network latency** — synchronous calls between services add 10-50ms per hop
2. **Operational complexity** — each service needs its own deployment, monitoring, logging, health checks
3. **Distributed transactions** — saga pattern for multi-service operations is significantly more complex than a database transaction
4. **Observability** — distributed tracing, correlation IDs, centralized logging require infrastructure

VOJAS has ~60,000 projects and one satellite ingestion pipeline. The data volume and processing requirements do not justify microservices.

### What makes extraction easy when needed

`packages/domain` provides the extraction boundary today:
- All business logic is in domain services, not Express route handlers
- Provider interfaces mean satellite/AI/storage implementations are injectable
- Event-driven architecture (planned for Phase 54) will use an internal event bus (`EventEmitter`) that can be swapped for a message queue (BullMQ, Kafka) later

**When to extract** (trigger conditions, not pre-emptive):
- Satellite ingestion pipeline takes >30 seconds per batch (scale up or extract to worker)
- AI processing queue has >100 pending jobs (extract to async worker)
- Different teams own different domains (org boundary)
- Separate deployment cadence required

---

## Summary

| Decision | Choice | Key Driver |
|---|---|---|
| Database | PostgreSQL + PostGIS | Satellite geospatial queries |
| Frontend | Next.js App Router | SSR, RSC, Vercel deployment |
| Auth | JWT + bcrypt cost 12 | Stateless API, government data sensitivity |
| Validation | Zod (shared packages) | Type-safe, composable, FE+BE unified |
| External services | Provider interfaces | Testable, swappable, no env dependency |
| Audit | Append-only | Legal accountability, immutability |
| Storage | Abstracted provider | Dev: local FS; Prod: S3-compatible |
| Architecture | Modular monolith | Complexity cost, YAGNI |
