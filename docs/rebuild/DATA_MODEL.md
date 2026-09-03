# VOJAS 2.0 — Data Model

This document describes the entity model, relationship structure, and key design decisions in VOJAS 2.0. All entities are defined in `packages/db/schema.prisma` and target PostgreSQL with PostGIS extensions.

---

## Entity Overview

VOJAS contains **40+ models** organized into eight domains:

| Domain | Entities |
|---|---|
| Identity & Access | `User`, `Session` (implicit JWT) |
| Geography | `LGDLocation` |
| Projects & Lifecycle | `Project`, `ProjectEvent`, `ProjectHistory`, `Location` |
| Procurement | `ContractorProfile`, `ContractorProject`, `ContractorMilestone`, `ContractorDocument`, `ContractorWorkDiary`, `ContractorDefect`, `ContractorPayment`, `ContractorResponse`, `ProcurementRelationship` |
| Observations | `SatelliteObservation`, `ProgressObservation`, `AnalysisResult` |
| Financial | `Expenditure`, `Vendor`, `StateSummary`, `DistrictSummary` |
| Risk & Verification | `Anomaly`, `AnomalyRule`, `ProjectRisk`, `FieldInspection`, `Case`, `CaseStatusLog`, `CaseEvidence`, `Referral`, `EvidencePackage` |
| Reports & Evidence | `Report`, `ReportStatusLog`, `ReportAttachment`, `Document`, `Asset`, `AssetInspection`, `AssetProblem`, `AssetHistory` |
| Governance | `Notification`, `AuditLog`, `AccountabilityChain`, `DevelopmentRequest`, `DevelopmentRequestSupport`, `DevelopmentPriority`, `Guideline`, `GuidelineCheck`, `DataQualityIssue`, `DataSource`, `DataFreshness`, `SearchIndex`, `PolicyConfig`, `WhistleblowerReport`, `SafetyReport` |
| Attribution | `MP` |

---

## Core Entities

### `User`

Primary authentication and authorization entity.

