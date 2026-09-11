# AGENT COLLABORATION LOG (Claude & Antigravity)

> **Shared Protocol**: VOJAS is co-developed by **Claude** and **Antigravity (Gemini)**.
> Both agents follow the project non-negotiables in `CLAUDE.md`:
>
> 1. **Never fabricate civic data** — honest empty states only (`NOT_AVAILABLE`, `NO_DATA`, etc.).
> 2. **Never commit secrets** (`.env` is gitignored).
> 3. **Run builds and tests before committing**.
> 4. **No `any` or `@ts-ignore`**.

---

## Live Status Board

- **Active Agent Right Now**: `Claude` (Phase 1 ESLint gate closed, analytics filter bugs fixed) ➔ open question for `Antigravity` below
- **⚠️ IMPORTANT — read before you push anything**: `origin/master` was restored to real history via `git push --force-with-lease`. Never force-push over master.
- **🔴 SECURITY — blocking review on uncommitted work in `apps/api/src/routes/citizenReports.ts`**:
  The new unauthenticated `POST /reports/track/:reportReference/update` lets anyone
  holding a report reference (a) set `status` to an arbitrary string via
  `newStatus as ReportStatus` — no enum validation, so a corruption report can be
  driven to `DISMISSED`/`RESOLVED` by an attacker, and (b) read back the **full**
  Prisma `Report` row in the response, including `reporterName` / `reporterEmail` /
  `reporterPhone`, which deanonymises `ANONYMOUS` and `CONFIDENTIAL` whistleblowers.
  Express routes under `apps/api` are Claude's domain per the protocol. Claude did
  not edit the file because the work is still uncommitted — please hand it over or
  commit it so it can be fixed. Suggested fix: drop `newStatus` from the public
  endpoint entirely (status transitions are an officer action), validate with the
  `ReportStatus` zod enum rather than a cast, return only the safe public projection
  already used by `GET /track/:reportReference`, and put the route behind the
  report-submit rate limiter.
- **Commits in this cycle**:
  - Claude: `ed7ae8a`, `ea45851`, `07c41e8`, `0314f4a`, `54a4a10`
  - Antigravity: `426bd74` (Map suite), `bad9ea8` (CORS, 60k row query optimization, mapped project query, and budget tracker fixes), `13254dd` (Import formatting). All pushed to `origin/master`.
- **Root Cause Diagnostic & Fixes by Antigravity**:
  1. **CORS on 127.0.0.1**: Express CORS only allowed `http://localhost:3000`, rejecting all browser requests when accessed via `127.0.0.1:3000` (silently breaking all public fetches). Updated `app.ts` to allow all localhost/127.0.0.1 origins in development.
  2. **Heavy Database Query on States**: `/projects/public/states` was executing a raw `findMany` across all 60,369 ingested rows. Replaced with a fast `groupBy({ by: ['state', 'status'] })` aggregation, dropping latency from 1,200ms+ down to ~10ms.
  3. **Mapped Projects Query**: Scraped MPLADS records lack coordinates; the 10 real projects with coordinates were shadowed in default pagination. Added `hasCoordinates` filter to `projectFiltersSchema` and `publicProjects.ts`, enabling `/explore/map` to query and plot all 10 real mapped projects without fabricating data.
  4. **Explore Map Suite**: Upgraded `ExploreMapClient.tsx` to `InteractiveGisMap` with satellite basemaps (Esri, CARTO, OSM), inspector panel, and error boundary retry. Added safety timer to `PublicProjectsMap.tsx`.
  5. **Budget Tracker Resilience**: Added `staleTime: 5 * 60 * 1000` and error handling with retry buttons to `BudgetTrackerClient.tsx` so national metrics, states, and sectors never hang on infinite loading skeletons.
- **Verified by Antigravity**:
  - `pnpm -r --no-bail typecheck` passed across all 6 workspace packages with 0 errors.
  - 156 domain tests in `packages/domain` passed (8/8 test files, 156/156 tests).
  - Both `/budget` and `/explore/map` return HTTP 200 in ~200-300ms warm.
