# VOJAS Major Build Plan

Date: 2026-09-08
Status: Baseline established; local core stack operational

This document is the current implementation baseline. It replaces milestone optimism with source and runtime evidence. `COMPLETE` means locally verified, `PARTIAL` means code exists but an important path is unverified, `MOCK` means the implementation intentionally uses synthetic or deterministic data, `BROKEN` means a concrete repository defect blocks the path, and `MISSING` means no implementation was found.

## Baseline

| Area | Status | Evidence and next action |
|---|---|---|
| PostgreSQL/PostGIS, Prisma, API, frontend | COMPLETE locally | Docker database is healthy; Prisma generation, API readiness, `/login`, typecheck, build, and workspace tests pass. |
| Authentication and RBAC | PARTIAL | JWT, sessions, permissions, and route middleware exist. Extend live role matrix verification and confirm privileged-role registration policy. |
| Project master system | PARTIAL | CRUD, filters, public views, locations, and events exist. Complete authenticated CRUD and resource-scope smoke coverage. |
| Maps | PARTIAL | MapLibre project map exists. National map remains approximate; verify truthful missing-key and loading/error states. |
| CDSE Sentinel-2 | PARTIAL | Real OAuth2/STAC/WMS service exists in `apps/api/src/services/cdseService.ts`. Live verification requires CDSE credentials; no imagery may be fabricated. |
| Time Machine | PARTIAL | Timeline/checkpoint APIs and UI exist. Verify with stored observations and explicit `NO_USABLE_OBSERVATION` states. |
| Change analysis | PARTIAL/MOCK | Provider abstraction exists, but the CDSE pixel provider uses synthetic bands when source parsing is unavailable. Keep this clearly labeled and add real-provider verification when credentials/data exist. |
| Risk intelligence | PARTIAL | Rules, findings, signals, and dashboards exist. Verify populated-data explanations and evidence links. |
| Financial intelligence | PARTIAL | Financial models/routes/services exist. Real government financial ingestion is not verified; distinguish unavailable data from zero. |
| Document intelligence | MOCK | Upload and validation exist, but extraction is template/simulation-based. Replace only with a real OCR provider and preserve untrusted-input controls. |
| Citizen intelligence | PARTIAL | Submission, tracking, evidence, moderation, and deterministic triage exist. Verify privacy and end-to-end status flow. |
| Human verification | PARTIAL/MOCK | Officer workflows exist; case-history mock data must be replaced with persisted audit history. |
| Public transparency | PARTIAL | Public project/report routes exist. Verify disclosure boundaries against seeded and real-source data. |
| Sector intelligence | PARTIAL | Sixteen-sector framework and dashboards exist. Verify actual metrics and unavailable states. |
| Role command centers | PARTIAL | Admin, officer, MP, citizen, and contractor pages exist. Run multi-role browser/API smoke coverage. |
| AI assistant | MISSING | No grounded assistant API/provider/conversation path was found. Implement only after defining source citations, authorization, and unavailable-data behavior. |
| Search and analytics | PARTIAL | Routes, API client, hooks, and pages exist. Verify authenticated filters and real database values. |
| Alerts and notifications | PARTIAL | Notification and alert routes/UI exist. Verify role permissions and persistence; external delivery is not configured. |
| Exports | PARTIAL | Admin CSV export is implemented and tested. PDF is browser print/export rather than a server evidence package. |
| PWA | BROKEN/PARTIAL | Manifest references PNG icons that are absent. Fix asset references or add verified bitmap assets, then test installability. |
| Deployment | BROKEN | `render.yaml` still targets legacy frontend paths and a missing API Dockerfile. Align it to the current monorepo or explicitly use Render Node runtime; verify only after dashboard access. |
| Tests | PARTIAL | API/domain/db tests exist and local gates pass, but DB-backed API tests skip without `DATABASE_URL_TEST` and web has no test files. Add focused web/API smoke coverage. |
| Documentation | PARTIAL | Broad docs exist but historical blockers conflict with current M27 evidence. Keep M27 and this plan authoritative and mark older claims as historical. |

## Ordered execution backlog

1. **Local gate and truthfulness**: keep PostgreSQL/PostGIS, Prisma, API, frontend, typecheck, build, and tests green; classify fixture, derived, unavailable, and real data in UI/API responses.
2. **Auth/RBAC vertical slice**: register/login/refresh/logout/revocation, privileged-role protection, role matrix, project IDOR checks, and audit preservation.
3. **Project vertical slice**: authenticated list/detail/create/update/delete, filters, pagination, locations, and public disclosure with API and browser checks.
4. **Map vertical slice**: project coordinates, selection synchronization, truthful missing-key/error states, and no fake geographic evidence.
5. **Satellite/time-machine slice**: CDSE credentialed path, persistence, provenance, nearest-observation behavior, and explicit no-observation states.
6. **Change/risk slice**: real-provider or clearly labeled unavailable/mock paths, explainable signals, evidence links, confidence limits, and human-review language.
7. **Finance/documents/citizen/verification slice**: real persistence, validation, privacy, document evidence, and replacement of mock case history.
8. **Transparency/roles/search/alerts/exports**: authorization and data-boundary verification across all command centers.
9. **PWA/deployment**: fix repository config/assets, then perform external Vercel/Render verification with real secrets and CORS settings.
10. **AI assistant**: implement only as a grounded, authorized, evidence-citing feature after the underlying data slices are verified.

## Non-negotiable evidence rules

- Seed data is development/test fixture data, not government evidence.
- CDSE/GEE/OCR features remain unavailable or explicitly mock-labeled without credentials and real source responses.
- Risk output uses potential anomaly/discrepancy language and never establishes guilt or fraud.
- No completion claim is made from source presence alone; each slice needs a focused test or live route check.
- Production deployment cannot be verified from this local workspace without access to the Vercel/Render projects and production secrets.
