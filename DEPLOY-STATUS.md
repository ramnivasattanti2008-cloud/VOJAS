# VOJAS Deployment Status — M25 (2026-09-07)

## Current Commit
```
b7f51a0 docs: PROJECT_STATE — M24 committed, build verified
```

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
| Render `render.yaml` | NEEDS UPDATE | References `rootDir: backend` and `rootDir: frontend` — old paths. Needs `apps/api` and `apps/web` |
| Database URL on Render | UNKNOWN | `render.yaml` uses Render-managed PostgreSQL. The actual Render dashboard secret must be verified |
| Prisma schema uncommitted | RISK | `packages/db/prisma/schema.prisma` modified but not committed |
| New domain services uncommitted | INFO | 4 new analytics service files in `packages/domain/src/services/` — untracked, not blocking deploy |

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
1. Go to https://dashboard.render.com → vojas-backend
2. Click **Manual Deploy** → **Deploy latest commit**
3. Wait ~60s for free-tier wake-up + build
4. Verify: `curl https://vojas-backend.onrender.com/health`
5. If deploy fails, update `render.yaml`:
   - `rootDir: backend` → `rootDir: apps/api`
   - Update `dockerfilePath` if needed

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

### Issue 1: Stale vercel.json at root
**Impact**: Low (Vercel dashboard overrides CLI config).  
**Fix**: Delete `vercel.json` at root OR create `apps/web/vercel.json` to supersede it.

### Issue 2: CORS origins not set on Render
**Impact**: Frontend calls to backend will be blocked in production.  
**Workaround**: In Render dashboard for vojas-backend, set environment variable:
`ALLOWED_ORIGINS=https://vojas-backend.onrender.com,https://vojas-frontend.vercel.app`

### Issue 3: Prisma schema modified but uncommitted
**Impact**: `packages/db/prisma/schema.prisma` has uncommitted changes.  
**Workaround**: Run `git diff packages/db/prisma/schema.prisma` and decide whether to commit before deploy.

### Issue 4: 4 untracked domain service files
**Impact**: None for deploy. `analyticsEngine.ts`, `benchmarkService.ts`, `forecastingService.ts`, `scenarioService.ts` are untracked but won't affect the build.

### Issue 5: Render free tier auto-sleep
**Impact**: Backend takes 30-60s to respond after dormancy.  
**Workaround**: Upgrade to Render "Starter" ($7/month) for always-on backend, or use a ping cron job.

---

## Commit After Fixes

Once the deploy is verified live, commit with:
```
git add -A
git commit -m "M25: NEO monorepo deployed — Next.js on Vercel, API on Render"
```

---

*Last verified: 2026-09-07. Backend may wake up after manual deploy trigger on Render dashboard.*
