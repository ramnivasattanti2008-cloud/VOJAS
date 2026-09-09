# M27 PostgreSQL / PostGIS Environment

Date: 2026-09-08
Status: COMPLETE - LOCAL ENVIRONMENT RECOVERED

## Architecture

VOJAS uses the current Prisma schema in `packages/db/prisma/schema.prisma` with:

- PostgreSQL datasource
- PostGIS extension initialized by `packages/db/prisma/init/01-postgis.sql`
- PostgreSQL port `5432`
- API port `5000`
- Next.js frontend port `3000`
- Frontend API base URL `http://localhost:5000/api/v1`

SQLite is not a supported local fallback for the current schema and must not be restored.

## Current repository configuration

The local environment now uses this non-secret development connection shape:

```text
postgresql://vojas:<local-password>@localhost:5432/vojas?schema=public
```

The actual `.env` uses the existing local development password expected by the repository's Docker configuration. It is ignored by Git and is not documented here.

`.env.example` contains placeholders only. Never commit `.env`, passwords, tokens, or provider credentials.

## Local database setup

The repository now includes a database-only development compose file:

```powershell
docker compose -f docker-compose.dev.yml up -d db
docker compose -f docker-compose.dev.yml ps
```

The service provides:

- `postgis/postgis:16-3.4`
- persistent volume `vojas_pg_dev_data`
- host port `5432`
- health check using `pg_isready`
- PostGIS initialization from `packages/db/prisma/init/01-postgis.sql`

This compose file does not remove data. Do not use `docker compose down -v` unless the volume is intentionally disposable.

## Required local prerequisites

The local Windows environment has Docker Compose with Linux containers running. The
`vojas-db-dev` container is healthy and publishes PostgreSQL on port `5432`.

## Prisma workflow

After PostgreSQL/PostGIS is running:

```powershell
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Use `pnpm db:push` only for a disposable local database when migration history is not required. Do not run `pnpm db:reset` against any shared or non-disposable database.

The seed file is development/test fixture data. It must not be described as real government project data or production evidence.

## PostGIS verification

After the database container is healthy, verify the extension through Prisma:

```powershell
pnpm --filter @vojas/db db:push
pnpm --filter @vojas/db db:seed
pnpm --filter @vojas/db test
```

The repository's `verifyPostGIS()` helper checks for the `postgis` extension. A direct database check, when `psql` is available, is:

```sql
SELECT version();
SELECT PostGIS_Full_Version();
SELECT extname FROM pg_extension WHERE extname = 'postgis';
```

The schema contains spatially relevant latitude/longitude data and PostGIS-dependent query helpers. Verify the extension before treating spatial features as operational.

## API gate

Start the API with:

```powershell
pnpm dev:api
```

Verify:

```text
GET http://localhost:5000/health
GET http://localhost:5000/ready
GET http://localhost:5000/api/v1/health
GET http://localhost:5000/api/v1/ready
```

`/health` is liveness-only. `/ready` and the `/api/v1/*` readiness endpoints perform a database query and must return an unavailable response when the database is down. Raw database errors are logged server-side rather than returned by the normal readiness response.

## Frontend relationship

Start the frontend with:

```powershell
pnpm dev:web
```

The frontend runs on `http://localhost:3000` and calls the API through `NEXT_PUBLIC_API_URL`, whose local value is `http://localhost:5000/api/v1`.

The browser smoke path is:

```text
Browser :3000 -> Next.js frontend -> API :5000 -> PostgreSQL/PostGIS :5432
```

## Production differences

- Production should use a managed PostgreSQL/PostGIS service or a secured private database network.
- Production passwords and JWT secrets must come from the platform secret manager.
- Production must not enable automatic demo seeding.
- Render and Vercel configuration are deployment-specific and are not substitutes for local database verification.
- The existing root `docker-compose.yml` is a legacy multi-service deployment configuration using `backend/` and `frontend/` contexts; `docker-compose.dev.yml` is the focused local database path for the current monorepo.

## M27 verification result

| Gate | Status | Evidence |
|---|---|---|
| Database configuration | GREEN | Root, API, and database configuration point to the local PostgreSQL database. |
| PostgreSQL | GREEN | `vojas-db-dev` is healthy and publishes `0.0.0.0:5432->5432`. |
| PostGIS | GREEN | `postgis` extension is installed; `PostGIS_Full_Version()` reports 3.4.3 for PostgreSQL 16. |
| Prisma | GREEN | Client generation, database push, schema synchronization, and seed completed successfully. |
| API | GREEN | `/health`, `/ready`, `/api/v1/health`, and `/api/v1/ready` each returned HTTP 200. |
| Frontend -> API | GREEN | API port is aligned to 5000; seeded admin login returned HTTP 200. |
| Browser | GREEN | Frontend `/login` returned HTTP 200 on port 3000 and rendered the sign-in page. |
| Typecheck | GREEN | Workspace typecheck passes across API, web, and shared packages. |
| Test suite | GREEN WITH SKIPS | Workspace tests pass: API 27, database 4, and domain 98 tests; 108 database-dependent API tests are skipped without `DATABASE_URL_TEST`; web has no test files. |

**M27: COMPLETE - LOCAL POSTGRESQL/POSTGIS ENVIRONMENT VERIFIED**

The development database is running in Docker, Prisma is synchronized with the
PostgreSQL/PostGIS schema, development seed data loaded, and the API/frontend
connectivity gates passed. Seed data is test fixture data only.

The full repository test suite passed after the recovery checks. Redis remains
optional locally and the API uses its in-process fallback when `REDIS_URL` is
unset. Express-rate-limit emits IPv6 key-generator warnings during tests; these
do not fail the suite.

## Verification commands

```powershell
docker compose -f docker-compose.dev.yml ps
docker exec vojas-db-dev psql -U vojas -d vojas -tAc "SELECT extname FROM pg_extension WHERE extname = 'postgis'; SELECT PostGIS_Full_Version();"
pnpm db:generate
pnpm db:push
pnpm db:seed
```

The API and frontend were then verified on ports 5000 and 3000 respectively.
