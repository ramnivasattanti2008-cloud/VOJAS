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

- **Active Agent Right Now**: `Claude` (all backend/build items closed out; see 🔴 deployment finding below) ➔ Antigravity is on `ReportForm.tsx` (GPS opt-out fix, uncommitted as of this writing — already addresses the item Claude flagged)
- **🔴 DEPLOYMENT — `vojas-backend.onrender.com` is not responding, needs dashboard access to diagnose**:
  Checked as part of "make this a complete working model": the live Render backend
  does not answer requests at all. `curl -v` shows DNS resolving to real Render
  edge IPs and the TLS handshake completing, but the HTTP request then hangs with
  zero bytes back past 60s — no 502/504, just silence. Vercel's own `/api/v1/*`
  rewrite to the same host fails with `DNS_HOSTNAME_RESOLVED_PRIVATE`. The
  frontend itself is live and serving 200s at `vojas-web.vercel.app`. This isn't
  something fixable by editing files in this repo — it needs the Render dashboard
  (service status, logs, whether it's suspended/spun down/crash-looping) or
  Render API credentials, neither of which this session has. Whoever has
  dashboard access should check it before calling this deploy healthy — the code
  on `master` is verified correct (typecheck/lint/tests/build all green) but that
  doesn't mean the running service reflects it.
- **⚠️ IMPORTANT — read before you push anything**: `origin/master` was restored to real history via `git push --force-with-lease`. Never force-push over master.
- **RESOLVED — the report-update security hole flagged below is fixed** (`0acda0f`, `26c4e63`):
  `POST /reports/track/:reportReference/update` no longer accepts `newStatus` at
  all (status transitions are an officer-only action via the authenticated route),
  returns only `{ reportReference, status, noteRecorded }` instead of the full
  Prisma row, requires a 10+ character note, and sits behind the report-submit
  rate limiter. 3 regression tests added — the endpoint previously had none.
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
- **Done by Claude this cycle** (`0acda0f`, `26c4e63`), all independently audited first:
  1. **AI engine no longer fabricates evidence** (`apps/api/src/services/llmDetectionService.ts`)
     — it never actually ran an LLM or read a single satellite row despite being
     named "Neural-LLM Core" and citing NDVI/NDBI. A hardcoded string match on
     `project.description.includes('barren scrubland')` (a literal from the demo
     seed data) alone forced a CRITICAL "ghost work" verdict with fabricated
     Sentinel-2 evidence and hardcoded confidence scores. Now reads real
     `SatelliteObservation` rows, returns `NO_USABLE_OBSERVATION` when none exist,
     derives confidence from actual evidence present, and words verdicts as
     indicators for human verification rather than fraud findings.
  2. **Report follow-up endpoint hardened** — see resolved item above.
  3. **CORS allowlist was dead code**: the origin callback's final branch
     unconditionally returned `callback(null, true)`, so with `credentials: true`
     any website could make authenticated requests using a visitor's session
     cookie. Restored real rejection.
  4. **Production cookies were losing `Secure`**: `secure` depended solely on
     `COOKIE_SECURE`, which is set nowhere in `render.yaml` or any `.env.example`.
     Now also defaults true when `NODE_ENV === 'production'`.
  5. **`GET /reports/public` had an unclamped `limit`** — unauthenticated,
     unbounded query over a 60k+ row table. Clamped to 100.
  6. **`ReportMedia.captureDate` was fabricated** from the uploaded file's
     server-side mtime and surfaced as forensic evidence timing. Now returns no
     value rather than a placeholder, so callers fall back to the honest
     `uploadedAt`.
  7. **`eslint.config.mjs` had a silent no-op**: `tseslint.configs.recommended` is
     an array in typescript-eslint v8, and `.rules` on an array is `undefined` —
     `...tseslint.configs.recommended.rules` spread nothing. The entire
     typescript-eslint recommended ruleset (including `no-explicit-any` and
     `prefer-const`) was never actually enforced despite `pnpm lint` showing 0
     errors. Fixed the spread; `no-explicit-any` starts at `warn` (real existing
     backlog, same tier as this file's other pre-existing hygiene rules) rather
     than `error`, so it's visible without breaking the gate on debt it newly
     surfaces. This also caught a real bug: `geeProvider.ts`'s `let ee = null`
     was never reassigned on the success path — the dead-module-state bug
     `CLAUDE.md` documents by name. Fixed with proper caching + typing.
  8. Verified every item above: 6/6 typecheck, 0 lint errors (694 now-visible
     warnings, up from 397 — genuinely inert rules turning on, not new debt),
     20/20 test suites (3 new), `@vojas/web` production build.
- **Done by Claude, next cycle** (`c2fc65a`):
  - Report submission's three related writes (`Report`, `AnonymousReportAccess`,
    initial `ReportStatusLog`) now run inside one `prisma.$transaction` instead
    of three sequential awaits, closing the "access token orphaned on partial
    failure" finding. Verified: 6/6 typecheck, 0 lint errors, 20/20 test suites,
    `@vojas/web` build — all before pushing.
- **Left as a documented judgment call, not a bug**: `reportReference` format
  (`VOJAS-YYYY-XXXX`, 4 alphanumeric chars, ~1.68M values/year) is guessable
  in principle, but the write surface reachable by guessing it is now just a
  rate-limited follow-up note with no status/PII exposure — changing the
  output format is a UX decision, not something to do silently.
- **Next for Claude**:
  - 694 lint **warnings** visible (was 397 — mostly newly-active
    `no-explicit-any` that the config bug above was hiding, not new debt). None
    block the gate. Triage toward tightening `no-explicit-any` back to `error`
    once addressed.
- **RESOLVED by Antigravity (apps/web)**:
  - `ReportForm.tsx`: Fixed GPS and project link opt-out controls. When `unknownLocation` or `unknownProject` are checked, coordinates/projectId are cleared from state, and `handleSubmit` strictly guards with `!formData.unknownLocation` and `!formData.unknownProject` so no coordinates or project links are ever transmitted upon opt-out.
  - `ReportForm.tsx`: Removed duplicate `OTHER` and duplicate legacy keys from `CATEGORIES`, standardizing on 11 unique canonical domain categories with unique React keys.
  - Full verification gate passed: 6/6 typecheck, 0 lint errors, 20/20 test suites (340/340 tests pass), and `@vojas/web` production build passed cleanly.

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
