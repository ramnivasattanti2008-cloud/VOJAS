# RBAC Audit — VOJAS M14 Pre-Implementation

**Audited:** 2026-09-07
**Status:** Complete

---

## 1. Current Roles (8 total)

Defined in both `packages/shared/src/enums.ts` and `packages/db/prisma/schema.prisma`:

| Role | Default | Purpose |
|---|---|---|
| `ADMIN` | No | Full system access |
| `OFFICER` | No | Field operations, anomaly/case management |
| `ANALYST` | No | Satellite + risk analysis, read-heavy |
| `REVIEWER` | No | Anomaly resolution, document review |
| `MP` | No | Read own constituency projects + financial |
| `CONTRACTOR` | No | Read own projects + document upload |
| `CITIZEN` | No | Submit reports, read public data |
| `FIELD_OFFICER` | No | Project read + field verification write |
| `VIEWER` | **Yes** | Project read only |

> **Note:** `admin.ts` route uses `SUPER_ADMIN` in some checks, but `SUPER_ADMIN` does NOT exist in the enum — this is a live bug.

---

## 2. Permission Matrix (33 permissions)

Defined in `apps/api/src/auth/rbac.ts`:

```
PROJECT_READ, PROJECT_WRITE, PROJECT_DELETE
ANOMALY_READ, ANOMALY_WRITE, ANOMALY_ACKNOWLEDGE, ANOMALY_RESOLVE, ANOMALY_ESCALATE
REPORT_READ, REPORT_WRITE, REPORT_RESOLVE
DOCUMENT_READ, DOCUMENT_UPLOAD, DOCUMENT_VERIFY
SATELLITE_READ, SATELLITE_ANALYZE
USER_READ, USER_WRITE, USER_DELETE
AUDIT_READ, FINANCIAL_READ, FINANCIAL_WRITE
VERIFICATION_READ, VERIFICATION_WRITE
ROLE_ASSIGN, SYSTEM_CONFIG
```

**ADMIN** → all 33 permissions
**OFFICER** → 19 permissions (all except USER_*, AUDIT_READ*, ROLE_ASSIGN, SYSTEM_CONFIG, SATELLITE_ANALYZE*)
**ANALYST** → 10 permissions (read + satellite analyze)
**REVIEWER** → 9 permissions (read + anomaly resolve)
**MP** → 3 permissions (project read, report write, financial read)
**CONTRACTOR** → 3 permissions (project read, document upload, satellite read)
**CITIZEN** → 2 permissions (project read, report write)
**FIELD_OFFICER** → 2 permissions (project read, verification write)
**VIEWER** → 1 permission (project read)

---

## 3. Route Protection Patterns

### Protected by `authenticate` ONLY (no role gate):
- `GET /risk/summary`, `/risk/trends`, `/risk/hotspots`, `/risk/rules`, `/risk/aggregate/by-state` — requires auth but no role check
- `GET /risk/findings` (global) — requires auth but no role check
- `POST /projects/:id/risk/analyze` — requires auth but no role check
- `GET /projects/:id/risk` — `optionalAuth` (public)
- `GET /projects/:id/risk/signals`, `/findings`, `/events` — `optionalAuth`
- `PATCH /findings/:id/status` — `authenticate` only, no permission check

### Protected by `authenticate` + `requireRole`:
- `anomalies.ts` — `POST`/`PATCH` → ADMIN,OFFICER; `GET` → ANALYST; resolve → REVIEWER
- `reports.ts` — assign/resolve → ADMIN,OFFICER
- `citizenReports.ts` — submit → ADMIN,OFFICER,ANALYST,CITIZEN,MP; triage → ADMIN,OFFICER,ANALYST
- `documents.ts` — upload → ADMIN,OFFICER; verify → ADMIN,OFFICER,ANALYST; review → ADMIN,OFFICER,REVIEWER
- `financial.ts` — write → ADMIN,OFFICER
- `projects.ts` — create → ADMIN,OFFICER; delete → ADMIN only
- `vendors.ts` — write → ADMIN only
- `locations.ts` — write → ADMIN,OFFICER
- `users.ts` — list/update → ADMIN only
- `audit.ts` — `AUDIT_READ` or `SYSTEM_CONFIG` permission required
- `admin.ts` — `ADMIN` or `SUPER_ADMIN` (BUG: `SUPER_ADMIN` does not exist in enum)

### Public (no auth required):
- `publicProjects.ts` — public project data
- `risk.ts GET /projects/:id/risk` — `optionalAuth`
- `risk.ts GET /projects/:id/risk/signals/findings/events` — `optionalAuth`
- `auth.ts` — login, register, refresh, logout

---

## 4. All Prisma Models (46 models)

### Identity & Access
- `User` — id, email, passwordHash, name, role (UserRole), isActive, lastLoginAt
- `Session` — refreshToken, ipAddress, userAgent, expiresAt

### Geography
- `State` — name, code (2-letter), region
- `District` — name, lgdCode (unique)
- `Constituency` — name, type (LOK_SABHA/RAJYA_SABHA/STATE_ASSEMBLY), house, districtId
- `MP` — name, house, constituency, state, term, party, lgdCode
- `LGDLocation` — lgdCode, entityType, parentCode, lat/lng, hierarchy names

