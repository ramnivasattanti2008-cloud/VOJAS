# VOJAS Project State

## Status
**NEO Monorepo — All pages complete (2026-09-06).** 15 legacy phases + NEO rebuild + M5/M6/M7/M8/M9 modules live in a pnpm monorepo at `apps/api` (Express + Prisma) and `apps/web` (Next.js 15 + React 19). All 4 typechecks pass (api, web, api-client, domain).

## Current Phase
✅ NEO Monorepo + M5 (Real Sentinel-2) + M6 (Project Time Machine) + M7 (Change Analysis) + M8 (Risk Dashboard) + M9 (All Pages Complete) + M17 (Performance & Polish) + M18 (Export Engine) + M19 (PWA Install + Offline).

## Last Completed Action
**M17 Performance & Polish (2026-09-06, commit 54b0899):**
- ✅ Global ErrorBoundary wrapping entire app via providers.tsx
- ✅ AsyncBoundary + Suspense with page-level loading spinner
- ✅ Skeleton components: CardSkeleton, TableRowSkeleton, StatCardSkeleton, PageSkeleton
- ✅ loading.tsx + not-found.tsx for dashboard route
- ✅ SEO metadata on all layouts (dashboard, auth, public) + login/register/report pages
- ✅ Server-component wrappers for client pages needing metadata
- ✅ Static India state data extracted to src/data/indiaStates.ts (200+ lines from dashboard page)
- ✅ console.error → ErrorBanner UI in admin/reports and reports/[id] pages
- ✅ Theme-color meta tag for PWA installability
- ✅ All 5 packages: 0 TypeScript errors

**M19 PWA Install + Offline Support (2026-09-06, commit <NEW>):
- ✅ PWA manifest.json with VOJAS branding, shortcuts to /projects and /report
- ✅ Service worker (public/sw.js) — cache-first for static assets, network-first for API, HTML pages fall back to /offline
- ✅ Offline fallback page (public/offline.html) — dark-themed, branded, retry button
- ✅ usePWAInstall hook — tracks beforeinstallprompt, appinstalled events, exposes promptInstall()
- ✅ InstallPrompt component — dismissible card with Install Now CTA, renders in root layout
- ✅ Apple PWA meta tags (apple-mobile-web-app-*) in root layout
- ✅ SVG app icons (icon-192.svg, icon-512.svg) in public/icons/

**M18 Export Engine (2026-09-06, commit d0b4f13):**
- ✅ ... (export engine completed)

## Last Completed Action
**TS Clean (2026-09-06, commit 637bbff):**
- ✅ Resolved 27 TypeScript errors across `apps/api`, `apps/web`, and `packages/domain`
- Key fixes: `DocumentType` conflict (→ `AIDocumentType`), duplicate constants, `DocumentIntelligenceService` method import, `Card` children optional, `Badge` size prop removed, `formatBytes` added, `Document` type enriched with DB fields, `DocumentRow` prop passing
- All 5 typechecks now clean

**Earlier milestone:**
**M9 Complete Pages (2026-09-06, commit 4757f12):**
- ✅ **8 new pages** (all wired to real API, not mock data):
  - `/mps` + `/mps/[id]` — MP list with state/house filters + MP detail with stats and projects
  - `/vendors` + `/vendors/[id]` — Vendor list with status filter + Vendor detail with stats, contact info, project history
  - `/map-view` — India SVG map with project clusters, state summary sidebar, clickable markers with detail popup
  - `/analytics` — Platform analytics: 4 stat tiles + sector bars + status donut + top-states bars + sector utilization progress
  - `/notifications` — Full notification center with All/Unread filter, mark-read single/all, type-colored icons
  - `/documents` — Global document browser with type filter and project links
- ✅ **2 new api-client files** (`packages/api-client/src/mps.ts`, `documents.ts`) + 2 hook files (`hooks/useMPs.ts`, `useDocuments.ts`) + index export
- ✅ **1 new component** `components/project/DocumentsTab.tsx` — wired into project detail Documents tab (replaced PlaceholderTab)
- ✅ **Sidebar** added 6 new nav items (Map View, Analytics, MPs, Vendors, Documents, Notifications)
- ✅ **Header** now has a notification bell with red unread-count badge (uses existing useNotificationCount)
- ✅ **Vendor type** in `packages/api-client/src/types.ts` extended with `_count?` and `projects?` to match the API response shape
- ✅ `tsc --noEmit` clean across `apps/web` and all 4 packages (0 errors)

**Earlier milestones in this branch:**
- M8 Polish (5bf746e): risk route double-prefix fix, error handler consistency, 12 integration tests
- M8 Dashboard (205700e): Alerts/Intelligence/Verification pages + global /risk/findings endpoint
- M8 Risk Engine (0865d11): 7 signal types, 3 core rules, transparent scoring, 9 endpoints
- M7 Change Analysis (a036808): changeAnalysisEngine, GEE + CDSE_STAC, 9 endpoints, useChangeAnalysis hook
- M6 Project Time Machine (914a66a): TimeMachineContext, TimeMachineMap, Timeline playback, ObservationDrawer
- M5 Real Satellite (ef457ef): cdseService + satelliteEOAnalysis + jobQueue for real Sentinel-2 via CDSE
- NEO Monorepo (0956c32): pnpm workspace, full Prisma schema, 7 new API routes, AnomaliesPage + ReportsPage wired

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
| 12 | Satellite Change Detection | ✅ (M5/M6/M7) |
| 13 | Dashboard & PDF Export | ✅ |
| 14 | Advanced UI / ARIA Polish | ✅ |
| 15 | Deployment | ✅ |
| NEO | Monorepo Rebuild | ✅ (pnpm + apps/api + apps/web) |
| M5 | Real CDSE Sentinel-2 | ✅ (ef457ef) |
| M6 | Project Time Machine | ✅ (914a66a) |
| M7 | Change Analysis | ✅ (a036808) |
| M8 | Risk Engine + Dashboard | ✅ (0865d11 + 205700e + 5bf746e) |
| M9 | All Pages Complete | ✅ (4757f12) |
| M17 | Performance & Polish | ✅ (54b0899) |
| M18 | Export Engine | ✅ (d0b4f13) |
| M19 | PWA Install + Offline | ✅ (pending push) |

## Verification

- API `tsc --noEmit`: CLEAN
- Web `tsc --noEmit`: CLEAN
- api-client `tsc --noEmit`: CLEAN
- domain `tsc --noEmit`: CLEAN
- 18+ feature pages live (Dashboard, Projects, Map, Analytics, Anomalies, Reports, Intelligence, Alerts, Verification, MPs, Vendors, Documents, Notifications, Settings, Project Detail + Time Machine)

## Next Action
Decide next phase. Candidates: M20 (Advanced visual polish), M21 (Performance audit + bundle optimization), or M22 (Accessibility audit WCAG 2.1). The app is now feature-complete and highly polished.
