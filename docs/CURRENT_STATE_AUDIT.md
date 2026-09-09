# VOJAS Current State Audit

Date: 2026-09-08
Scope: Fresh repository audit based on current source and verified runtime checks, not on prior milestone claims.

> **Status update (2026-09-08):** The environment blockers described below
> were resolved after this audit was written. PostgreSQL/PostGIS is running
> locally, the API and frontend are reachable, Prisma generation succeeds, and
> the workspace typecheck/build/test gates pass. See
> `docs/M27_DATABASE_ENVIRONMENT.md` for current evidence.

## Executive summary

VOJAS is not a blank or abandoned project. The repository contains a large monorepo with a real API, a Next.js app, Prisma schema, shared packages, and many feature modules. The actual problem is not lack of code breadth: the problem is that the codebase is not yet proven operational end-to-end.

The repo currently sits in a partial but promising state:

- The monorepo structure is real and coherent.
- The Prisma schema and server code are present and substantial.
- The app shell and many route groups exist in source.
- Feature scaffolding covers auth, RBAC, project management, satellite, change analysis, risk, and dashboard flows.
- Runtime validation is still incomplete because production-grade boot, DB sync, and data-path verification are not fully complete.

This means the repo is better described as “feature-rich but not yet fully validated” rather than “done.”

## Method used for this audit

This audit was based on:

- Fresh file inspection of the current repo state
- Current package configuration and workspace scripts
- Fresh Prisma generation check
- Fresh full-stack boot attempt
- Direct review of the actual implementations in API, web, db, and shared packages

Important constraint: no feature-building was done for this pass. This is an audit-only status report.

## Verified runtime state

### Verified immediately

- `pnpm db:generate` succeeds.
- Prisma client generation completed successfully in the workspace.
- The web/API monorepo is currently running through the workspace services on ports 3000 and 5000.
- The API and frontend health checks are reachable; no active port conflict blocks local verification.

### Fresh evidence

Observed during the original audit:

- `pnpm db:generate` output: Prisma generated successfully.
- `pnpm dev` launched both apps, but the web app failed with `EADDRINUSE: address already in use :::3000`.
- This was resolved by reusing the active listener and validating the live route stack after database recovery.

## Feature status by area

The table below reflects the repo as it currently exists, not the project history claims in old milestone docs.

| Area | Status | Assessment |
|---|---|---|
| Monorepo workspace layout | COMPLETE | The repo is a real pnpm monorepo with `apps/api`, `apps/web`, `packages/*`, and shared tooling. |
| Prisma schema and client generation | COMPLETE (runtime prerequisite) | Schema exists and generation works after running `pnpm db:generate`. |
| API boot structure | PARTIAL | The API code and Express app structure are present and logically wired; the full stack is not yet proven live due to app boot and dependency validation gaps. |
| Web app boot | BROKEN / BLOCKED | The web app cannot bind to port 3000 while a stale process is still occupying it. |
| Auth implementation | PARTIAL | Auth middleware, JWT/session logic, and role/permission scaffolding exist in source; end-to-end login flow still needs fresh validation. |
| RBAC model | PARTIAL | The permission matrix exists and is structured; runtime enforcement must still be validated across real routes and role combinations. |
| Project CRUD | PARTIAL | Route code, domain validation, and API client methods exist; full CRUD and authorization behavior still require live verification. |
| Data ingestion / seeded data | PARTIAL | There are ingestion scripts and a test-seed file, but production-grade real data verification has not been proven. |
| Satellite imagery pipeline | PARTIAL | CDSE service and EO analysis code exist with real provider logic and anti-fabrication safeguards; live provider behavior is still not verified under actual credentials and real project data. |
| Time Machine / checkpoints | PARTIAL | The infrastructure exists, but it is not confirmed to be running end-to-end with real observations or clean fallback states. |
| Change analysis engine | PARTIAL | Provider abstraction, scoring logic, and change classification code exist; published behavior is not yet certified against live results. |
| Risk engine / findings | PARTIAL | Code exists for findings and risk scoring; live result quality and route behavior remain unverified. |
| AI/interpretation features | PARTIAL | AI-related infrastructure is present, but there is no fresh runtime proof of real output quality. |
| Frontend route pages | PARTIAL | Many feature pages exist in source; the route tree is broad but not yet fully verified in a clean running environment. |
| Demo/test-only seed data | COMPLETE AS TEST DATA | The seed file is explicitly labeled as test fixture data and is not production data. |
| Production deployment readiness | NOT VERIFIED | Deployment config and docs exist, but the live stack has not been proven healthy in a clean environment. |

## Major findings

### 1. The repo is substantially implemented, but not operationally closed

This project contains broad architecture and feature work across:

- `apps/api/src/routes/*`
- `apps/api/src/services/*`
- `apps/web/src/app/*`
- `packages/domain/src/*`
- `packages/shared/src/*`
- `packages/db/prisma/*`

