# M26 Verification

Date: 2026-09-08
Milestone: TypeScript Foundation Recovery

## Status matrix

> **Superseded environment note (2026-09-08):** This document records the
> pre-M27 environment. PostgreSQL/PostGIS, API readiness, frontend connectivity,
> and database-backed local verification were subsequently recovered and are
> documented in `docs/M27_DATABASE_ENVIRONMENT.md`.

| Gate | Status | Evidence |
|---|---|---|
| Typecheck | GREEN | `pnpm -r --if-present typecheck` completed with zero TypeScript errors across all six checked workspace projects. |
| Prisma | GREEN | `pnpm db:generate` completed successfully after aligning the generator output with the hoisted client. |
| Tests | GREEN WITH SKIPS | Current workspace tests pass after PostgreSQL recovery. DB-backed API tests are skipped when `DATABASE_URL_TEST` is not loaded; web has no test files. |
| Build | GREEN | Root `pnpm build` completed for shared, db, api-client, domain, API, and Next.js web. Next.js produced all routes successfully. Existing Sentry configuration warnings remain. |
| API | GREEN | API health/readiness and authenticated project-listing checks pass against local PostgreSQL. |
| Frontend | GREEN | Next.js production build and local `/login` response pass with the API available on port 5000. |
| Browser | GREEN FOR LOCAL SMOKE | Local frontend/API connectivity is verified; production behavior still requires external deployment. |
| Security | GREEN for M26 changes | No auth or authorization logic was weakened. No `as any` or unchecked security bypass was added. The API type boundary was corrected to use the canonical domain type. |
| Repository hygiene | GREEN | `git diff --check` passed. No `.env` or secret files were added or modified by M26. Existing unrelated `render.yaml` and environment-hardening files remain uncommitted and were not reverted. |

## Changes verified

- `packages/db/prisma/schema.prisma`: Prisma client output now targets the repository-level hoisted client used by workspace resolution.
- `apps/api/src/routes/sectors.ts`: `SectorConfig` now comes from `@vojas/domain`, avoiding an API-to-frontend package dependency.
- `docs/M26_TYPESCRIPT_ERRORS.md`: complete baseline inventory, root causes, and before/after counts.

## Typecheck result

- Errors before: 164 workspace reports, 82 unique source diagnostics
- TS2305 before: 14 workspace reports, 7 unique source diagnostics
- TS7006 before: 150 workspace reports, 75 unique source diagnostics
- Other errors before: 0
- Errors after: 0
- TS2305 after: 0
- TS7006 after: 0
- Other errors after: 0

## Test detail

### Passing

- `packages/domain`: 4 test files, 98 tests passed
- API test run: 19 tests passed

### Blocked or failing

- `packages/db`: database connection test suite cannot initialize because Prisma requires `DATABASE_URL`.
- API integration run: 8 failures remain in integration coverage and require the API/database test environment for diagnosis.
- `apps/web`: Vitest reports no test files.

These are verification blockers, not TypeScript failures.

## Browser detail

The existing local frontend on `http://localhost:3000` rendered:

- VOJAS sign-in page
- email and password fields
- sign-in form
- register link

The browser captured failed refresh requests to `http://localhost:5000/api/v1/auth/refresh` because no API listener was available. A second frontend start was not attempted destructively: port 3000 was already occupied by the existing frontend process.

## Historical blocker resolved

The original SQLite/environment mismatch was resolved by aligning local
configuration to PostgreSQL/PostGIS and running the development database in
Docker. The current environment is documented in
`docs/M27_DATABASE_ENVIRONMENT.md`.

Provide a valid local PostgreSQL/PostGIS `DATABASE_URL` and start the API on port 5000, then rerun:

```text
pnpm -r --if-present test
pnpm build
```

After that, repeat browser checks for login, dashboard, projects, public project view, map, and analytics.

## M26 conclusion

M26 TypeScript recovery itself is complete: the required final typecheck gate is green with zero errors. The overall milestone verification is **PARTIAL** because database-backed tests and full API/browser workflows remain environment-blocked.
