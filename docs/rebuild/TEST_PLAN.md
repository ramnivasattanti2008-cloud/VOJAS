# VOJAS 2.0 — M1 Test Plan

## Overview

M1 (Milestone 1) tests the foundational rebuild: monorepo structure, shared packages, Prisma schema, Express API routes, Next.js App Router pages, and authentication.

---

## Test Structure

### Unit Tests (`packages/*/test/`)

Tests for individual packages. No I/O, no database, no network. Fast (< 1 second each).

| Test file | What it covers |
|---|---|
| `packages/shared/test/enums.test.ts` | Enum value completeness, string mapping |
| `packages/shared/test/utils.test.ts` | `formatCurrency()`, `normalizeString()`, `parseDate()` |
| `packages/domain/test/errors.test.ts` | `AppError` class hierarchy, `fromZodError()`, `fromPrismaError()` |
| `packages/domain/test/validation.test.ts` | Zod schema validation for all input types |
| `packages/domain/test/geoUtils.test.ts` | Coordinate validation, PostGIS query builders |
| `packages/domain/test/providers.test.ts` | Null providers return expected null/silent results |
| `packages/db/test/connection.test.ts` | Prisma client connects to PostgreSQL, PostGIS available |
| `packages/api-client/test/client.test.ts` | Fetch wrapper handles 2xx, 4xx, 5xx, network errors |

### Integration Tests (`apps/api/tests/integration/`)

Full API flow with a test database (Prisma `migrate reset` before each suite). Tests authentication, RBAC, CRUD, and audit logging.

| Test file | What it covers |
|---|---|
| `auth.test.ts` | Register, login, logout, JWT refresh, invalid credentials, rate limit |
| `rbac.test.ts` | Each role's permissions enforced per endpoint |
| `projects.test.ts` | CRUD, filters, sorting, pagination, geospatial queries |
| `reports.test.ts` | Submit, list (PII redaction), transition, assign, attachments |
| `anomalies.test.ts` | Scan, list, acknowledge, resolve, escalate |
| `audit.test.ts` | AuditLog integrity, append-only enforcement |
| `satellite.test.ts` | Scene ingestion, NDVI storage, progress observation creation |
| `redaction.test.ts` | PII fields redacted correctly per role |

### E2E Tests (`apps/web/e2e/`)

Playwright tests that open a real browser and exercise full user flows.

| Test file | What it covers |
|---|---|
| `login.spec.ts` | Login, logout, auth redirect, invalid credentials |
| `projects.spec.ts` | Project list, filters, detail page, risk badge |
| `dashboard.spec.ts` | Dashboard loads, charts render, anomaly counts |
| `reports.spec.ts` | Submit report, view list (redacted), status transitions |

---

## Test Commands

### Run all tests

```bash
# From workspace root (pnpm)
pnpm test

# From individual packages
pnpm --filter @vojas/domain test
pnpm --filter @vojas/api test
```

### Unit tests

```bash
# Run all unit tests with coverage
pnpm test:unit

# Run specific package
pnpm --filter @vojas/domain test:unit

# Watch mode (re-run on file change)
pnpm --filter @vojas/domain test:unit --watch
```

### Integration tests

```bash
# Requires running PostgreSQL (docker-compose up -d postgres)
pnpm test:integration

# Run specific integration suite
pnpm --filter @vojas/api test:integration auth
```

### E2E tests

```bash
# Start full dev stack first
docker-compose up -d
pnpm --filter @vojas/web dev &

# Run E2E
pnpm --filter @vojas/web test:e2e
```

### Smoke tests (CI/CD)

```bash
# Fast smoke test: no DB, no browser
pnpm test:smoke
# Runs: type check + unit tests only
```

---

## Environment Requirements

### Unit tests
- No external dependencies
- Mocked providers (NullSatelliteProvider, NullAIProvider)

### Integration tests
- PostgreSQL 15+ with PostGIS extension
- `DATABASE_URL` pointing to test database
- Test database created via `npx prisma migrate deploy --schema packages/db/schema.test.prisma`

```bash
# Setup test database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vojas_test" \
  npx prisma migrate deploy --schema packages/db/schema.test.prisma
```

### E2E tests
- Dev server running (`pnpm --filter @vojas/web dev`)
- Test user credentials (created in test `beforeAll` hook)

---

## Coverage Targets (M1)

| Layer | Target |
|---|---|
| `packages/domain/src/services/` | 80% |
| `packages/domain/src/schemas/` | 90% |
| `apps/api/src/controllers/` | 70% |
| `apps/api/src/middleware/` | 85% |
| UI components | Not measured in M1 |

---

## Known Test Gaps (M1)

These are intentionally deferred — will be added in subsequent milestones:

- [ ] Satellite tile fetching (requires CDSE credentials)
- [ ] AI provider integration (requires OpenAI API key)
- [ ] File upload with real S3 (requires R2/Supabase credentials)
- [ ] Geospatial PostGIS queries (requires real coordinates in test fixtures)
- [ ] Refresh token rotation
- [ ] Rate limit tests under concurrent load
- [ ] PII redaction with all Indian text patterns

---

## CI Configuration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit
      - run: pnpm build

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
        run: |
          npx prisma migrate deploy
          pnpm test:integration

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @vojas/api dev &
      - run: pnpm --filter @vojas/web dev &
      - run: sleep 10 && pnpm --filter @vojas/web test:e2e
```

---

## Test Fixtures Policy

Test data follows a strict labeling policy:

```typescript
// FIXTURE: fake — not real data, use for unit tests
const fakeProject = {
  name: 'TEST_PROJECT_M1_001',
  district: 'TEST_DISTRICT',
  state: 'TEST_STATE',
  latitude: 0.0001,  // obviously fake coordinates
  approvedAmount: 100000,
};

// FIXTURE: real — real MPLAD data, use for integration and E2E tests
// Source: scripts/seed/fixtures/real-mp-data.json
const realProject = {
  name: 'Construction of RCC Bridge at KM 12',
  district: 'North East Delhi',
  state: 'Delhi',
  latitude: 28.7041,
  longitude: 77.1025,
  approvedAmount: 4850000,
  source: 'VONTER',
};
```

**Rule**: No fixture should be ambiguous. Clearly label as `fake` or `real` and attribute the source for real data.
