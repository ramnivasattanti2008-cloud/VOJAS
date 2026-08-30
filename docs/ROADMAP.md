# VOJAS Development Roadmap

## PHASE 1 — Foundation
> **Goal**: Running project, frontend + backend connected, database ready

- [x] Repository setup
- [x] Technology stack decision
- [x] Frontend foundation (Vite + React + TS + Tailwind)
- [x] Backend foundation (Express + TS + Prisma + SQLite)
- [x] Environment configuration (.env)
- [x] Frontend ↔ backend connection (health API)
- [x] Basic logging & error handling
- [x] Git initialization + first commit

---

## PHASE 2 — Core UI Shell
> **Goal**: Basic dashboard UI with navigation, no features yet

- [x] React Router setup
- [x] Layout (Sidebar, Header, Main Content Area)
- [x] Loading, Error, Empty state components
- [x] Dark theme foundation
- [x] Basic routing structure (Dashboard + placeholders)

---

## PHASE 3 — User Authentication
> **Goal**: Users can sign in with roles

- [x] User model (database) — User + AuditLog
- [x] User service (bcrypt password hashing)
- [x] Token service (JWT issuance + verification)
- [x] Auth controller (register, login, logout, me)
- [x] Auth middleware (authenticate, authorize)
- [x] Auth routes (`/api/v1/auth/*`)
- [x] Login page UI
- [x] Register page UI
- [x] Auth context (React state)
- [x] Protected routes (frontend)
- [x] Token persistence (localStorage)
- [x] Database seed (4 demo users)
- [x] Form validation (Zod backend)

---

## PHASE 4 — Project Management
> **Goal**: Core project CRUD, the foundation for everything else

- [x] Project model (database)
- [x] Project CRUD API
- [x] Project list page
- [x] Project detail page
- [x] Project search & filter
- [x] Project create/edit form
- [x] Project status workflow

---

## PHASE 5 — Location & Maps
> **Goal**: Projects have coordinates, visible on map

- [x] Location model
- [x] Map integration (Leaflet + React-Leaflet)
- [x] Project markers on map
- [x] Click to view project details
- [x] District/State boundaries — `frontend/src/features/map/BoundariesLayer.tsx` + `frontend/src/data/india-states.ts` (state polygon overlays with hover tooltips, state filter highlight, toggle button)
- [x] Map filters — risk-level quick-filter chips + status/sector/state filters in `MapViewPage.tsx`
- [x] Marker clustering + anomaly heatmap layer + floating layer toggle (Markers / Heatmap / Both) — `MapLayers.tsx`, `MapLegend.tsx`

---

## PHASE 6 — Citizens & Reporting
> **Goal**: Citizens can submit reports/complaints

- [x] Citizen report model
- [x] Report submission API
- [x] Report form UI
- [x] Report list for officers
- [x] Report status workflow
- [x] Report attachment (images/PDFs) — `reportService.addAttachment`/`removeAttachment`, multer upload, magic-byte verify, attachment grid on `ReportDetailPage`

---

## PHASE 7 — Financial Tracking
> **Goal**: Budget and expenditure tracking per project

- [x] Budget model
- [x] Expenditure model
- [x] Financial API
- [x] Budget tracker UI
- [x] Financial reports
- [x] Fund flow visualization — `FundFlowChart` in `FinancialTab.tsx` (5-stage horizontal pipeline: Approved → Authorized → Pending → Spent → Balance, framer-motion utilization bar, over-budget red warning)

---

## PHASE 8 — Document Management
> **Goal**: Upload and manage project documents

- [x] File upload infrastructure — multer + magic-byte verify + extension/MIME allowlist (reused for report attachments; documents tab on `ProjectDetailPage` is still a placeholder awaiting project-scoped document model)
- [x] Document viewer — `ReportDetailPage` attachment grid with thumbnails, download
- [ ] Document model (project-scoped) — `Document` Prisma model not yet created
- [ ] Document search
- [ ] Document verification status

---

## PHASE 9 — Anomaly Detection (Rules)
> **Goal**: Rule-based anomaly detection before AI

- [x] Anomaly rules engine
- [x] Duplicate project detection
- [x] Cost outlier detection
- [x] Timeline anomaly detection
- [x] Financial inconsistency detection
- [x] Anomaly notification fan-out — `notificationService.notifyAnomalyDetected` fires on every new anomaly; `notifyReportSubmitted` on citizen report submit.
- [x] Anomaly alert system API — `/notifications` endpoints (`GET /`, `GET /unread-count`, `POST /read-all`, `POST /read`) wired and tested end-to-end.

---

## PHASE 10 — Risk Scoring
> **Goal**: Combine signals into risk scores

