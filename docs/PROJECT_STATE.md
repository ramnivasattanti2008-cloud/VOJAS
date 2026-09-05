# VOJAS Project State

## Status
**NEO Monorepo — M8 Risk Dashboard shipped (2026-09-05).** 15 legacy phases + NEO rebuild + M5/M6/M7/M8 modules live in a pnpm monorepo at `apps/api` (Express + Prisma) and `apps/web` (Next.js 15 + React 19). All 4 typechecks pass (api, web, api-client, domain).

## Current Phase
✅ NEO Monorepo + M5 (Real Sentinel-2) + M6 (Project Time Machine) + M7 (Change Analysis) + M8 (Risk Dashboard).

## Last Completed Action
**M8 Risk Dashboard (2026-09-05, this session — commit 205700e):**
- ✅ `apps/api/src/routes/risk.ts` — added `GET /risk/findings` (global queue, auth required); project-scoped `GET /projects/:id/risk/findings` now includes `{ project: { id, name } }` so list rows can link back to the project.
- ✅ `packages/api-client/src/types.ts` — full M8 type surface: `RiskSignal`, `RiskFinding`, `RiskEvent`, `ProjectRiskSummary`, `RiskAnalysisResult`, `NationalRiskSummary`, `RiskTrend`, `RiskHotspot`, `RiskRule`, `FindingStatusUpdateResult`.
- ✅ `packages/api-client/src/risk.ts` — `createRiskApi` factory with 12 methods (project + national + workflow).
- ✅ `apps/web/src/hooks/useRisk.ts` — 11 React Query hooks. `useRiskFindings(projectId, filters)` transparently falls back to `getAllFindings` when `projectId` is null so the dashboard pages don't need separate hooks. `useUpdateFindingStatus` invalidates both `['risk', 'findings']` (global) and `['projects']` (any project page that embeds a finding).
- ✅ `apps/web/src/app/(dashboard)/alerts/page.tsx` — severity/status filters, acknowledge action, project drill-down.
- ✅ `apps/web/src/app/(dashboard)/intelligence/page.tsx` — national summary, risk-distribution bars, geographic hotspots, recent findings feed, methodology disclaimer.
- ✅ `apps/web/src/app/(dashboard)/verification/page.tsx` — split queue+detail layout, resolution notes, mark-resolved / dismiss / escalate actions.
- ✅ `apps/web/src/components/layout/Sidebar.tsx` — added Intelligence, Alerts, Verification nav items (with Lucide icons `ShieldAlert`, `ListChecks`, `ScanSearch`).
- ✅ Verified: `tsc --noEmit` clean across `apps/api`, `apps/web`, `packages/api-client`, `packages/domain`.

**Earlier this session — M8 Risk Engine (2026-09-05, commit 0865d11):**
- ✅ `packages/domain/src/services/riskEngine/` — 7 signal types, 3 core correlation rules, transparent risk-scoring engine (base + 3 bonuses), data-quality gate, AI explainer, 1 orchestrator.
- ✅ `apps/api/src/routes/risk.ts` — 9 endpoints (project + national + workflow).
- ✅ `packages/api-client/src/risk.ts` + `types.ts` — 9 risk API methods, full type surface.

**Earlier milestones in this branch:**
- M7 Change Analysis (a036808): changeAnalysisEngine (sector-aware, 6 confidence factors), GEE + CDSE_STAC providers, 9 endpoints, `useChangeAnalysis` hook + ChangeAnalysisTab.
- M6 Project Time Machine (914a66a): TimeMachineContext, TimeMachineMap (MapLibre+WMS+side-by-side/swipe/opacity), Timeline with drag+keyboard+playback, ObservationDrawer, TemporalProjectCard.
- M5 Real Satellite (ef457ef): `cdseService` + `satelliteEOAnalysis` + `jobQueue` for real Sentinel-2 via CDSE, flagship Project Experience UI.
- NEO Monorepo (0956c32): pnpm workspace, full Prisma schema, 7 new API routes, api-client methods, React Query hooks, AnomaliesPage + ReportsPage wired to real data, legacy `backend/` and `frontend/` deleted.

## Phase Status Summary

| Phase | Topic | Status |
|------|------|--------|
| 1 | Foundation | ✅ |
| 2 | Core UI Shell | ✅ |
| 3 | Auth | ✅ |
| 4 | Project Management | ✅ |
| 5 | Location & Maps | ✅ |
| 6 | Citizen Reporting | ✅ |
| 7 | Financial Tracking | ✅ |
| 8 | Document Management | ✅ |
| 9 | Anomaly Detection | ✅ |
| 10 | Risk Scoring | ✅ (M8) |
| 11 | AI Integration | ✅ |
| 12 | Satellite Change Detection | ✅ (M5 real CDSE + M6 Time Machine + M7 Change Analysis) |
| 13 | Dashboard & PDF Export | ✅ |
| 14 | Advanced UI / ARIA Polish | ✅ |
| 15 | Deployment | ✅ (Docker + Render + Vercel + CI/CD) |
| NEO | Monorepo Rebuild | ✅ (pnpm + apps/api + apps/web) |
| M5 | Real CDSE Sentinel-2 | ✅ (ef457ef) |
| M6 | Project Time Machine | ✅ (914a66a) |
| M7 | Change Analysis | ✅ (a036808) |
| M8 | Risk Engine + Dashboard | ✅ (0865d11 + 205700e) |

## Verification

- API `tsc --noEmit`: CLEAN
- Web `tsc --noEmit`: CLEAN
- api-client `tsc --noEmit`: CLEAN
- domain `tsc --noEmit`: CLEAN
- 11 risk-related routes, 3 new dashboard pages, 11 React Query hooks live.

## Next Action
Decide next phase. Candidates: M9 (Recommendations / Mitigation Workflow), M10 (Predictive Risk Forecasting), or polish/bugfix round.