```
User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      Role     @default(VIEWER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Key design notes:**
- `role` is the only authorization primitive — all permissions derive from it
- `isActive` is a soft disable (not deleted) to preserve audit trail
- Relations to: `AuditLog`, `Project` (createdBy), `Report` (assignedTo), `Expenditure` (createdBy), `Anomaly` (acknowledgedBy/resolvedBy/lawEscalatedBy), `Document` (uploadedBy/verifiedBy), `Notification`

**Roles:**
```prisma
enum Role {
  ADMIN          // Full access
  OFFICER        // Manage projects, expenditures, reports
  REVIEWER       // Review queue, report status transitions
  ANALYST        // Anomaly scan, acknowledge, resolve
  FIELD_OFFICER  // Field inspections only
  MP             // View own constituency's projects
  CONTRACTOR     // Submit progress reports
  CITIZEN        // Submit reports
  VIEWER         // Read-only
}
```

---

### `MP`

Master record for Member of Parliament attribution across Lok Sabha and Rajya Sabha terms.

```
MP {
  id           String       @id @default(uuid())
  name         String
  house        House        // LOK_SABHA | RAJYA_SABHA
  state        String
  constituency String
  term         LokSabhaTerm // FIFTEENTH | SIXTEENTH | SEVENTEENTH | EIGHTEENTH
  termStart    DateTime?
  termEnd      DateTime?
  party        String?
  lgdCode      String?      // Optional LGD reference

  // MPLADS financial data (sourced from open government data)
  mpladEntitlement     Float?   // ₹ Cr total entitlement
  mpladFundReceived    Float?   // ₹ Cr received from GOI
  mpladWorksCost       Float?   // ₹ Cr works cost sanctioned
  mpladExpenditure     Float?   // ₹ Cr actual expenditure
  mpladUtilization     Float?   // % utilization
  mpladUnspentBalance  Float?   // ₹ Cr unspent

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects Project[]

  @@unique([name, constituency, term])
  @@index([state, constituency])
  @@index([house, term])
}
```

**Key design notes:**
- Sourced from MPLADS portal + Vonter + dataful open datasets
- `@@unique([name, constituency, term])` prevents duplicate MP records across terms
- Financial fields are cached from open data (not computed from Expenditure rows)
- Relation to `Project` enables per-MP project listing and financial attribution

---

### `Project`

The central entity — a single MPLAD work/project.

```
Project {
  id             String        @id @default(uuid())
  name           String
  description    String?
  status         ProjectStatus @default(PROPOSED)
  sector         ProjectSector
  district       String
  constituency   String?
  state          String
  approvedAmount Float
  spentAmount    Float         @default(0)
  contractor     String?
  startDate      DateTime?
  expectedEndDate DateTime?
  completedAt    DateTime?

  // Open-data attribution
  mpId               String?
  mpName             String?
  house              House?
  term               LokSabhaTerm?
  implementingAgency String?
  idaApproval        IdaApproval?
  source             String       @default("MPLADS_PORTAL")
  sourceWorkId       String?      // Original work ID for deduplication
  sourceRef          String?      // Full original row as JSON

  // Geospatial (Phase 53)
  latitude       Float?
  longitude      Float?
  locationSource String?   // "MANUAL" | "GEOCODED" | "OFFICIAL_RECORD"
  boundary       String?   // GeoJSON Polygon as JSON string
  boundarySource String?
  boundaryQuality String?  // "VERIFIED" | "APPROXIMATE" | "CENTROID_ONLY"

  // Progress tracking
  reportedProgress       Float?
  reportedProgressDate   DateTime?
  reportedProgressSource String?
  pilotProject           Boolean @default(false) // 5 real-data pilot projects

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  locations    Location[]
  reports      Report[]
  expenditures Expenditure[]
  anomalies    Anomaly[]
  risk         ProjectRisk?
  documents    Document[]
  inspections  FieldInspection[]
  cases        Case[]
  projectHistory ProjectHistory[]
  accountabilityChain AccountabilityChain[]
  referrals    Referral[]
  packages     EvidencePackage[]
  satelliteObservations SatelliteObservation[]
  projectEvents ProjectEvent[]
  progressObservations ProgressObservation[]
  analysisResults AnalysisResult[]

  // Indexes
  @@unique([source, sourceWorkId])
  @@index([state])
  @@index([district])
  @@index([sector])
  @@index([status])
  @@index([mpId])
  @@index([state, district])
  @@index([sector, status])
  @@index([approvedAmount])
}
```

**Key design notes:**
- `@@unique([source, sourceWorkId])` — deduplication key for open-data ingestion. Each source dataset has its own work ID scheme; `(source, sourceWorkId)` is globally unique.
- `boundary` stores a GeoJSON Polygon (or Point) as a JSON string in SQLite; PostgreSQL uses native `Json` type
- `pilotProject` flag marks the 5 real-data pilot projects used in Phase 53
- `reportedProgress*` fields cache the latest official progress report (avoids joining `ProjectEvent` for display)
- All `*Source` fields trace provenance — every record knows where it came from

**Project Status Lifecycle:**
```prisma
enum ProjectStatus {
  PROPOSED      // Submitted, not yet approved
  APPROVED      // Sanctioned by competent authority
  IN_PROGRESS   // Work started
  UNSANCTIONED  // Started without proper sanction (flag)
  COMPLETED     // Work finished
  VERIFIED      // Field verification confirmed completion
  CANCELLED     // Cancelled mid-execution
}
```

---

### `ProjectEvent`

Typed, dated project event with explicit source provenance. Complements `ProjectHistory` with structured event types.

```
ProjectEvent {
  id          String   @id @default(uuid())
  projectId   String

  eventType   String   // PROPOSAL | APPROVAL | SANCTION | FUND_RELEASE |
                      // CONTRACTOR_ASSIGNED | WORK_START | MILESTONE |
                      // PROGRESS_REPORT | SATELLITE_OBSERVATION |
                      // CITIZEN_REPORT | FIELD_INSPECTION | AI_ALERT |
                      // VERIFICATION | COMPLETION | ABANDONMENT

  eventDate   DateTime  // When the event actually happened
  source      String    // MPLADS_PORTAL | VONTER | DATAFUL | OPENCITY |
                      // LGD | SENTINEL2 | GEE | CITIZEN | CONTRACTOR |
                      // INSPECTOR | AI | MANUAL
  sourceUrl   String?
  dataset     String?   // e.g. "18th Lok Sabha MPLADS"
  description String
  evidenceUrls String?  // JSON: string[]
  actor       String?   // MP name, officer name, "Sentinel-2", "VOJAS AI"
  confidence  String?   // HIGH | MEDIUM | LOW
  retrievalDate DateTime @default(now())
  createdAt   DateTime @default(now())

  project Project @relation(...)
}
```

**Key design notes:**
- **Append-only** — `ProjectEvent` rows are never updated or deleted
- `eventDate` vs `createdAt`: `eventDate` is when the event happened in the real world; `createdAt` is when VOJAS recorded it
- `source` traces provenance: `MPLADS_PORTAL` = official government data; `SENTINEL2` = satellite observation; `AI` = VOJAS rule engine
- `confidence` rates source reliability: `HIGH` for official records, `LOW` for citizen reports

---

### `SatelliteObservation`

A single satellite scene correlated to a project.

```
SatelliteObservation {
  id                String   @id @default(uuid())
  projectId         String

  // Scene metadata
  observationDate   DateTime
  provider          String   // "CDSE" | "GEE" | "BHOONIDHI" | "MANUAL"
  satellite         String   // "SENTINEL-2A" | "SENTINEL-2B"
  sensor            String   // "MSI"
  dataset           String   // "S2_L2A" | "S2_L1C"
  sceneId           String?  // Copernicus scene ID
  cloudCover        Float    @default(0)  // 0-100
  resolution        Float    @default(10) // metres/pixel
  bbox              String?  // JSON: { sw: [lat,lng], ne: [lat,lng] }

  // Display tiles
  tileUrl           String?
  thumbnailUrl      String?
  centerLat         Float?
  centerLng         Float?

  // Analytical outputs
  ndvi              Float?   // Mean NDVI inside project AOI
  ndbii             Float?   // Mean NDBI inside project AOI
  bsi               Float?   // Mean BSI inside project AOI
  builtUpArea       Float?   // sq metres
  vegetationArea    Float?   // sq metres
  waterArea         Float?   // sq metres
  constructionScore Float?   // 0-100

  // Quality
  quality           String   @default("RAW") // RAW | PROCESSED | GOOD | MODERATE | POOR | REJECTED
  projectCoverage   Float    @default(0)      // 0-100, % of project boundary covered
  rejectionReason   String?

  // Source attribution
  sourceUrl         String?
  sourceName        String?
  retrievalDate     DateTime @default(now())

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([sceneId, observationDate])
  @@index([projectId, observationDate])
  @@index([projectId, targetDate])
  @@index([projectId, quality])
}
```

**Key design notes:**
- `sceneId` + `observationDate` is unique — same satellite can revisit the same scene on different dates
- `cloudCover` uses s2cloudless CLP (Scene Classification) to estimate cloud percentage
- `projectCoverage` is computed post-ingestion: what % of the project's boundary polygon is visible in the scene
- Analytical outputs (NDVI, NDBI, BSI) are computed by the satellite service from the tile data — they are not raw API responses
- `tileUrl` is a standard XYZ tile template (`{z}/{x}/{y}`) compatible with Leaflet

---

### `ProgressObservation`

A snapshot comparing reported (official) progress against observable (satellite-derived) progress.

```
ProgressObservation {
  id              String    @id @default(uuid())
  projectId       String
  observationId   String?

  reportDate      DateTime    // Date of official progress report
  observationDate DateTime?   // Date of satellite observation

  // Reported (official) progress
  reportedProgress Float      // 0-100 percentage
  reportSource    String      // MPLADS_PORTAL | CONTRACTOR | OFFICER | MP | AI
  reportSourceUrl String?

  // Observable (satellite-derived) change
  observedChange  Float?      // 0-100, computed physical change
  observableArea  Float?       // sq metres of detected change
  changeType      String?      // NEW_STRUCTURE | ROAD_LAYING | EXCAVATION | CLEARED | BRIDGE_SPAN | NONE

  // Verification
  verificationResult String?   // CONSISTENT | POTENTIAL_DISCREPANCY | INSUFFICIENT_EVIDENCE | REQUIRES_FIELD
  confidenceLevel    String?   // HIGH | MEDIUM | LOW
  explanation        String?

  // Data quality
  dataQuality     String?      // GOOD | MODERATE | POOR | INSUFFICIENT
  qualityFactors String?       // JSON: { cloudCover, resolutionGap, boundaryQuality, observationAge }

  // Next action
  recommendedAction String?
}
```

**Key design notes:**
- This is the primary input to the anomaly detection pipeline: a large discrepancy between `reportedProgress` and `observedChange` triggers `PROGRESS_DISCREPANCY` anomaly
- `changeType` classifies the type of construction detected: `ROAD_LAYING` is distinct from `NEW_STRUCTURE`
- `qualityFactors` enables explainability: if the observation has high cloud cover, the result is labeled `INSUFFICIENT_EVIDENCE` rather than `CONSISTENT`

---

### `Anomaly`

A detected anomaly on a project.

```
Anomaly {
  id               String          @id @default(uuid())
  title            String
  description      String
  category         AnomalyCategory
  severity         AnomalySeverity @default(MEDIUM)
  riskScore        Int             @default(50)  // 0-100
  status           AnomalyStatus   @default(OPEN)
  ruleCode         String?         // e.g. "DUPLICATE_PROJECT", "COST_OUTLIER"
  projectId        String?
  reportId         String?

  // Lifecycle
  acknowledgedById String?
  acknowledgedAt   DateTime?
  resolvedById     String?
  resolvedAt       DateTime?
  resolution       String?

  // Law enforcement escalation
  lawEscalation    Boolean  @default(false)
  lawAuthority     String?  // "ACB_OFFICE" | "POLICE_OFFICE" | "CVC" | "LOKAYUKTA" | "VIGILANCE"
  lawReferenceNo   String?
  lawEscalatedAt   DateTime?
  lawEscalatedById String?
  lawAcknowledged  Boolean  @default(false)
  lawNotes         String?

  // AI
  aiExplanation String?
  aiConfidence  Int?    // 0-100

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([severity])
  @@index([status])
  @@index([category])
  @@index([projectId])
  @@index([createdAt])
  @@index([ruleCode])
  @@index([lawEscalation, lawAuthority])
  @@index([projectId, ruleCode, status])  // Fast dedup check
}
```

**Key design notes:**
- `status` lifecycle: `OPEN` → `ACKNOWLEDGED` → `UNDER_INVESTIGATION` → `RESOLVED` | `ESCALATED` | `DISMISSED`
- `lawEscalation` routes anomalies to law enforcement (ACB/Police/CVC/Lokayukta) — Phase 51
- `ruleCode` references `AnomalyRule.code` — the rule that triggered this anomaly
- `@@index([projectId, ruleCode, status])` enables fast duplicate detection during rule runs

---

### `AnomalyRule`

Detection rule definition.

```
AnomalyRule {
  id          String          @id @default(uuid())
  code        String          @unique  // e.g. "DUPLICATE_PROJECT"
  name        String
  description String
  category    AnomalyCategory
  severity    AnomalySeverity @default(MEDIUM)
  enabled     Boolean         @default(true)
  priority    Int             @default(50) // Higher = runs first
  params      String?         // JSON: rule-specific parameters
  lastRun     DateTime?
  matchCount  Int             @default(0)
}
```

**Key rules implemented (Phase 9):**
- `DUPLICATE_PROJECT` — same MP + district + sector + similar amount
- `COST_OUTLIER` — sanctioned amount > 2 std devs from sector mean
- `TIMELINE` — start date before proposal date, end date before start date
- `BUDGET_OVERRUN` — spent > approved amount
- `STALLED` — IN_PROGRESS for > 3 years without completion
- `GEOGRAPHIC` — unverified location or suspicious coordinates (0,0; lat/lng swapped)
- `COMPLIANCE` — missing required fields for the project sector
- `PROGRESS_DISCREPANCY` — satellite-observed progress vs reported progress divergence

---

### `ProjectRisk`

Per-project unified risk score combining four signals.

```
ProjectRisk {
  id             String    @id @default(uuid())
  projectId      String    @unique
  overallScore   Int       @default(0)    // 0-100
  anomalyScore   Int       @default(0)    // 0-40
  financialScore Int       @default(0)    // 0-25
  reportScore    Int       @default(0)    // 0-20
  timelineScore  Int       @default(0)    // 0-15
  riskLevel      RiskLevel @default(LOW)
  factors        String?   // JSON: [{ code, label, points, detail }]
  computedAt     DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

**Score composition:**
```
overallScore = anomalyScore + financialScore + reportScore + timelineScore
             = max(40)   + max(25)         + max(20)     + max(15)
             = max(100)

Risk levels:
  LOW      = 0-25
  MEDIUM   = 26-50
  HIGH     = 51-75
  CRITICAL = 76-100
```

**`factors` JSON structure:**
```json
[
  { "code": "BUDGET_OVERRUN", "label": "Budget overrun detected", "points": 15, "detail": "Spent ₹2.4Cr vs approved ₹2Cr" },
  { "code": "STALLED", "label": "Project stalled > 2 years", "points": 10, "detail": "Last progress update: March 2023" }
]
```

---

### `Expenditure`

Individual financial disbursements against a project.

```
Expenditure {
  id              String              @id @default(uuid())
  projectId       String
  amount          Float
  category        ExpenditureCategory
  description     String
  vendor          String?
  vendorId        String?
  invoiceNo       String?
  paidOn          DateTime?
  expenditureDate DateTime?
  status          PaymentStatus       @default(PENDING)
  paymentStatus   String?  // From dataful: "Payment Success" | "Failed"
  notes           String?
  source          String?  @default("MANUAL") // MPLADS_PORTAL | DATAFUL | OPENCITY | VONTER | MANUAL
  sourceTxnId     String?  // Original transaction ID for deduplication
  createdById     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Key design notes:**
- **Append-only for financial rows** — corrections are new rows with `status = REVERSED`, never UPDATE or DELETE
- `vendor` (free text) and `vendorId` (normalized FK) coexist during the normalization migration
- `sourceTxnId` + `source` enables deduplication: `@@unique([source, sourceTxnId])`
- `paidOn` (payment date) vs `expenditureDate` (accrual date) — these can differ by weeks

---

### `Report`

Citizen-submitted report about a project.

```
Report {
  id            String         @id @default(uuid())
  title         String
  description   String
  category      ReportCategory
  severity      ReportSeverity @default(LOW)
  status        ReportStatus   @default(SUBMITTED)

  // Reporter info (anonymous submission supported)
  reporterName  String?
  reporterEmail String?
  reporterPhone String?
  isAnonymous   Boolean        @default(false)

  // Location
  locationDesc  String?
  latitude      Float?
  longitude     Float?

  // Project reference
  projectId     String?

  // Assignment
  assignedToId  String?
  resolution    String?
  resolvedAt    DateTime?

  // Metadata
  source        String         @default("WEB") // WEB | MOBILE | API | WHISTLEBLOWER
  ipAddress     String?
  userAgent     String?

  // AI analysis
  aiAnalysis    String?  // JSON: { keywords, corruptionIndicators, sentiment, suggestedSeverity }
  aiAnalyzedAt  DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Key design notes:**
- PII redaction is at the **service return boundary**, not the database — full PII is stored, ADMINs see everything
- `ReportStatusLog` tracks every status transition with `fromStatus`, `toStatus`, `changedById`, `notes`
- `ipAddress` and `userAgent` are captured but never exposed in any API response (only ADMIN via audit-gated endpoint)

**Report Status Lifecycle:**
```
SUBMITTED → ACKNOWLEDGED → UNDER_REVIEW → RESOLVED | REJECTED → CLOSED
```

---

### `AuditLog`

Immutable audit trail for all important actions.

```
AuditLog {
  id         String   @id @default(uuid())
  userId     String
  action     String   // LOGIN | LOGOUT | REPORT_SUBMIT | PROJECT_CREATE | ...
  resource   String   // "Project" | "Report" | "Anomaly" | ...
  resourceId String   // UUID of the affected record
  details    String?   // JSON: free-form action details
  ipAddress  String?
  createdAt  DateTime @default(now())
}
```

**Key design notes:**
- **Strictly append-only** — no UPDATE or DELETE routes exist in the Express API
- Every action that changes system state writes an `AuditLog` entry
- `details` is JSON for flexible structured data: `{ "fromStatus": "SUBMITTED", "toStatus": "ACKNOWLEDGED" }`
- Failed writes are logged to stderr but do NOT fail the underlying request (fire-and-forget)

**Logged actions:**
- Auth: `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `REGISTER`
- Projects: `PROJECT_CREATE`, `PROJECT_UPDATE`, `PROJECT_DELETE`
- Reports: `REPORT_SUBMIT`, `REPORT_STATUS_CHANGE`, `REPORT_ASSIGN`
- Expenditure: `EXPENDITURE_CREATE`, `EXPENDITURE_UPDATE`
- Anomaly: `ANOMALY_SCAN`, `ANOMALY_ACKNOWLEDGE`, `ANOMALY_RESOLVE`, `ANOMALY_ESCALATE`
- Document: `DOCUMENT_UPLOAD`, `DOCUMENT_VERIFY`, `DOCUMENT_REJECT`
- Auth: `USER_ROLE_CHANGE`, `USER_CREATE`, `USER_DEACTIVATE`
- Satellite: `SATELLITE_SCENE_INGESTED`, `PROGRESS_OBSERVATION_CREATED`

---

## Provenance Model

Every record in VOJAS traces to a `DataSource`. The ingestion pipeline populates `source` and `sourceRef` fields:

```
Project
  source: "VONTER"                    # Which dataset
  sourceWorkId: "VTR-2024-00123"      # Original ID in that dataset
  sourceRef: "{ ... full JSON row }"  # Full original record for audit

SatelliteObservation
  provider: "CDSE"
  sourceUrl: "https://dataspace.copernicus.eu/..."
  sourceName: "Copernicus Data Space Ecosystem"

Expenditure
  source: "DATAFUL"
  sourceTxnId: "DF-TXN-789456"
```

This enables:
- Re-ingestion without duplicates (upsert on `source` + `sourceWorkId`)
- Full audit trail of where data came from
- Tracing discrepancies back to original government datasets

---

## Temporal Model

VOJAS has two temporal patterns:

### Append-only events
`ProjectEvent`, `Expenditure`, `AuditLog`, `CaseStatusLog`, `ReportStatusLog` — historical values are **never overwritten**. A `Project.status` change creates a new `ProjectEvent` row; the `Project.status` field is a cached "current state" convenience column.

### Mutable snapshots
`Project.status`, `Report.status`, `Anomaly.status` are mutable convenience columns that reflect current state. They are always consistent with the latest event row (enforced by the service layer writing events atomically with status updates).

---

## Geospatial Model

### Point storage
All project locations stored as `(latitude, longitude)` float columns. These are used for:
- Map display (Leaflet `L.marker`)
- Distance queries via PostGIS `ST_DWithin`
- Geocoding reverse-lookup

### Boundary storage
Project boundary (AOI for satellite queries) stored as GeoJSON Polygon in `boundary` column:
- `boundary` = `"{ \"type\": \"Polygon\", \"coordinates\": [[[lng, lat], ...]] }"`
- Used to crop satellite tiles to the project AOI for NDVI/NDBI computation
- `boundaryQuality`: `"VERIFIED"` (from official record), `"APPROXIMATE"` (geocoded), `"CENTROID_ONLY"` (only center point available)

### PostGIS indexes
```sql
-- Spatial index on project centroid
CREATE INDEX "Project_location_geography_idx"
ON "Project" USING gist (
  ST_MakePoint(longitude, latitude)::geography
);

-- Distance query (find projects within 500m of observation)
SELECT * FROM "Project"
WHERE ST_DWithin(
  ST_MakePoint(longitude, latitude)::geography,
  ST_MakePoint($lng, $lat)::geography,
  500  -- metres
);
```

---

## Risk Scoring Model

`ProjectRisk` combines four orthogonal signals:

```
┌─────────────────────────────────────────────────────┐
│              ProjectRisk.overallScore                │
│                    (0-100)                           │
├─────────────┬─────────────┬───────────┬─────────────┤
│  anomaly    │  financial  │  report   │  timeline   │
│  (0-40)     │  (0-25)     │  (0-20)   │  (0-15)     │
└─────────────┴─────────────┴───────────┴─────────────┘
```

**AnomalyScore (0-40)**:
- Count of OPEN anomalies × severity weight (LOW=3, MEDIUM=6, HIGH=12, CRITICAL=20)
- Capped at 40

**FinancialScore (0-25)**:
- Utilization ratio: `spentAmount / approvedAmount`
- 0-25% utilization: 0 points; 26-50%: 8; 51-75%: 16; 76-100%: 20; >100%: 25

**ReportScore (0-20)**:
- Count of HIGH/CRITICAL severity reports × 5
- Count of OPEN reports × 2
- Capped at 20

**TimelineScore (0-15)**:
- Days since expected completion for IN_PROGRESS projects
- 0-90 days: 0; 91-365: 5; 366-730: 10; >730: 15

---

## Index Strategy

| Table | Index | Purpose |
|---|---|---|
| `Project` | `(state)`, `(district)`, `(sector)`, `(status)` | Filter by geography/sector/status |
| `Project` | `(source, sourceWorkId)` | Deduplication during ingestion |
| `Project` | `(state, district)` | District-level aggregation |
| `Project` | `(sector, status)` | Sector × status cross-tab |
| `Project` | `(mpId)` | Per-MP project listing |
| `SatelliteObservation` | `(projectId, observationDate)` | Project timeline |
| `SatelliteObservation` | `(projectId, quality)` | Quality-filtered scene listing |
| `Anomaly` | `(status)`, `(severity)`, `(category)` | Anomaly dashboard filters |
| `Anomaly` | `(projectId, ruleCode, status)` | Duplicate detection during scan |
| `Expenditure` | `(projectId)`, `(source, sourceTxnId)` | Project financials, dedup |
| `Report` | `(projectId)`, `(assignedToId)` | Report listing |
| `AuditLog` | `(userId, createdAt)` | User activity log |
| `Notification` | `(userId, isRead)` | User notification queue |

No composite index on `(latitude, longitude)` — PostGIS spatial index on `geography(POINT)` is more efficient for distance queries.

---

## Migration & Seeding

### Local PostgreSQL + PostGIS via Docker

The database is `postgis/postgis:16-3.4`. The Docker Compose stack at the repo root includes the PostGIS init script under `packages/db/prisma/init/`:

```bash
# From the repo root
docker compose up -d db
```

This exposes PostgreSQL on `localhost:5432` with:
- `POSTGRES_USER=vojas`
- `POSTGRES_PASSWORD=vojas_dev_password`
- `POSTGRES_DB=vojas`

`.env` at the repo root should contain:

```
DATABASE_URL=postgresql://vojas:vojas_dev_password@localhost:5432/vojas
```

### Apply Migrations

After a fresh checkout:

```bash
cd packages/db
npx prisma migrate deploy
```

The initial migration lives at `packages/db/prisma/migrations/20260101000000_init/migration.sql` and includes:
- `CREATE EXTENSION postgis`
- All 19 tables, FKs, and B-tree indexes
- PostGIS GIST geography indexes on `projects` and `project_locations`
- Composite query indexes (`(status, state)`, `(sector, district)`, etc.)

For iterative schema changes during development:

```bash
cd packages/db
npx prisma migrate dev --name <feature>
```

### Regenerate the Prisma Client

After schema changes:

```bash
cd packages/db
npx prisma generate
```

This regenerates `packages/db/node_modules/.prisma/client` (gitignored).

### Seeding

The seed file (`packages/db/prisma/seed.ts`) inserts **test fixture** data only — every record is labeled `[TEST]` so it can never be confused with production data.

```bash
cd packages/db
npx prisma db seed
```

This creates:
- 6 test users (one per role: ADMIN, ANALYST, OFFICER, CITIZEN, MP, CONTRACTOR)
- 3 states (Karnataka, Maharashtra, Tamil Nadu)
- 3 districts, 3 constituencies
- 3 data sources (MPLADS_PORTAL, VONTER, SENTINEL2)
- 5 test projects across the three states

**Production data is never seeded by this script.** Real data flows through:
- `scripts/ingest/pilotProjects.ts` — 5 hand-curated pilot projects
- `scripts/ingest/seedObservations.ts` — Sentinel-2 satellite scenes
- `scripts/ingest/vonter.ts`, `scripts/ingest/dataful.ts`, `scripts/ingest/opencity.ts`, `scripts/ingest/lgd.ts` — open-data ingestion
- Direct Prisma writes from service code

### Reset the Database

To wipe all data and re-migrate from scratch:

```bash
cd packages/db
npx prisma migrate reset
```

This drops the database, re-runs all migrations, and re-runs the seed.

