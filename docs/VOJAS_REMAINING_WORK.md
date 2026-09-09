# VOJAS Remaining Work

> **Current verification (2026-09-08):** The P0 local-environment items below
> are complete. PostgreSQL/PostGIS is healthy, ports 3000 and 5000 respond,
> Prisma generation succeeds, and workspace typecheck/build/test gates pass.
> Remaining items are product/deployment validation work, not local boot blockers.

This backlog is based on the current repo state and current runtime checks. It intentionally avoids repeating milestone claims without fresh verification.

## Guiding rule

Do not build new features until the project is bootable, verified, and data-backed in a clean environment.

## Priority legend

- P0 = Must happen before any meaningful continuation or feature expansion
- P1 = Must happen before claiming the app is operationally usable
- P2 = Important quality and reliability work
- P3 = Cleanup, polish, and optional improvements

## P0 — Immediate stabilization (complete locally)

### 1. Restore clean boot state

Purpose: Remove stale blockers and make the app boot in a clean environment.

Evidence: `http://localhost:3000/login` returns HTTP 200 and the API is healthy on port 5000.

Required actions:

- identify and clear stale listener(s) on port 3000
- restart the web app in a clean environment
- confirm frontend and API can both start together without conflicting listeners
- confirm the local app loads successfully through the expected dev URL

Files/areas involved:

- root workspace scripts in `package.json`
- `apps/web/package.json`
- `apps/api/package.json`
- local environment and port management

Dependencies:

- none; must happen before all other validation

### 2. Verify full app health from startup to route response

Purpose: prove that the stack reaches a healthy runtime state.

Required actions:

- verify app startup sequence
- verify `/health` and `/ready` endpoints where present
- confirm API starts without Prisma/client initialization issues
- confirm frontend responds without stale route blockers

Files/areas involved:

- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/src/routes/*`
- Prisma startup path and environment checks

Dependencies:

- P0.1 must be complete first

### 3. Validate database schema sync and seed assumptions

Purpose: ensure the database is in a coherent, testable state.

Required actions:

- verify Prisma schema and migrations/state alignment
- run schema-based generation and sync checks in the current environment
- validate the difference between test fixtures and production data assumptions
- document exact seed/test data boundaries

Files/areas involved:

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/seed.ts`
- project environment configuration

Dependencies:

- P0.2 must be complete first

## P1 — Validate the actual product surface

### 4. Verify auth and RBAC end-to-end

Purpose: confirm roles and permissions work under real HTTP calls.

Required actions:

- test login and registration flows
- test session/cookie/jwt handling
- test `ADMIN`, `OFFICER`, `MP`, `CITIZEN`, and `CONTRACTOR` routes
- verify route-level auth enforcement and permission gating

Files/areas involved:

- `apps/api/src/middleware/auth.ts`
- `apps/api/src/auth/rbac.ts`
- `packages/shared/src/permissions.ts`
- `apps/api/src/routes/index.ts`
- `apps/api/src/routes/auth.ts`

Dependencies:

- P0 complete

### 5. Validate project CRUD and filtering with real data

Purpose: confirm project creation, reads, filters, and updates are trustworthy.

Required actions:

- validate create/list/detail/update/delete flows
- test role-based project visibility
- check project location and status handling
- confirm seeded or ingested project data matches assumptions

Files/areas involved:

- `apps/api/src/routes/projects.ts`
- `packages/domain/src/services/projectService.ts`
- `packages/domain/src/validation/projectSchemas.ts`
- `apps/web/src/hooks/useProjects.ts`
- `apps/web/src/app/(dashboard)/projects/*`

Dependencies:

- P0 and P1.4

### 6. Validate the satellite pipeline against real project locations

Purpose: confirm the real observation path is usable and honest.

Required actions:

- test CDSE provider behavior under actual credentials or controlled fallback states
- verify `NO_USABLE_OBSERVATION` handling is real and not masked as failure
- check weekly checkpoint generation and target-date logic
- validate time-machine outputs against actual project coordinates and windows

Files/areas involved:

- `apps/api/src/services/cdseService.ts`
- `apps/api/src/services/satelliteEOAnalysis.ts`
- `apps/api/src/routes/satellite.ts`
- `apps/web/src/components/satellite/*`
- `apps/web/src/app/(dashboard)/projects/[id]/time-machine/*`

Dependencies:

- P0 complete
- project data path must already be valid

### 7. Validate change analysis and risk outputs

Purpose: prove the scoring and classification logic is not just code present, but actually usable.

Required actions:

- validate provider selection and fallback behavior
- test change classification outputs against real sample project states
- confirm risk summary/finding generation works with real DB data
- validate API responses and frontend display of these outputs

Files/areas involved:

- `apps/api/src/services/changeAnalysisEngine.ts`
- `apps/api/src/services/changeAnalysisProviders/*`
- `apps/api/src/routes/*` for analysis/risk endpoints
- `apps/web/src/components/changeAnalysis/*`
- `apps/web/src/components/risk/*`

Dependencies:

- P1.5 and P1.6

### 8. Verify production-data assumptions and ingestion quality

Purpose: ensure the project is not silently depending on demo-only or fixture-only assumptions.

Required actions:

- determine which data came from ingestion scripts and which was generated for testing
- compare project data assumptions to actual available sources
- verify whether real MPLAD or public project data is being used consistently
- document exactly what remains synthetic or fixture-based

Files/areas involved:

- `scripts/ingest/*`
- `packages/db/prisma/seed.ts`
- `auto-seed.js`
- any ingestion README and production docs

Dependencies:

- P0 and P1.5

## P2 — Reliability, quality, and cleanup

### 9. Harden runtime reliability and error handling

Purpose: make the app robust enough to survive real traffic and actual misconfigurations.

Required actions:

- verify graceful failure for missing env vars and provider outages
- confirm structured logging and error handling are consistent
- test database failure handling and retries where appropriate
- verify fallback states for provider unavailability

Files/areas involved:

- API service layer and route error handling
- logging utilities
- environment/config handling

Dependencies:

- P1 complete

### 10. Frontend route-by-route runtime QA

Purpose: confirm the UI works with the real backend signal path.

Required actions:

- verify dashboard, project pages, and role-specific pages render in a clean environment
- check empty-state behavior, loading states, and auth redirects
- validate route-level data fetching and error states

Files/areas involved:

- `apps/web/src/app/**`
- `apps/web/src/hooks/**`
- shared API client layer

Dependencies:

- P1 complete

### 11. Security and policy verification

Purpose: ensure access control and sensitive data handling are actually safe.

Required actions:

- validate JWT/cookie behavior and auth secrets
- re-check permission checks for cross-role access paths
- review file upload/document access paths
- confirm data exposure is not leaking beyond intended scopes

Files/areas involved:

- `apps/api/src/middleware/auth.ts`
- `apps/api/src/routes/**`
- `packages/shared/src/**`
- app security headers and config

Dependencies:

- P1 complete

## P3 — Documentation, polish, and deployment hygiene

### 12. Prune stale claims and align docs to real state

Purpose: keep docs honest and current.

Required actions:

- remove or downgrade stale milestone claims that are not backed by current verification
- preserve architecture docs only where they still match source reality
- keep an authoritative “current state” document updated as the repo matures

Files/areas involved:

- `docs/**`
- deployment status notes
- project-state docs

Dependencies:

- P0-P2 complete enough to know the real state

### 13. Deployment validation and production hygiene

Purpose: ensure deployment is based on real environment readiness, not just config files.

Required actions:

- validate deployment configuration against actual workspace layout
- confirm environment variables, build steps, and runtime assumptions are coherent
- verify services can run in the expected deployment topology

Files/areas involved:

- root deployment files and docs
- `apps/web/next.config.ts`
- `render.yaml` and related deployment docs

Dependencies:

- P0-P2 complete

## Recommended execution order

1. P0 stabilization
2. P1 end-to-end validation of auth + project + satellite + risk
3. P2 reliability and safety checks
4. P3 docs/deployment cleanup

## Decision rule for continuation

The project should continue only after these conditions are met:

- clean boot state restored
- DB schema and app startup validated
- auth + RBAC smoke tests pass
- project routes work with real data assumptions
- satellite pipeline behavior is verified, including no-data paths
- risk/change-analysis outputs are demonstrably valid

Until then, new feature work should be considered premature.

## Final recommendation

The current repo is not “done,” but it is not a dead project either. It should continue, but only as a disciplined verification-and-stabilization effort. The next move is to clear the runtime blockers and prove the core flows before claiming broader functionality.
