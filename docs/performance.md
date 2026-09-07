# VOJAS Performance Audit

**Project:** VOJAS NEO Monorepo
**Date:** 2026-09-07
**Phase:** M17 Performance & Caching Audit

---

## 1. Frontend Build Output

- **Framework:** Next.js 15 (App Router) + React 19
- **Build result:** 7 static pages + 45 dynamic pages
- **TypeScript errors:** 0 across all 5 packages
- **Bundle analyzer:** Configured (use `pnpm --filter @vojas/web analyze`)

### Build configuration
- `transpilePackages: ['@vojas/api-client', '@vojas/domain', '@vojas/shared']`
- `webpack.extensionAlias` to resolve NodeNext `.js` to `.ts`
- `force-dynamic` on `(dashboard)/layout.tsx` to prevent SSR function-prop serialization errors
- `reactStrictMode: true`

---

## 2. Core Web Vitals (Target)

| Metric | Target | Status |
|--------|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s | NOT VERIFIED (live) |
| FID (First Input Delay) | < 100ms | NOT VERIFIED (live) |
| CLS (Cumulative Layout Shift) | < 0.1 | NOT VERIFIED (live) |
| TTI (Time to Interactive) | < 3.8s | NOT VERIFIED (live) |
| TBT (Total Blocking Time) | < 200ms | NOT VERIFIED (live) |

These metrics require live deployment to measure. Run Lighthouse against production URLs:
```bash
npx lighthouse https://vojas-frontend.vercel.app --output json
```

---

## 3. API Latency Targets

| Endpoint Type | Target P95 | Notes |
|---------------|-----------|-------|
| Public summary | < 200ms | Now cached (5 min TTL) |
| List endpoints | < 500ms | Paginated, indexed |
| Detail endpoints | < 300ms | Single row + joins |
| Map aggregations | < 1s | Pre-aggregated |
| Time Machine | < 2s | WMS tile fetch is external |
| Change analysis | < 5s | Earth Engine async |
| AI triage | < 3s | Gemini API call |

---

## 4. Caching Strategy

### Implementation: `apps/api/src/utils/cache.ts`

Simple in-memory TTL cache with prefix-based invalidation. Drop-in replacement for Redis.

**TTL Configuration:**

| Layer | Strategy | TTL |
|-------|----------|-----|
| Browser | Static assets, immutable hashes | 1 year |
| Next.js | `revalidate` on page-level | Varies |
| Public summary | In-memory TTL cache | 5 min |
| Public states/districts | In-memory TTL cache | 5 min |
| Satellite status | In-memory TTL cache | 10 min |
| Risk hotspots | In-memory TTL cache | 2 min |
| Benchmarks | In-memory TTL cache | 1 hour |
| DB | PostgreSQL query cache | Default |
| External | Map tiles via WMS | Server-controlled |

**Cache Keys:**
- `public:summary` — national project summary
- `public:states` — per-state aggregates
- `public:districts:{state}` — per-district aggregates

**For production:** Replace `apps/api/src/utils/cache.ts` with Redis (BullMQ job queue already designed for this swap).

---

## 5. Database Performance

### Indexes Added (M17)

**Project model:**
```prisma
@@index([state])       // scalar state filter
@@index([district])    // scalar district filter
@@index([createdAt])   // chronological ordering
@@index([vendorId])    // vendor-scoped queries
```

**RiskFinding model:**
```prisma
@@index([type, status, severity]) // compound for risk dashboard filtering
@@index([detectedAt])              // temporal queries
```

**RiskSignal model:**
```prisma
@@index([detectedAt])
@@index([projectId, signalType, detectedAt]) // compound for risk engine
```

**Existing indexes (verified present):**
- `Project`: stateId, districtId, constituencyId, mpId, status, sector, (state, district), (sector, status), approvedAmount, (latitude, longitude)
- `SatelliteObservation`: (projectId, observationDate), (projectId, selectionReason), (provider, observationDate)
- `SatelliteAnalysis`: (projectId, analysisType, createdAt), changeClassification
- `ChangeAnalysis`: (projectId, processingStatus), parametersHash
- `RiskFinding`: projectId, status, severity, riskScore, confidence, algorithmVersion, (type, projectId)
- `RiskSignal`: projectId, signalType, severity, confidence
- `Report`: status, category, projectId, (latitude, longitude)
- `Anomaly`: projectId, severity, status, category
- `FinancialObservation`: (projectId, date), (projectId, type), (source, sourceTxnId)
- `ProjectEvent`: (projectId, eventDate), (projectId, eventType)
- `Notification`: (userId, isRead), (userId, createdAt)

### Unbounded Queries Fixed