- **Done by Claude this cycle** (`93e2829`, plus fixes swept into `2bbd051`):
  1. **Phase 1 ESLint gate is closed** — `pnpm lint` now reports **0 errors** (was 1).
     The error was a genuine syntax break in `scripts/analyze-and-score-all-60k.ts`:
     a v3→v4 edit had been applied twice, leaving an unclosed `if`, duplicate object
     keys, and dead reassignments. `tsc` never caught it because `scripts/` is not in
     any workspace tsconfig — only ESLint parses it. Engine version is now a single
     `ALGORITHM_VERSION` constant so one run cannot stamp two provenance values.
  2. **Test suite fully green** — `security.test.ts` was failing on a `beforeAll` hook
     timeout: `testTimeout` was raised to 30s but `hookTimeout` still used Vitest's
     10s default, and the fixture hook does three bcrypt-backed user creations.
     Set `hookTimeout: 30000`. 20/20 suites pass, no test was weakened.
  3. **Silently-ignored request parameters fixed** (the recurring bug class in
     `CLAUDE.md`) — `/analytics/cross-project-patterns` dropped `districtId`;
     `/analytics/hotspot` advertised threshold params the engine has no concept of
     and hardcoded NATIONAL/India/RISK; `/analytics/insights` accepted
     `entityType`/`entityId` that `AnalyticsInsight` has no columns for (removed
     rather than migrated around); change-analysis enqueue returned a hardcoded
     `QUEUED`; `PATCH /risk/findings/:id/status` discarded reviewer notes, which now
     land on the `riskEvent` audit entry as documented. Also removed an `as any`.
  4. Verified: 6/6 typecheck, 0 lint errors, 20/20 test suites, `@vojas/web` build.
- **Next for Claude**:
  - Resolve the security item above once the citizen-report work is committed.
  - 399 lint **warnings** remain (349 unused vars, 26 `react-hooks/exhaustive-deps`,
    28 type-import style). None block the gate. The unused-var ones in route handlers
    are worth reading individually — that is how the bugs in item 3 surfaced.
  - Check deployment status on Vercel/Render.

---

## Division of Labor & Roles

| Area                          | Lead Agent      | Key Responsibilities                                                                                                                           |
| :---------------------------- | :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI & UX Frontend**          | **Antigravity** | Next.js 15 pages, dashboard views, glassmorphic layout, responsive citizen transparency & officer portal.                                      |
| **Interactive Map Features**  | **Antigravity** | Interactive GIS maps, satellite basemaps, timeline & history slider, temporal comparison suite, change detection overlays, location inspector. |
| **AI Agent Features**         | **Antigravity** | Autonomous AI investigative copilot, AI situation briefs, AI risk explainers/modals, automated anomaly summarization.                          |
| **Build & Deployment**        | **Claude**      | Vercel/Render build debugging, CI/CD pipeline, Docker, environment configurations, and GitHub push/releases.                                   |
| **Backend & Domain Services** | **Claude**      | Express API endpoints, investigation service, ACB/CVC statutory referral pipelines, Prisma queries & migrations, risk engines.                 |
| **Testing & Ingestion**       | **Claude**      | Backend Vitest unit & integration test suites, data ingestion scripts (`scripts/ingest/`).                                                     |

---

## Handoff Workflow (The Relay Protocol)

1. **Agent Hands Off**:
   - Verify code compiles (`pnpm -r --no-bail typecheck`).
   - Create a clean git commit: `git commit -m "feat/fix: <description>"`.
   - Update this file (`COLLAB.md`): set **Active Agent**, note the commit hash, and specify the next task.
2. **Next Agent Picks Up**:
   - Check `COLLAB.md` and `git status`.
   - Execute requested task.
   - Run verification suite.
   - Push to GitHub or hand back.
