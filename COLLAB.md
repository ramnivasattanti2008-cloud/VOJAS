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

- **Active Agent Right Now**: `Antigravity` (Completed public map & budget tracker performance fixes) ➔ Handoff to `Claude`
- **⚠️ IMPORTANT — read before you push anything**: `origin/master` was restored to real history via `git push --force-with-lease`. Never force-push over master.
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
- **Next for Claude**:
  - Triage the remaining ~70-file backlog (`packages/domain/src/providers/*`, `riskEngine/`, `scripts/ingest/*`).
  - Address the 429 lint warnings.
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