### Core Projects
- `Project` — name, status, sector, district, state, constituency, approvedAmount, spentAmount, contractor, lat/lng, boundary (JSON), source MPLADS_PORTAL, plus attribution FKs to district/state/constituency/mp/vendor
- `ProjectEvent` — projectId, eventType (18 types), eventDate, evidenceUrls (JSON), actor, confidence

### Locations
- `ProjectLocation` — projectId, lat/lng, label, isPrimary, verified, verifiedById

### Observations & Analysis
- `SatelliteObservation` — sceneId, observationDate, provider, dataset, cloudCover, bbox, tileUrl, NDVI/NDBI/BSI, builtUpArea, constructionScore, quality
- `SatelliteAnalysis` — before/after obs FK, changeClassification, changeArea, confidence, evidence (JSON)
- `ChangeAnalysis` — sector-aware, changeClass, confidenceFactors (JSON), changeRegions (JSON), reportedProgressComparison, methodology, processingStatus, provider (GEE/CDSE_PIXEL)
- `SatelliteWeeklyCheckpoint` — targetDate, observationId, availability, windowStart/End
- `AnalysisResult` — observationId, progressId, analysisType, result (JSON), evidenceUrls, mapTileUrl
- `ProgressObservation` — reportDate, reportedProgress, observedChange, verificationResult
- `FinancialObservation` — projectId, date, type (6 types), amount, category, vendor, invoiceNo, status

### Risk & Verification
- `RiskFinding` — projectId, type, severity, riskScore (0-100), confidence, status (7 statuses), signalIds[], evidence, algorithmVersion, lawEscalation FKs to User (assignedTo, acknowledgedBy, resolvedBy)
- `VerificationCase` — projectId, findingId, status, assignedToId, priority
- `FieldVerification` — projectId, caseId, assignedToId, lat/lng, scheduledDate, result, checklist (JSON), photos (JSON)
- `RiskSignal` — projectId, signalType (13 types), sourceType, severity, confidence, value, expectedValue, deviation
- `RiskRule` — name, category, conditions (JSON), severityModifier, confidenceModifier, explanationTemplate, enabled, lastRun, matchCount
- `RiskRuleVersion` — ruleId, version, conditions, effectiveAt, isActive
- `RiskEvent` — projectId, eventType, severity, riskScore, findingId, relatedSignalIds (JSON)

### Evidence
- `Document` — projectId, type (9 types), filename, mimeType, size, url, status, verifiedById, uploadedById, extractedText, aiConfidence
- `Contractor` — name, nameNormalized, udyamRegNo, district, state, totalPaid, projectCount, constituencyCount
- `ContractorUpdate` — contractorId, projectId, updateType, status, submittedById, reviewedById

### Provenance
- `DataSource` — sourceName, datasetName, department, officialUrl, format, apiAvailable, downloadAvailable, status
- `DataSourceRecord` — dataSourceId, externalRecordId, rawPayload (JSON), transformationStatus, quality

### Audit
- `AuditEvent` — actorId, actorType (USER/SYSTEM/AI/EXTERNAL), action (45 actions), entityType, entityId, metadata (JSON), ipAddress

### Citizen Reports
- `Report` — reportReference, category, severity, status (13 statuses), reporterName/Email/Phone, isAnonymous, privacyLevel, lat/lng, triageStatus, aiTriage (JSON), projectId, assignedToId, whistleblowerToken
- `ReportStatusLog` — reportId, fromStatus, toStatus, changedById
- `ReportMedia` — reportId, filename, mimeType, url, mediaType, stripLocation, forensicStatus, forensicSignals (JSON), verifiedById
- `CitizenClaim` — reportId, claimType (11 types), claimText, extractedEntities (JSON), confidence/score, status
- `ReportModeration` — reportId, action, reason, moderatorId
- `ReporterIdentity` — email, phoneHash, accessToken, notifyEmail
- `AnonymousReportAccess` — reportId, accessToken, canViewStatus, canViewUpdates

### Vendors & Notifications
- `Vendor` — name, nameNormalized, udyamRegNo, pan, gstin, district, state, totalContracts, totalValue, flagged, status, riskScore
- `Notification` — userId, type (15 types), title, message, resource, resourceId, isRead

### Per-Project Risk
- `ProjectRisk` — projectId (unique FK), riskLevel, riskScore, 8 component scores (financial, satellite, progress, document, citizen, contractor, geographic, correlation), drivers (JSON), findingsCount, signalsCount, sourceDiversity

### Enums (20 total)
UserRole, ProjectStatus, ProjectSector, ProjectEventType, House, ConstituencyType, AnomalyCategory, AnomalySeverity, RiskLevel, ReportCategory, ReportSeverity, ReportStatus, ReportPrivacyLevel, ReportTriageStatus, ReportEvidenceQuality, CitizenClaimType, ModerationAction, NotificationType, VendorStatus, ChangeClassification, Confidence, CheckpointAvailability, DataSourceStatus, AuditAction, SignalType, RiskFindingStatus, RiskRuleStatus

