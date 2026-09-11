# VOJAS Deployment Status — M25 (2026-09-07)

## Current Commit
```
677b9b8 M25: final deployment verification + status doc
```
(Pushed to `master` on GitHub)

## Live URL Status

| Service | URL | Status | Notes |
|---------|-----|--------|-------|
| Frontend | https://vojas-frontend.vercel.app | **WRONG BUILD** | Serving old Vite SPA (pre-mono repo). Returns `<div id="root">` on all routes. |
| Backend | https://vojas-backend.onrender.com | **SLEEPING / TIMEOUT** | Render free tier spun down. `/health` and `/api/v1/health` both timeout (30s). Needs wake-up. |

**Root cause**: The live deployments were built from the **pre-monorepo** codebase (legacy `frontend/` + `backend/` directories). The NEO monorepo (`apps/api` + `apps/web`) has never been pushed to production.

---

## Pre-Deploy Checklist

| Item | Status | Notes |
|------|--------|-------|
| `apps/web/.env.example` | PARTIAL | Only lists `NEXT_PUBLIC_API_URL`. Missing: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_ENABLE_RQ_DEVTOOLS` |
| `apps/web/package.json` build script | OK | `"build": "next build"` — correct |
| Hardcoded localhost URLs | PARTIAL RISK | Export CSV endpoints use `process.env.NEXT_PUBLIC_API_URL` — good. But `next.config.ts` defaults to `http://localhost:5000` |
| `next.config.ts` Vercel-compatible | OK | No custom server. Standard Next.js. `transpilePackages` handles workspace packages |
| API health route | OK | `apps/api/src/app.ts` exposes `GET /health` and `GET /api/v1/health` — no auth |
| CORS allows Vercel domain | RISK | `ALLOWED_ORIGINS` defaults to `http://localhost:3000`. **Must be set to** `https://vojas-frontend.vercel.app` on Render |
| `apps/web/vercel.json` | **MISSING** | Root `vercel.json` points to legacy `backend/dist/` and `frontend/dist/` — not applicable to monorepo |
| Root `vercel.json` | STALE | References non-existent paths in the monorepo. Should be removed or replaced |
| Render `render.yaml` | UPDATED | `rootDir: backend` → `rootDir: apps/api`. Note: `apps/api/Dockerfile` doesn't exist yet |
| `apps/api/Dockerfile` | **MISSING** | Required for Render Docker runtime. Must be authored before Render deploy works |
| Database URL on Render | UNKNOWN | `render.yaml` uses Render-managed PostgreSQL. The actual Render dashboard secret must be verified |
| Prisma schema uncommitted | RISK | `packages/db/prisma/schema.prisma` modified but not committed |
| New domain services uncommitted | INFO | 4 new analytics service files in `packages/domain/src/services/` — untracked, not blocking deploy |
| `.github/workflows/deploy.yml` | UPDATED | Path filters now watch `apps/**` and `packages/**`. Docker build context moved to `apps/api`. Vercel working directory moved to `apps/web` |

---

## What Needs to Happen (Manual Steps)

### Step 1: Fix .env.example for production
```bash
# apps/web/.env.example should contain:
NEXT_PUBLIC_API_URL=https://vojas-backend.onrender.com/api/v1
NEXT_PUBLIC_APP_NAME=VOJAS
NEXT_PUBLIC_ENABLE_RQ_DEVTOOLS=false
```

### Step 2: Remove stale root vercel.json
The root `vercel.json` at project root is stale — it references legacy paths. Remove or replace it with a monorepo-aware config, or let Vercel auto-detect from `apps/web/`.

### Step 3: Connect Vercel to monorepo (do once)
1. Go to https://vercel.com/ramnivasattanti2008-cloud/vojas-frontend
2. Settings → Git → Disconnect current repo if needed
3. Reconnect to `ramnivasattanti2008-cloud/VOJAS`
4. Set **Root Directory** to `apps/web`
5. Set **Build Command**: `pnpm install --frozen-lockfile && pnpm --filter @vojas/web build`
6. Set **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` = `https://vojas-backend.onrender.com/api/v1`
   - `NEXT_PUBLIC_APP_NAME` = `VOJAS`
7. Save and trigger **Redeploy**

### Step 4: Wake up and redeploy Backend on Render
1. `apps/api/Dockerfile` now exists (see "Issue 6" below — resolved). No action needed here unless you want the Node-runtime alternative instead.
2. Go to https://dashboard.render.com → vojas-backend
3. **Settings → Build & Deploy**:
   - Docker (current render.yaml config): nothing to change — `dockerContext: .` and `dockerfilePath: ./apps/api/Dockerfile` are already set correctly for this pnpm workspace.
   - If using Node instead: Set Build Command = `pnpm install --frozen-lockfile && pnpm --filter @vojas/api build`, Start Command = `pnpm --filter @vojas/api start` (not plain `node dist/server.js` — the compiled ESM output is run through `tsx`'s loader; see `apps/api/package.json`'s own `start` script).
