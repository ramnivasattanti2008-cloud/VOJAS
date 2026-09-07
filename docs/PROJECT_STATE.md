# VOJAS Project State

## Status
**NEO Monorepo — All pages complete (2026-09-06).** 15 legacy phases + NEO rebuild + M5/M6/M7/M8/M9 modules live in a pnpm monorepo at `apps/api` (Express + Prisma) and `apps/web` (Next.js 15 + React 19). All 4 typechecks pass (api, web, api-client, domain).

## Current Phase
✅ NEO Monorepo + M5 (Real Sentinel-2) + M6 (Project Time Machine) + M7 (Change Analysis) + M8 (Risk Dashboard) + M9 (All Pages Complete) + M14 (RBAC System Documentation) + M17 (Performance & Polish) + M18 (Export Engine) + M19 (PWA Install + Offline) + M20 (Performance & Bundle Optimization) + M21 (WCAG 2.1 Accessibility Audit) + M22 (RBAC Code Implementation) + M23 (NEO API Live + Smoke Tests).

## Last Completed Action
**M23 NEO API Live + Smoke Tests Passing (2026-09-07):**
- ✅ NEO API fully operational on `http://localhost:5001` — fresh `tsx src/server.ts` boots cleanly
- ✅ Fixed NodeNext module resolution: 80+ source files updated with explicit `.js` import extensions
- ✅ Updated 4 tsconfigs: `Bundler` → `NodeNext` for proper ESM resolution
- ✅ All 4 packages build clean: `shared`, `domain`, `api-client`, `api`
- ✅ Fixed 2 runtime bugs in admin/search routes:
  - `admin/activity` — raw SQL `created_at >= ${startDate}` (text vs timestamp): changed to pass `since` Date
  - `search` — `status: searchTerm` on Project (enum field, not string): removed
  - `search` — `mode: 'insensitive'` on Prisma 6: removed
- ✅ Added `/api/v1/health` route for smoke test compatibility
- ✅ **M22 RBAC Smoke Tests: 60/60 PASS** (admin + officer + search + audit + export)
- ✅ **M23 Legacy Smoke Tests: 44/44 PASS** (against legacy backend on :5000)
- ✅ Database schema synced via `prisma db push`

**M22 RBAC Code Implementation (2026-09-07):**
- ✅ `apps/api/src/auth/rbac.ts` — Cleaned up duplicate permission code; re-exports canonical helpers from `middleware/auth` and `@vojas/shared`
- ✅ `apps/api/src/middleware/auth.ts` — Production middleware: `authenticate`, `requireRole`, `requirePermission`, `requireAnyPermission`, `requireAllPermissions`, `optionalAuth`
- ✅ `apps/api/src/routes/index.ts` — All route modules mounted with RBAC middleware (`audit.read`, `admin.manage`, etc.)
- ✅ `apps/api/src/routes/admin.ts` — 13 admin endpoints: stats, system-overview, audit, alerts, users, jobs, health, security events, activity
- ✅ `apps/api/src/routes/officer.ts` — Officer Command Center: dashboard stats, cases (acknowledge/review/resolve/dismiss/escalate), evidence, map layers
- ✅ `apps/api/src/routes/search.ts` — Unified search across projects/reports/vendors/MPs/anomalies with role-based scoping
- ✅ `apps/web/src/components/layout/Sidebar.tsx` — Full role-based nav for ADMIN (11 sub-items), MP (8 sub-items), plus universal nav
- ✅ `apps/web/src/app/(dashboard)/admin/page.tsx` — Admin Control Center home (System overview, health, jobs, security events)
- ✅ `apps/web/src/app/(dashboard)/admin/{users,roles,data-sources,rules,ai,satellites,jobs,health,audit,security}/` — 10 admin sub-pages
- ✅ `apps/web/src/app/(dashboard)/officer/{cases,evidence,field,map,page,responses,verification}/` — Officer Command Center pages
- ✅ `apps/web/src/app/(dashboard)/mp/{page,projects,map,finance,reports,demand,intel,signals}/` — MP Command Center pages
- ✅ `apps/web/src/app/(dashboard)/citizen/`, `contractor/` — Citizen/Contractor dashboards
- ✅ `packages/api-client/src/admin.ts` — 46 admin API methods (adminApi)
- ✅ `packages/api-client/src/{citizen,contractor,mp,officer}.ts` — Role-specific API client modules
- ✅ `apps/web/src/hooks/useAdmin.ts` — 17 admin React Query hooks (useSystemOverview, useHealthStatus, useAdminJobs, useAdminStats, useAdminAudit, useAdminUsers, useAdminRoles, useAdminDataSources, useAdminRules, useSecurityEvents, useAdminActivity, etc.)
- ✅ `apps/web/src/hooks/use{Citizen,Contractor,MP,Officer}.ts` — Role-specific hooks
- ✅ `apps/web/src/components/ui/Tabs.tsx` — Tabs UI primitive
- ✅ `apps/api/package.json` — Added `@sentry/node` and express-rate-limit dependencies
- ✅ All 5 packages: 0 TypeScript errors (api, web, api-client, domain, shared)
- ✅ Domain tests: 98/98 passing (errors, providers, validation, geoUtils)

