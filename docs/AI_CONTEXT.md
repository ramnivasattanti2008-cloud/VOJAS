# VOJAS — Persistent AI Context & Agent Memory (docs/AI_CONTEXT.md)

> **Document Purpose**: High-density system memory for AI engineering and autonomous agents working on the VOJAS platform.
> **Last Updated**: 2026-09-18
> **Core Mandate**: VOJAS is a civic accountability and anti-corruption platform for MPLADS and public works monitoring in India. **Never fabricate civic data.** All AI outputs must ground strictly in accessible application data, real PostgreSQL database columns, verified Sentinel-2 spectral observations, and statutory regulations (GFR 2017, CVC, CPWD).

---

## 1. System Architecture & Topology

VOJAS operates as a production-grade TypeScript monorepo powered by `pnpm 9.12`:

- **Frontend (`apps/web`)**: Next.js 15 (App Router), React 19, Tailwind CSS, TanStack Query, PDF export (`jsPDF`), interactive GIS maps (`InteractiveGisMap`).
- **Backend API (`apps/api`)**: Express.js 4, TypeScript 5.6, Helmet, strict CORS, multi-layer rate limiting (`authLimiter`, `reportSubmitLimiter`, `aiLimiter`, `searchLimiter`, `generalLimiter`), Sentry.
- **Database & Packages**: PostgreSQL + PostGIS with Prisma 6 (`@vojas/db`), domain engines (`@vojas/domain`), RBAC (`@vojas/shared`), and API client (`@vojas/api-client`).

---

## 2. Database Structure & Core Models (`@vojas/db`)

Contains **60,369 real ingested MPLADS projects** from official Lok Sabha and MoSPI repositories.

- **`User` & Role**: `ADMIN`, `OFFICER`, `ANALYST`, `REVIEWER`, `MP`, `CONTRACTOR`, `CITIZEN`, `FIELD_OFFICER`, `VIEWER`.
- **`Project`**: Core civic asset model (`approvedAmount`, `spentAmount`, `sector`, `status`, `latitude`, `longitude`, `mp`, `vendor`, `districtRecord`, `stateRecord`, etc.).
- **`Report`**: Citizen grievance and whistleblower submissions (`reportReference` `VOJAS-YYYY-XXXX`, `category`, `severity`, `status`, `privacyLevel`).
- **`RiskFinding` & `RiskSignal`**: Deterministic risk signals and explainable scores (0–100).
- **`SatelliteObservation` & `ChangeAnalysis`**: Sentinel-2 multi-spectral observations (`ndvi`, `ndbi`, `bsi`, `cloudCover`).
- **`AuditEvent`**: Append-only tamper-evident audit trail.

---

## 3. Role-Based Access Control (RBAC)

Defined in `@vojas/shared/src/permissions.ts` and `@vojas/shared/src/rbac.ts`.

- **CITIZEN**: Public projects, own reports. No internal officer notes or contractor financial margins.
- **MP**: Scoped to projects, spending, citizen reports, and risk indicators within their designated constituency or state.
- **GOVERNMENT_OFFICER**: Operational management across assigned jurisdiction (inspection queue, case verification, referral creation).
- **CONTRACTOR**: Assigned contracts, milestone submissions, and document requests only.
- **ADMIN**: System health, audit logs, provider metrics.

---

## 4. Existing AI Capabilities

1. **VOJAS Sentinel Core v4.2 (`apps/api/src/services/llmDetectionService.ts`)**:
   - Dual mode: Cloud LLM (Gemini 2.0 Flash / OpenAI `gpt-4o-mini`) and deterministic in-process fallback (GFR 2017, CPWD, CVC).
   - Hard rule: Never fabricate evidence. If no satellite observation exists, returns `NO_USABLE_OBSERVATION`.
2. **Domain Risk Engine (`packages/domain/src/services/riskEngine/`)**:
   - Deterministic rule engine, signal generator, risk scorer, AI explainer.
3. **Document Intelligence & Report Triage**:
   - 13 categories, evidence hierarchy, zero-hallucination OCR policy.
4. **Settings & AI Configuration Center (`/settings`)**:
   - Interactive Judges Live LLM Forensic Sandbox with showcase projects (`showcase-fraud-1`, `showcase-ong-1`, `showcase-fin-1`).

---

## 5. Controlled AI Tool Architecture

Controlled, RBAC-filtered tool layer:

- `searchProjects(query, state, district, sector, status, limit)`
- `getProject(projectId)`
- `getProjectFinancials(projectId)`
- `getProjectTimeline(projectId)`
- `getProjectEvidence(projectId)`
- `getProjectSatellite(projectId)`
- `getProjectRisk(projectId)`
- `getConstituencyProjects(mpId | constituency)`
- `getOfficerQueue(officerId)`
- `getContractorProjects(contractorId)`

---

## 6. Known Constraints & Non-Negotiables

- **NEVER GIT PUSH UNTIL USER EXPLICITLY AUTHORIZES**.
- Never invent rupee amounts, dates, completion rates, or satellite metrics.
- Keep `COLLAB.md` updated between agent handoffs.