4. Set `ALLOWED_ORIGINS` env var to `https://vojas-frontend.vercel.app,https://vojas-backend.onrender.com`
5. Set `DATABASE_URL` env var to your actual PostgreSQL connection string
6. Click **Manual Deploy** → **Deploy latest commit**
7. Wait ~60s for free-tier wake-up + build
8. Verify: `curl https://vojas-backend.onrender.com/health`

### Step 5: Verify end-to-end
```bash
# After both deploy, verify:
curl https://vojas-backend.onrender.com/health
# Expected: {"status":"ok","timestamp":"..."}

curl https://vojas-frontend.vercel.app
# Expected: Full Next.js HTML page (not `<div id="root">`)
```

---

## Known Issues

### Issue 1: ~~Stale vercel.json at root~~ — RESOLVED, was already correct
Re-verified 2026-09-11: the root `vercel.json` correctly targets `apps/web` (`buildCommand: cd apps/web && pnpm install --frozen-lockfile && pnpm build`, `framework: nextjs`, `outputDirectory: apps/web/.next`) and rewrites `/api/v1/*` to the real backend. No action needed. (The `render.yaml` "Frontend (static)" service block, separately, is what's actually stale — see the note at the top of that file.)

### Issue 2: CORS origins not set on Render
**Impact**: Frontend calls to backend will be blocked in production.  
**Workaround**: In Render dashboard for vojas-backend, set environment variable:
`ALLOWED_ORIGINS=https://vojas-backend.onrender.com,https://vojas-frontend.vercel.app`

### Issue 3: ~~Prisma schema modified but uncommitted~~ — RESOLVED
Committed 2026-09-11 in `ea45851` (fixed the satellite-observation cross-project scoping bug — see that commit's message). `git status packages/db/prisma/schema.prisma` is clean.

### Issue 4: 4 modified domain service files (not untracked — already tracked, just changed)
**Impact**: None known yet. `analyticsEngine.ts`, `benchmarkService.ts`, `forecastingService.ts`, `scenarioService.ts` are tracked files with uncommitted local changes, predating this deploy-readiness pass. Not reviewed or committed here — check `git diff` on them before deploy, or ask whoever has been editing them.

### Issue 5: Render free tier auto-sleep
**Impact**: Backend takes 30-60s to respond after dormancy.  
**Workaround**: Upgrade to Render "Starter" ($7/month) for always-on backend, or use a ping cron job.

### Issue 6: ~~Missing `apps/api/Dockerfile`~~ — RESOLVED
Authored 2026-09-11 and verified with a real local build and run, not just written blind:
- `docker build -f apps/api/Dockerfile -t vojas-api-test .` from the repo root — succeeds (419MB image). Multi-stage: install with only manifests copied first (layer caching), then full source + `pnpm db:generate` + build `@vojas/db`/`@vojas/shared`/`@vojas/domain`/`@vojas/api`.
- `docker run` against the real dev Postgres container — connects, logs "Database connected" and "VOJAS API running", answers `GET /health` with 200 and `GET /api/v1/projects/public/summary` with real ingested data (60,369 projects).
- A real, pre-existing bug this surfaced and fixed along the way: the root `pnpm-lock.yaml` was out of sync with root `package.json` (missing `bcryptjs`), which made `pnpm install --frozen-lockfile` fail — this breaks in ANY CI/Docker context using `--frozen-lockfile`, not just this build. Regenerated and reverified.
- render.yaml's `vojas-backend` service updated: `dockerContext: .` (repo root) + `dockerfilePath: ./apps/api/Dockerfile`, with `rootDir` deliberately left unset — a pnpm workspace package's Docker build context must be the repo root (to see the other `workspace:*` packages), and Render's `rootDir` would have pointed the build context at `apps/api/` instead, where the build cannot succeed.
- Root `.gitignore` was excluding `.dockerignore` itself (added a real one alongside the Dockerfile) — silently defeating it in every environment that clones fresh. Fixed.

**Workaround (Option C — easiest)**: Use Render's "Node" runtime and skip the Dockerfile entirely. The Express + Prisma app doesn't need Docker for a single-instance deploy.

---

## Commit After Fixes

Once the deploy is verified live, commit with:
```
git add -A
git commit -m "M25: NEO monorepo deployed — Next.js on Vercel, API on Render"
```

---

*Last verified: 2026-09-07. Backend may wake up after manual deploy trigger on Render dashboard.*
