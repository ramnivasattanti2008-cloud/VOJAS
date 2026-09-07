# VOJAS Deployment Status — M17

**Date:** 2026-09-07
**Phase:** M17 Deployment Hardening (Final)

---

## Current State

- **Repository:** pnpm monorepo at `apps/api` (Express + Prisma) and `apps/web` (Next.js 15)
- **Latest commit:** `0b7ba93` (M25 deploy config update)
- **Type checks:** 5/5 packages clean
- **Build:** 7 static + 45 dynamic pages, 0 errors

---

## Deployment Targets

| Platform | Service | Status | URL |
|----------|---------|--------|-----|
| Vercel | Frontend | NEEDS REDEPLOY | `vojas-frontend.vercel.app` (stale) |
| Render | Backend | NEEDS REDEPLOY | `vojas-backend.onrender.com` (sleeping) |
| Neon | Postgres | OPTIONAL | Currently using Render postgres |

---

## M17 Hardening Changes

### 1. `vercel.json` updated
- **Old:** Pointed to legacy `backend/dist/server.js` and `frontend/dist/index.html`
- **New:** Monorepo-aware, uses `apps/web/.next` output, sets `NEXT_PUBLIC_API_URL` from env, adds security headers
- **Fix:** `outputDirectory`, `framework: "nextjs"`, `buildCommand: "cd apps/web && pnpm install && pnpm build"`

### 2. `render.yaml` updated
- **Old:** `rootDir: apps/api` but referenced non-existent `./Dockerfile`
- **New:** `runtime: docker` with `dockerfilePath: ./Dockerfile` — user must build Dockerfile OR switch to Node runtime
- **Health check path:** `/api/v1/health` (correct)

### 3. `docs/security-audit.md` created
- Full red-team pass: IDOR, privilege escalation, prompt injection, PII leakage
- 39/46 items PASS, 3 PARTIAL, 4 NOT VERIFIED

### 4. `docs/performance.md` created
- Frontend build, bundle analysis, CWV targets
- Database indexes, PostGIS GIST
- 98/98 domain tests, 60/60 RBAC smoke tests, 44/44 legacy smoke tests

### 5. `docs/reliability.md` created
- Health checks, backups, migration safety
- Failure modes, error handling, graceful shutdown
- 19/20 reliability items PASS or PARTIAL

### 6. `docs/PRODUCTION_READINESS.md` created
- 46-item final checklist
- **Gate Decision: CONDITIONAL PASS** — staging-ready, full production needs live verification

---

## Live Deployment Manual Steps

### Vercel (Frontend)
1. Visit https://vercel.com/dashboard
2. Find `vojas-frontend` project
3. Settings → General → Root Directory: `apps/web`
4. Settings → Build & Development:
   - Build Command: `cd ../.. && pnpm install && pnpm --filter @vojas/web build`
   - Output Directory: `.next`
   - Install Command: `cd ../.. && pnpm install`
5. Settings → Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://vojas-backend.onrender.com`
6. Deployments → Redeploy

### Render (Backend)
1. Visit https://dashboard.render.com
2. Find `vojas-backend` service
3. Settings → Build & Deploy:
   - Root Directory: `apps/api`
   - Build Command: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @vojas/api build`
   - Start Command: `cd apps/api && node dist/server.js`
   - OR use Dockerfile (recommended)
4. Environment:
   - `NODE_ENV=production`
   - `DATABASE_URL` = (from Render postgres or Neon)
   - `JWT_SECRET` = (32+ chars, generate with `openssl rand -hex 32`)
   - `ALLOWED_ORIGINS` = `https://vojas-frontend.vercel.app`
   - `CLIENT_BASE_URL` = `https://vojas-frontend.vercel.app`
5. Health Check Path: `/api/v1/health`
6. Manual Deploy → Deploy latest commit

### Database (Neon — recommended for free tier)
1. Visit https://neon.tech
2. Create project: `vojas-prod`
3. Copy connection string to `DATABASE_URL` in both Vercel and Render
4. Run initial migration:
   ```bash
   cd packages/db
   DATABASE_URL=<neon-url> pnpm prisma migrate deploy
   ```
5. Optional: seed data
   ```bash
   DATABASE_URL=<neon-url> pnpm db:seed
   ```

---

## Smoke Test After Deploy

```bash
# Backend
curl https://vojas-backend.onrender.com/api/v1/health
# Expected: { "success": true, "data": { "status": "ok", "timestamp": "..." } }

# Frontend
curl -I https://vojas-frontend.vercel.app
# Expected: HTTP/2 200

# End-to-end
# 1. Open https://vojas-frontend.vercel.app
# 2. Navigate to /command-center (public)
# 3. Login with test credentials
# 4. Verify dashboard loads
# 5. Submit a test citizen report
```

---

## Known Issues & Mitigations

| Issue | Mitigation |
|-------|------------|
| Render free tier sleeps after 15min idle | Upgrade to starter ($7/mo) or use Cyclic |
| No CSP header | Add nonce strategy in Phase 18 |
| JWT in localStorage (XSS risk) | Accepted trade-off for MVP |
| No Sentry config (dep installed) | Add `SENTRY_DSN` env, init in server.ts |
| In-memory job queue | Replace with BullMQ+Redis in Phase 18 |

---

*Document maintained by M17 — Deployment Hardening*