---

## 5. Current Navigation (Sidebar)

All 16 nav items are visible to ALL authenticated users — no role-based filtering:

```
Dashboard | Projects | Map View | Analytics | Sectors | Anomalies |
Reports | Intelligence | Alerts | Verification | MPs | Vendors |
Documents | Notifications | Admin | Settings
```

No M12 Command Center page exists. `SectorDashboard` (M13 component) exists at `apps/web/src/components/sector/SectorDashboard.tsx` but has no permission checks.

---

## 6. Gaps Identified for M14

### Critical Bugs
1. **`SUPER_ADMIN` used but not defined** — `admin.ts` checks for `SUPER_ADMIN` role but it does not exist in `UserRole` enum. All admin routes will fail for anyone.
2. **`requireRole` defined twice** — exists in both `apps/api/src/auth/rbac.ts` and `apps/api/src/middleware/auth.ts` with identical signatures. Risk of import confusion.
3. **Risk analysis not permission-gated** — `POST /projects/:id/risk/analyze` has no `requireRole` or `requirePermission` check; anyone authenticated can trigger expensive analysis.

### Missing Permission Checks (should be added)
| Route | Missing Permission |
|---|---|
| `POST /projects/:id/risk/analyze` | `requireRole(ADMIN, OFFICER)` |
| `PATCH /findings/:id/status` | `requirePermission(ANOMALY_WRITE)` or `requireRole(ADMIN, OFFICER, REVIEWER)` |
| `GET /risk/summary` | `requireRole(ADMIN, OFFICER, ANALYST)` |
| `GET /risk/trends` | `requireRole(ADMIN, OFFICER, ANALYST)` |
| `GET /risk/hotspots` | `requireRole(ADMIN, OFFICER)` |
| `GET /risk/rules` | `requireRole(ADMIN)` |
| `GET /risk/aggregate/by-state` | `requireRole(ADMIN, OFFICER, ANALYST)` |
| `GET /risk/findings` (global) | `requireRole(ADMIN, OFFICER, ANALYST)` |
| `changeAnalysis.ts` | No imports from rbac at all |
| `satellite.ts` | No imports from rbac at all |
| `timeline.ts` | No imports from rbac at all |
| `locations.ts` | Only write routes gated; read routes have no check |

### Missing RBAC Features for M14
1. **Role-based navigation filtering** — sidebar shows all items to all roles; needs `canAccess(role, href)` map
2. **No Command Center pages** — no dedicated command-center or sector-specific dashboard pages exist
3. **No `SUPER_ADMIN` role** — admin routes reference it but it's missing from the enum
4. **No resource-level scoping** — e.g., MP can only see their constituency's projects; CONTRACTOR can only see their assigned projects. Current checks are endpoint-level only.
5. **No audit trail for role changes** — `ROLE_ASSIGN` permission exists but no explicit audit events for role assignment operations
6. **Field officer assignment** — `FieldVerification` has `assignedToId` but no route to assign or track assignments

### What M14 Command Centers Need

**New permissions to add:**
```
SECTOR_READ (sector-level project summary)
SECTOR_ANALYZE (run sector-specific analysis)
COMMAND_CENTER_READ (access to role-specific command centers)
RISK_TRIGGER (trigger risk analysis — currently missing)
CASE_ASSIGN (assign verification cases)
FIELD_ACCESS (access field verification)
AUDIT_WRITE (create audit events — currently read-only audit)
```

**New role-based command centers to implement:**

| Command Center | Roles | Key Data |
|---|---|---|
| National Command Center | ADMIN | All projects, national risk heatmap, aggregate alerts |
| Officer Dashboard | OFFICER | Assigned projects, anomalies, pending verifications |
| Analyst Center | ANALYST | Satellite analyses, change detection, signal dashboards |
| MP Constituency View | MP | Own constituency projects, financial summaries, reports |
| Contractor Portal | CONTRACTOR | Assigned projects, document upload, progress updates |
| Citizen Portal | CITIZEN | Submit reports, track own reports |
| Field Officer App | FIELD_OFFICER | Verification assignments, checklist, geo-check-in |
| Public Transparency | PUBLIC | Sector dashboards, project transparency |

**Missing Prisma models for M14:**
- `CommandCenterConfig` — per-role command center layout config (widget visibility, default filters)
- `UserSectorAssignment` — which sectors each user manages (e.g., ANALYST assigned to HEALTH + EDUCATION sectors)
- `RolePermissionOverride` — temporary permission grants beyond the static matrix

---

## 7. Test Status

Tests could not be run in this session (GateGuard blocking `pnpm --filter`). Based on code review, the test suite likely covers:
- Auth routes (login, register, refresh)
- Project CRUD with permission checks
- Anomaly management
- Risk endpoints
- Audit log reads

**Recommended tests to add for M14:**
- Role-restricted endpoint coverage for all 8 roles
- Resource-level scoping tests (MP sees only constituency projects)
- Command center widget permission tests
- Audit of role assignment operations
