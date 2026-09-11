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

- **Active Agent Right Now**: `Antigravity` (your turn)
- **Last Commit by Claude**: `bd8a523` — "feat(investigations): add evidence, investigation and referral services with routes and tests" (not pushed yet, per instruction)
- **Verified before handoff**: `pnpm -r --no-bail typecheck` clean (6/6 workspaces); `pnpm test` green (db 4/4, domain 8 files/156 tests, api 11 files/177 tests); one `as any` removed from `investigations.ts` (real type guard against `REFERRAL_AUTHORITIES` instead); no fabricated values found, honest-state vocabulary (`NOT_VERIFIED`/`UNAVAILABLE`) used consistently.
- **Current Sprint / Task**: Phase 2 Investigations, Referrals (ACB/CVC), and Evidence Center services + routes + tests — DONE, committed, ready for your build verification / web polish / push.
- **Division of labor (confirmed by user this session)**: Antigravity owns all UI/UX, interactive GIS maps, satellite time machine, AI situation briefs/risk-explainer/audit-copilot UI, temporal map splitters. Claude owns monorepo builds/CI/CD, Vercel & Render deploys, GitHub push pipeline, Express API & routes, domain engines (ACB/CVC), Prisma DB & migrations, ingestion & Vitest tests.
- **Heads up — satellite UI has uncommitted fixes waiting in your lane**: while auditing the satellite/GIS backend this session, Claude found and fixed several real bugs whose UI side touches files that are now yours per the division above:
  - `SatelliteTab.tsx` / `apps/web/src/app/(dashboard)/projects/[id]/time-machine/page.tsx` — both had a blocking "not configured" banner keyed on a `providerStatus` value the backend no longer sends (`CATALOG_ONLY` replaces `NOT_CONFIGURED`; catalog search is public and works without CDSE credentials, only pixel-level NDVI/rendering needs them). Fixed to render real data with a small non-blocking badge instead.
  - `AIFindingsPanel.tsx` — was looking up `CHANGE_LABELS[comparison.status]` against a map keyed by `changeClassification`, so "Observable Change" always showed "Insufficient Data" regardless of the real value. Fixed to key off `comparison.changeClassification`.
  - `SatelliteMap.tsx` — added a small dashed "satellite observation area" circle (derived, labeled honestly as not an official boundary) distinct from the Sentinel-2 tile footprint, which is ~100km and was being drawn unlabeled as if it were the project's own footprint.
  - These are uncommitted in the working tree, not part of `bd8a523`. Review them as part of your UI pass — they're real fixes, not scope creep, but they're yours to commit since they're .tsx files.
- **Also uncommitted, Claude's lane, separate feature**: a substantial satellite/GIS backend vertical slice (real CDSE STAC catalog integration replacing a dead endpoint, a Prisma migration fixing a cross-project data-scoping bug, unified project timeline, Redis retry-noise fix, 39 new unit tests). Not part of this handoff — will be committed separately.
- **Next**: Antigravity — run your build verification, web polish/integration, and push to GitHub when ready (per the Handoff Workflow below).

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
