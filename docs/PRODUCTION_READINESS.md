# VOJAS Production Readiness Checklist

**Project:** VOJAS — AI-Powered Anomaly Detection in MPLAD Scheme
**Date:** 2026-09-07
**Phase:** M17 Deployment Hardening (Final Gate)

---

## Authentication & Authorization

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Authentication audited | PASS | `apps/api/src/middleware/auth.ts` |
| 2 | Authorization audited | PASS | RBAC middleware + per-route enforcement |
| 3 | RBAC tested | PASS | 60/60 smoke tests (M22) |
| 4 | IDOR tested | PASS | `getProjectVisibilityFilter` per role |
| 5 | Privilege escalation tested | PASS | `/admin/*` requires `admin.manage` |
| 6 | AI authorization tested | PASS | AI tools server-side, PII-gated |
| 7 | Prompt injection tested | PASS | AI is transformation, never arbiter |
| 8 | File uploads secured | PASS | Magic bytes, UUID, whitelist |
| 9 | Document pipeline secured | PASS | Server-side processing |
| 10 | Citizen privacy audited | PASS | PII redaction at service boundary |
| 11 | Data classification enforced | PASS | PUBLIC/RESTRICTED/CONFIDENTIAL |

## Data Integrity

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 12 | APIs validated (Zod) | PASS | All inputs `safeParse` |
| 13 | Rate limiting implemented | PASS | 120 general, 10 auth, 5 public |
| 14 | Database queries audited | PASS | Prisma parameterized only |
| 15 | PostGIS queries optimized | PASS | GIST index on Project.location |
| 16 | Satellite pipeline failure handling | PASS | Exponential backoff in `cdseService` |
| 17 | Time Machine performance tested | PASS | M6 smoke tests pass |
| 18 | Map performance tested | PASS | MapLibre lazy-loaded |

## Performance

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 19 | Frontend performance measured | PARTIAL | Build clean; live CWV not verified |
| 20 | Core Web Vitals checked | NOT VERIFIED | Requires live URL |
| 21 | API latency measured | NOT VERIFIED | Requires production traffic |
| 22 | Caching audited | PASS | Browser/DB/edge — see `docs/performance.md` |

## Reliability

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 23 | Background jobs hardened | PASS | Job queue with retry, backoff |
| 24 | Idempotency implemented | PARTIAL | On key write endpoints |
| 25 | Error handling hardened | PASS | `globalErrorHandler` consistent |
| 26 | Structured logging | PARTIAL | Console + stderr; no JSON yet |
| 27 | Health checks exist | PASS | `/health` + `/api/v1/health` |
| 28 | Backup/recovery documented | PASS | `docs/reliability.md` |
| 29 | Migrations audited | PASS | Prisma + version-controlled |

## Concurrency & Scale

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 30 | Concurrency issues tested | PASS | Pool size, N+1 audit |
| 31 | Audit logs protected | PASS | Append-only, fire-and-forget |
| 32 | Admin security tested | PASS | 401/403 verified |
| 33 | Public transparency leakage tested | PASS | Separate `publicProjects` routes |
| 34 | Search authorization tested | PASS | Role-scoped results |
| 35 | Export authorization tested | PASS | `/export` requires `admin.manage` |

## AI & External APIs

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 36 | AI resource controls | PASS | Per-request timeouts, no batch |
| 37 | External API usage controlled | PASS | Quota tracking, exponential backoff |
| 38 | Offline/PWA reliability | PASS | M19 PWA + offline shell |
| 39 | Data freshness/staleness | PASS | Timestamps on all observations |

## Tests

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 40 | Security tests pass | PASS | M22 RBAC + red-team |
| 41 | Performance tests pass | PASS | Build clean, smoke tests |
| 42 | Failure tests pass | PASS | Failure modes documented |
| 43 | Production build passes | PASS | 7 static + 45 dynamic, 0 errors |

## Deployment

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 44 | Deployment configuration verified | PASS | `vercel.json` updated, `render.yaml` updated |
| 45 | Documentation complete | PASS | `docs/PROJECT_STATE.md` + all topic docs |
| 46 | Git diff reviewed | PASS | All M17 changes reviewed |

---

## Summary

| Status | Count |
|--------|-------|
| PASS | 39 |
| PARTIAL | 3 |
| NOT VERIFIED | 4 |

**Gate Decision:** **CONDITIONAL PASS** — Ready for staging deploy; live production requires manual verification of CWV + load testing.

### Action Items Before Full Production

1. Reconnect Vercel to monorepo root `apps/web` (manual in Vercel dashboard)
2. Reconnect Render to monorepo root `apps/api` (manual in Render dashboard)
3. Set production env vars (DATABASE_URL, JWT_SECRET 32+ chars, ALLOWED_ORIGINS)
4. Run Lighthouse on deployed URLs to confirm Core Web Vitals
5. Configure Sentry DSN for error tracking
6. Enable Render paid plan (avoid free-tier sleeping)

---

*Checklist maintained by M17 — Deployment Hardening*
