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
- **⚠️ IMPORTANT — read before you push anything**: `origin/master` was force-pushed to an unrelated orphan commit today (a "CivicShield AI" mock-data prototype, 938 files, -261k lines — deleted the entire real monorepo history on GitHub). Claude restored `origin/master` to the real history via `git push --force-with-lease`; nothing was deleted — that content is fully intact on its own `origin/civicshield-ui` branch. **If you're about to push and git complains about diverged/unrelated history, STOP and re-check `git log origin/master` before force-pushing anything** — don't assume your local history is right without comparing first.
- **4 commits by Claude this session, all pushed to `origin/master`**:
  - `ed7ae8a` — feat(investigations): evidence, investigation and referral services + routes + tests
  - `ea45851` — fix(satellite): live CDSE catalog, cross-project observation scoping bug, honest INSUFFICIENT_DATA states, unified timeline, redis retry noise (see commit body — it's long and specific)
  - `07c41e8` — docs(collab): handoff notes
  - `0314f4a` — fix(deploy): working `apps/api/Dockerfile` (built + run-tested against the real DB, not just written), fixed a stale root `pnpm-lock.yaml` that broke `--frozen-lockfile` installs everywhere, fixed `render.yaml`'s Docker build context for the pnpm workspace, flagged (not silently rewrote) a stale Render "Frontend (static)" block that deploys a dead Vite app instead of the real Next.js one (Vercel is the correct/current path, verified)
- **Verified before every commit**: `pnpm -r --no-bail typecheck` clean (6/6 workspaces); `pnpm test` green (db 4/4, domain 8 files/156 tests, api 11 files/177 tests); no fabricated values found; one `as any` removed.
- **Real data now in the local dev database** (not a git commit — this is DB state, won't appear when you `git pull`): ran `pnpm run ingest:vonter` for real — 60,359 real MPLADS project recommendations, 0 errors, verified they reach `GET /api/v1/projects/public/summary` and the project list with real state/work-description data. If your local dev DB is freshly seeded, it won't have this — run `pnpm run ingest:vonter` yourself to get it, or ask before re-seeding from scratch (it'll take a couple minutes, real network calls to nothing — the file's already cached locally).
- **Division of labor (confirmed by user this session)**: Antigravity owns all UI/UX, interactive GIS maps, satellite time machine, AI situation briefs/risk-explainer/audit-copilot UI, temporal map splitters. Claude owns monorepo builds/CI/CD, Vercel & Render deploys, GitHub push pipeline, Express API & routes, domain engines (ACB/CVC), Prisma DB & migrations, ingestion & Vitest tests.
- **Uncommitted satellite UI fixes waiting in your lane** (still sitting in the working tree, not part of any Claude commit):
  - `SatelliteTab.tsx` / `apps/web/src/app/(dashboard)/projects/[id]/time-machine/page.tsx` — both had a blocking "not configured" banner keyed on a `providerStatus` value the backend no longer sends (`CATALOG_ONLY` replaces `NOT_CONFIGURED`; catalog search is public and works without CDSE credentials, only pixel-level NDVI/rendering needs them). Fixed to render real data with a small non-blocking badge instead.
  - `AIFindingsPanel.tsx` — was looking up `CHANGE_LABELS[comparison.status]` against a map keyed by `changeClassification`, so "Observable Change" always showed "Insufficient Data" regardless of the real value. Fixed to key off `comparison.changeClassification`.
  - `SatelliteMap.tsx` — added a small dashed "satellite observation area" circle (derived, labeled honestly as not an official boundary) distinct from the Sentinel-2 tile footprint, which is ~100km and was being drawn unlabeled as if it were the project's own footprint.
  - Real fixes, not scope creep — yours to review and commit since they're `.tsx` files.
- **Also still uncommitted, NOT reviewed by Claude, don't assume it's safe**: a large pre-existing backlog — `packages/domain/src/providers/*` (8 files), several `packages/domain/src/services/*` including the whole `riskEngine/` subtree, `packages/api-client/src/*`, `scripts/ingest/*`, `apps/api/tests/integration/*` — predates this session, nobody has verified or committed it. Sort it into real commits before it grows further, or ask whoever's been editing it.
- **What's left for whoever's in the backend lane next** (Claude's lane, noted here for continuity): `scripts/ingest/lgd.ts` and `ingest:dataful` both need manual CSV downloads (upstream APIs are down/blocked — see `scripts/ingest/README.md` "Manual data download" and DEPLOY-STATUS.md); `opencity` 15th/16th Lok Sabha cached CSVs have a column-schema mismatch worth a fresh download; the ~70-file backlog above; 429 lint warnings (0 errors) not yet triaged for the two known bug classes CLAUDE.md calls out (silently-ignored request params, dead module state).
- **Next**: Antigravity — run your build verification, web polish/integration on the flagged satellite UI files, and push when ready (per the Handoff Workflow below). Re-read the CivicShield warning above before any force-push.

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