That breadth is real and significant. However, this does not equal operational completion. The repo is not yet at the point where a clean start, full login flow, and data-backed user journey are proven.

### 2. The biggest concrete blockers are environmental and validation gaps

The current verified blockers are:

- stale process occupying port 3000
- need to re-run the app in a clean environment
- incomplete end-to-end validation of authentication and project flows
- no fresh proof that real satellite integrations work under live credentials
- no fresh proof that the risk and analysis pipelines operate correctly with real database data

### 3. The repo has real functionality, but not fully trustworthy “done” state

The code shows intent and a serious implementation effort, especially in:

- CDSE/Sentinel-2 integration
- RBAC/permission model
- project routes and user roles
- time machine and satellite checkpoint logic
- domain validation and service structure

But the repo still needs a disciplined verification pass before it can be declared reliable.

### 4. Prior milestone docs are not sufficient evidence on their own

The repository includes documentation that describes milestone completion states, but the actual repository had to be audited directly. This means milestone claims should be treated as historical artifacts, not as proof of current health. The right status is based on current runtime facts and source inspection.

## Area-by-area assessment

### Runtime and development environment

Status: PARTIAL / BLOCKED

What is present:

- pnpm workspace scripts
- separate API and web packages
- Prisma generation path
- `tsx` dev server for API
- Next.js dev server for web

What is not verified:

- clean dev boot on a fresh port without stale process interference
- full monorepo startup under a non-stale environment
- end-to-end health route validation from app startup to web access

### API architecture

Status: PARTIAL

What is present:

- route grouping and mounting
- middleware for auth and permission enforcement
- health endpoints in the app structure
- service layer split for DB, satellite, and analysis

What remains uncertain:

- whether each route module is sound under live data and policy conditions
- whether the app passes startup, DB connectivity, and auth smoke checks in sequence

### Auth and RBAC

Status: PARTIAL

What is present:

- `packages/shared/src/permissions.ts` defines a role-permission matrix
- middleware code exists to authenticate and enforce permission sets
- route wiring suggests broad role support

What remains required:

- verify role enforcement in real HTTP calls
- test users and access paths against real seeded data
- confirm `ADMIN`, `OFFICER`, `MP`, `CITIZEN`, and `CONTRACTOR` flows are behaving as expected

### Project and data model

Status: PARTIAL

What is present:

- Prisma schema with project, user, event, location, and role-related models
- test seed data for fixture projects
- project APIs and client modules

What remains required:

- verify migration/sync correctness
- verify project creation, read, update, and filtering under auth boundaries
- ensure data is not implicitly relying on test-only fixtures for production behavior

### Satellite and time-machine pipeline

Status: PARTIAL

What is present:

- real CDSE OAuth/token logic
- STAC search code and WMS tile generation
- `NO_USABLE_OBSERVATION` status handling
- weekly checkpoint lifecycle logic
- explicit anti-fabrication contract

What remains required:

- live credential validation
- end-to-end observation fetch testing against actual project coordinates
- fallback and error-state verification for no-data conditions
- confirmation that checkpoint generation is valid under real conditions

### Risk and analysis logic

Status: PARTIAL

What is present:

- analysis services and risk-related route layers
- scoring heuristics and change-classification logic
- API client surfaces for analysis endpoints

What remains required:

- actual output verification on real project states
- comparison to ground truth or reasonable benchmark workflows
- validation that findings and summaries are not ghost outputs from dead code paths

### Frontend

Status: PARTIAL

What is present:

- a large Next.js dashboard app
- project detail views
- time-machine, satellite, risk, docs, and related tabs
- lazy-loaded components and a broad API client surface

What remains required:

- clean run in an unblocked environment
- page-by-page render validation
- route-level auth + project data validation

## Current risk classification

### High-risk issues

1. Clean runtime is not yet established due to stale port blocking.
2. Full-stack health is not confirmed after Prisma generation.
3. Auth and RBAC enforcement are not fresh-verified in live conditions.
4. Real data integration and provider behavior are not yet validated.

### Medium-risk issues

1. Repository includes a large number of feature modules that may be partially complete but not lifecycle-tested.
2. Existing milestone docs may overstate completion relative to current runtime reality.
3. The API and web layers may be ahead of verification and data integrity assurance.

### Low-risk or positive signals

- Architecture is coherent and deliberate.
- Prisma schema and service patterns show substantial thought.
- Real provider logic exists for satellite work.
- There is explicit emphasis on anti-fabrication and controlled system behavior.

## Bottom line

VOJAS is not a fake or placeholder repo. It is a real, feature-heavy monorepo with substantial work already in place. But it is still in a “partially integrated and not yet fully validated” state. The current evidence supports continuing the project, but only after the runtime and validation backlog is cleared.

This is not a green “production-ready” state, and it is not a red “throw it away” state. It is a realistic “continue with disciplined verification” state.