- [x] Risk scoring model — `ProjectRisk` Prisma model
- [x] Weighted signal calculation — 4-signal algorithm in `riskService.ts` (anomaly 40 + financial 25 + report 20 + timeline 15)
- [x] Risk score API — `/risk/stats`, `/risk/list`, `/risk/:projectId`, `/risk/recalculate-all`, `/risk/recalculate/:projectId`
- [x] Risk dashboard — `RiskDashboardPage.tsx` with score bars, breakdown panel, filters
- [x] Risk level thresholds — LOW/MEDIUM/HIGH/CRITICAL enum, `getRiskLabel` helper
- [x] Per-project risk tab — `ProjectRiskTab.tsx` with gauge + breakdown + factors

---

## PHASE 11 — AI Integration
> **Goal**: ML-based analysis on top of rule-based system

- [x] AI service architecture — `backend/src/services/aiService.ts` (rule-based + heuristic, no external API)
- [ ] Document intelligence (OCR) — placeholder
- [x] Text classification for reports — `aiService.analyzeReport` runs on citizen report submission (keywords, corruption indicators, sentiment, suggested severity); stored in `Report.aiAnalysis`
- [x] Anomaly pattern recognition — `aiService.analyzePatterns`
- [x] AI explanation layer — `AnomalyExplainer.explain()` generates per-anomaly explanation with contributing factors + recommendation; stored in `Anomaly.aiExplanation`/`aiConfidence`; surfaced in `AnomalyDetailPage` and `RiskDashboardPage`

---

## PHASE 12 — Satellite & Geospatial
> **Goal**: Satellite imagery analysis where appropriate

- [x] Satellite tile integration — Esri World Imagery via ArcGIS REST export (no API key), `SiteComparison.tsx`
- [x] Before/after comparison UI — draggable split slider comparing context view (~1.5 km) vs detail view (~330 m); wired into Project detail "Site" tab
- [ ] Land use change detection
- [ ] Construction progress estimation
- [ ] Water body change detection

---

## PHASE 13 — Dashboard & Analytics
> **Goal**: Complete analytics for all user roles

- [x] Admin / Officer dashboard — `DashboardPage.tsx` (cinematic command center with spatial map, stats, activity feed)
- [ ] MP dashboard (out of scope for SIH)
- [x] Analytics API — `/analytics` routes (admin/analyst only)
- [x] Charts and visualizations — `BarChart`, `LineChart`, `DonutChart`, `ChartCard` components, `AnalyticsPage.tsx`
- [ ] Report generation (PDF export)

---

## PHASE 14 — Advanced UI & Polish
> **Goal**: Make it SIH-quality impressive

- [x] 3D map visualization — `SpatialDashboardMap.tsx` (3D-tilted SVG India map, density heat zones, mouse-tilt parallax)
- [x] Particle effects and animations — `CinematicBackground.tsx`, framer-motion PageTransition, framer-motion utilization bars, ambient glow + noise overlay
- [x] Advanced interactions — ⌘K command palette, drag-to-compare slider, hover tooltips, cinematic route transitions
- [x] AI Verdict panel — `AIVerdictPanel.tsx` (SVG confidence ring + framer-motion animated contributing factors + recommendation callout)
- [x] 4-step Demo Tour overlay — `DemoTour/DemoTour.tsx` + `tourSteps.ts`, auto-shows on first login, manual re-trigger via "Start Demo Tour" button on dashboard
- [x] Responsive polish — mobile sidebar, mobile-friendly nav, responsive grids
- [x] Performance optimization — code-splitting via React.lazy, manual chunk splitting, 391 KB main bundle
- [ ] Accessibility improvements (focus rings, ARIA labels) — partial; some buttons have aria-label/title, full audit pending

---

## PHASE 15 — Deployment & Production
> **Goal**: Production-ready deployment

- [x] Docker Compose setup — `docker-compose.yml` (PostgreSQL + backend + nginx frontend)
- [x] Multi-stage Dockerfiles — `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`
- [x] PostgreSQL migration — `docs/DOCKER.md` covers SQLite → Postgres switch
- [x] CI/CD pipeline — `.github/workflows/ci.yml` (TS check + Vite build on every push)
- [x] Environment configuration for production — `.env.example`, `isProduction` flag, secret-length enforcement
- [x] Logging — `backend/src/utils/logger.ts`
- [x] Security hardening — helmet headers, express-rate-limit (auth 10/15min, API 120/min, report submit 5/hr), full audit log on auth+state changes, magic-byte file verification, bcryptjs, JWT HS256 explicit, strict password policy, PII redaction gate. See `docs/SECURITY.md`.
- [ ] Render / Vercel deploy configs (deferred — docker-compose is the deploy path)

---

## Priority Order
Projects → Financial → Documents → Reports → Anomalies → Risk → AI → Maps → Dashboards → Polish

## Rationale
- Build data foundations first (projects, financial)
- Then reporting (citizens, officers)
- Then analysis (anomalies, risk)
- Then advanced features (AI, satellite)
- Then polish and deployment