| Route | Before | After |
|-------|--------|-------|
| `GET /projects/:id/timeline` | No pagination | `take: 50, skip: (page-1)*limit` |
| `GET /projects/:id/financial` | No pagination | `take: 50, skip: (page-1)*limit` |
| `GET /projects/:id/satellite/observations` (legacy) | No pagination | `take: 50, max 200` |
| `GET /projects/:id/satellite/progress` (legacy) | No pagination | `take: 50, max 100` |
| `GET /projects/:id/analysis/history` | No pagination | `take: 100, skip: (page-1)*limit` |
| `GET /projects/:id/locations` | No pagination | `take: 20, max 50` |
| `satelliteService.findObservations()` | No take limit | `take: 200` |
| `satelliteService.getAnalysisResults()` | No take limit | `take: 100` |
| `satelliteService.getProgressObservations()` | No take limit | `take: 100` |
| `GET /analytics/models` | No pagination | `take: 100` |

### Response Payload Optimization

- `GET /projects/:id` — Added explicit `select` to avoid returning heavy `sourceRef` JSON and other unneeded fields (boundary, locationSource, etc.)
- Change analysis history — Uses `select` to return only needed fields (avoids full row with large JSON columns)

---

## 6. PostGIS Performance

- `Project.location` stored as separate `latitude`/`longitude` scalar floats
- No `@db.Geometry` PostGIS fields in schema (coordinates stored as floats)
- Distance queries use float range filters (not PostGIS spatial functions)
- No PostGIS-specific indexes needed

---

## 7. Satellite Pipeline Reliability

- Graceful failure states: `NO_USABLE_OBSERVATION`, `AUTHENTICATION_REQUIRED`, `NO_COORDINATES`
- In-memory job queue with deduplication (prevents duplicate processing)
- Error status tracked per job: `PENDING | RUNNING | COMPLETED | FAILED`
- `syncProjectSatellite()` runs async (fire-and-forget with status polling)
- CDSE token caching: 5-minute buffer before expiry

---

## 8. Time Machine Performance

- All satellite data fetched via paginated API (`take: 200` max)
- Frontend uses `useMemo` for derived selections
- Map renders only visible tiles via MapLibre
- WMS layers loaded lazily (only when data available)
- Timeline entries rendered from API response (not computed client-side)

---

## 9. Map Performance

- Map routes at `apps/web/src/app/(dashboard)/mp/map` and `apps/web/src/app/(dashboard)/officer/map`
- Marker clustering via MapLibre native
- GeoJSON simplification for district boundaries

---

## 10. Frontend Performance

- Route-level code splitting via App Router
- Heavy libraries (MapLibre, Three.js, GSAP) loaded only on routes that need them
- Suspense + Skeleton loading on all data pages
- `useMemo` for derived computations in Time Machine and Analytics

---

## 11. Background Job Performance

| Job | Frequency | Timeout | Retry |
|-----|-----------|---------|-------|
| Anomaly scan | On-demand | 60s | 3 |
| Change analysis | On-demand | 5min | 2 |
| Satellite observation fetch | On-demand | 10min | 5 |
| Risk recalculation | On anomaly update | 30s | 3 |

Job queue uses in-memory `Map` for MVP. Production should use BullMQ + Redis.

---

## 12. Performance Testing

```bash
# Run performance tests
npx ts-node scripts/perf-test.ts

# Bundle analyzer
pnpm --filter @vojas/web analyze
```

---

## 13. M17 Changes Summary

**Files changed:**
- `apps/api/src/routes/timeline.ts` — pagination added
- `apps/api/src/routes/financial.ts` — pagination added
- `apps/api/src/routes/satellite.ts` — legacy routes paginated
- `apps/api/src/routes/changeAnalysis.ts` — history route paginated
- `apps/api/src/routes/locations.ts` — take limit added
- `apps/api/src/routes/projects.ts` — explicit select on GET /:id
- `apps/api/src/routes/analytics.ts` — take limit on models route
- `apps/api/src/routes/publicProjects.ts` — in-memory cache added
- `packages/domain/src/services/satelliteService.ts` — take limits on all findMany calls
- `packages/db/prisma/schema.prisma` — 6 new indexes
- `apps/api/src/utils/cache.ts` — NEW: in-memory TTL cache
- `scripts/perf-test.ts` — NEW: performance test script

**Indexes added:**
- `Project(state)`, `Project(district)`, `Project(createdAt)`, `Project(vendorId)`
- `RiskFinding(type, status, severity)`, `RiskFinding(detectedAt)`
- `RiskSignal(detectedAt)`, `RiskSignal(projectId, signalType, detectedAt)`

**Pagination limits added:** 7 routes fixed, 3 service methods fixed
**Caching added:** 3 public endpoints (summary, states, districts)
**Response optimization:** 1 route (project detail select)

---

*Document maintained by M17 — Performance & Caching Audit*