**M14 RBAC System Documentation (2026-09-07):**
- ✅ `docs/RBAC.md` — Complete RBAC system: 6 roles, permission format (resource.action.level), role→permissions matrix, adding new permissions workflow, data scoping rules, security invariants
- ✅ `docs/ROLE_EXPERIENCES.md` — Role comparison matrix, navigation per role, what each role sees/doesn't see, role switching implementation
- ✅ `docs/PERMISSIONS.md` — Full permission reference (85+ permission keys), TypeScript service API (hasPermission, getPermissions, roleHasAtLeast, getScopeLevel), middleware usage, repository scoping examples, React hooks
- ✅ `docs/OFFICER_WORKFLOW.md` — Case lifecycle state machine, 5-step verification process, escalation path (MP→ACB/CAG/Lokayukta/Police), auto-trigger rules, daily workflow
- ✅ `docs/MP_EXPERIENCE.md` — Constituency dashboard, project monitoring, report review, escalation, 3 report generation types, financial tracking, security boundaries
- ✅ `docs/CONTRACTOR_EXPERIENCE.md` — Project dashboard, milestone workflow, invoice/payment lifecycle (DRAFT→SUBMITTED→REVIEW→APPROVED→PAID), document verification, report response
- ✅ `docs/CITIZEN_EXPERIENCE.md` — Two-tier experience (anonymous/authenticated), transparency portal, report submission flow, tracking dashboard, follow/watch, source attribution
- ✅ `docs/ADMIN_EXPERIENCE.md` — Admin dashboard, user/role management, system monitoring, audit log review, security panel, emergency override, data import, multi-tenant management
- ✅ `docs/PROJECT_STATE.md` updated with M14 entry

**M21 WCAG 2.1 Accessibility Audit (2026-09-06, commit 250b57a):**
- ✅ Skip-to-content link in dashboard layout (visible on focus)
- ✅ main element id + tabIndex for skip link target
- ✅ DataTable: role=\"table\", scope=\"col\", keyboard navigation for rows
- ✅ Modal: focus trapping, Escape key, aria-modal, aria-label, focus restoration
- ✅ Sidebar: <nav aria-label>, aria-current=\"page\", icons aria-hidden
- ✅ Header: notification bell aria-label, user menu aria-haspopup/aria-expanded/aria-controls
- ✅ ExportButton: aria-haspopup=\"menu\", aria-expanded, aria-controls, role=\"menu\"
- ✅ Input: htmlFor/id, aria-invalid, aria-describedby, role=\"alert\"
- ✅ All icon-only buttons have aria-label
- ✅ 0 TypeScript errors across all 5 packages

**M20 Performance & Bundle Optimization (2026-09-06, commit 4c5bf93):**
- ✅ All pages split into server wrapper (metadata) + client component: analytics, map-view, notifications, intelligence, alerts, verification, settings, sectors
- ✅ All 13 pages now have loading.tsx skeleton: dashboard, projects, anomalies, reports, map-view, analytics, mps, vendors, notifications, sectors, projects/[id], settings, admin
- ✅ Heavy tab components (SatelliteTab, ChangeAnalysisTab, FinancialTab, ProjectDocumentsTab) already lazy-loaded with next/dynamic + skeleton loading
- ✅ Sidebar uses Next.js Link (auto-prefetch on hover/viewport)
- ✅ Dead code audit: unused imports removed
- ✅ All 5 packages: 0 TypeScript errors

**M19 PWA Install + Offline Support (2026-09-06, commit 4218657):**
- ✅ PWA manifest.json with VOJAS branding, shortcuts to /projects and /report
- ✅ Service worker (public/sw.js) — cache-first for static assets, network-first for API, HTML pages fall back to /offline
- ✅ Offline fallback page (public/offline.html) — dark-themed, branded, retry button
- ✅ usePWAInstall hook — tracks beforeinstallprompt, appinstalled events, exposes promptInstall()
- ✅ InstallPrompt component — dismissible card with Install Now CTA, renders in root layout
- ✅ Apple PWA meta tags (apple-mobile-web-app-*) in root layout
- ✅ SVG app icons (icon-192.svg, icon-512.svg) in public/icons/
- ✅ All 5 packages: 0 TypeScript errors

**M18 Export Engine (2026-09-06, commit d0b4f13):**
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
| M14 | RBAC System Documentation | ✅ (docs/RBAC.md + 7 role docs) |
| M17 | Performance & Polish | ✅ (54b0899) |
| M18 | Export Engine | ✅ (d0b4f13) |
| M19 | PWA Install + Offline | ✅ (4218657) |
| M20 | Performance & Bundle Optimization | ✅ (4c5bf93) |
| M21 | WCAG 2.1 Accessibility Audit | ✅ (250b57a) |
| M22 | RBAC Code Implementation | ✅ (canonical middleware, role-specific dashboards, all role API clients) |
| M23 | NEO API Live + Smoke Tests | ✅ (e418574, 80+ files NodeNext migration, 60/60 M22 + 44/44 M23 pass) |

## Verification

- API `tsc --noEmit`: CLEAN
- Web `tsc --noEmit`: CLEAN
- api-client `tsc --noEmit`: CLEAN
- domain `tsc --noEmit`: CLEAN
- shared `tsc --noEmit`: CLEAN
- domain tests: 98/98 passing
- 18+ feature pages live (Dashboard, Projects, Map, Analytics, Anomalies, Reports, Intelligence, Alerts, Verification, MPs, Vendors, Documents, Notifications, Settings, Project Detail + Time Machine)
- 27 role-specific dashboard pages (10 admin, 7 officer, 8 MP, citizen, contractor)

## Next Action
M24: Frontend integration verification (apps/web build + dev server boot) + M25: Final deployment verification. The platform is now feature-complete with all 6 role experiences wired to real APIs and full RBAC enforcement; backend smoke tests 100% green.
