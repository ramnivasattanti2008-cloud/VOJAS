# VOJAS — Real Earth Observation / Satellite Architecture (M5)

**Status:** M5 implementation
**Scope:** Real Sentinel-2 ingestion, weekly checkpoint timeline, change analysis, evidence provenance
**Anti-fabrication policy:** No fake satellite data — every observation, date, cloud cover, NDVI, and progress figure is either real (from a provider) or honestly missing.

---

## 1. Goals

For every eligible MPLAD project, the pipeline:

1. **Validates** project coordinates / boundary geometry.
2. **Searches** for real Sentinel-2 L2A acquisitions.
3. **Acquires** observation metadata from a real Earth-observation API.
4. **Filters** by quality (cloud cover, processing level, valid pixels).
5. **Stores** every successful observation as a `SatelliteObservation` row.
6. **Generates** weekly target checkpoints and finds the nearest real observation.
7. **Selects** a baseline observation (closest to project commencement, lowest cloud cover).
8. **Computes** pairwise change metrics between observations.
9. **Compares** satellite-observable change vs. government-reported progress.
10. **Returns** structured state objects so the UI can show real, missing, or unsuitable data.

---

## 2. Provider abstraction

`packages/domain/src/providers/satelliteProvider.ts` defines the abstract `SatelliteProvider` interface. The first concrete implementation is `CDSESatelliteProvider` (Copernicus Data Space Ecosystem + Sentinel-2 L2A). A `NullSatelliteProvider` is the default when credentials are absent.

```ts
interface EarthObservationProvider {
  status(): ProviderStatus;                                  // configured | missing_credentials | error
  searchScenes(input: SceneSearchInput): Promise<SceneSearchResult>;
  getSceneMetadata(sceneId: string): Promise<SceneMetadata | null>;
  getTileUrl(sceneId: string, layer: TileLayer): string | null; // WMS URL or null
  getThumbnailUrl(sceneId: string): string | null;
}
```

Search result uses an explicit `unavailable` channel rather than throwing — empty results, cloud cover too high, no scene at the date, or auth failure all return a structured reason so the UI can label them honestly.

---

## 3. Data model extensions (M5)

### `SatelliteObservation` (extended)

Existing model plus:

- `targetDate` — weekly checkpoint target this observation was selected for
- `targetDifference` — days between observation and target
- `selectionReason` — `BEST_CLOUD` | `NEAREST_TARGET` | `MANUAL` | `BASELINE`
- `quality` — `RAW` | `USABLE` | `REJECTED`
- `rejectionReason` — `CLOUD_COVER_TOO_HIGH` | `NO_SCENE_AVAILABLE` | `INVALID_GEOMETRY` | `OUTSIDE_COVERAGE` | `AUTHENTICATION_REQUIRED` | `API_UNAVAILABLE`

### `SatelliteAnalysis` (new)

Stores the output of a pairwise change analysis between two observations.

| Field | Type | Description |
|---|---|---|
| `id` | cuid | Primary key |
| `projectId` | string FK | Project |
| `observationBeforeId` | string FK | Earlier observation |
| `observationAfterId` | string FK | Later observation |
| `analysisType` | string | `WEEK_OVER_WEEK` | `BASELINE_VS_LATEST` | `QUARTERLY` | `MULTI_DATE` |
| `analysisDate` | timestamptz | When analysis was computed |
| `baselineDate` | timestamptz | For BASELINE_VS_LATEST — earliest obs |
| `comparisonDate` | timestamptz | For BASELINE_VS_LATEST — latest obs |
| `changeClassification` | enum | `NO_OBSERVABLE_CHANGE` | `LOW_OBSERVABLE_CHANGE` | `MODERATE_OBSERVABLE_CHANGE` | `HIGH_OBSERVABLE_CHANGE` |
| `changeArea` | float? | m² — area of detected change |
| `changePercent` | float? | 0-100 |
| `confidence` | enum | `LOW` | `MEDIUM` | `HIGH` |
| `methodology` | string | Plain English statement of the algorithm |
| `evidence` | json | NDVI/NDBI/BSI snapshots, scene IDs, used bands |
| `limitations` | string? | What the analysis does NOT show |
| `metadata` | json | Provider version, retrieval time, software version |
| `createdAt` | timestamptz | Append-only |

Indexes:
- `@@index([projectId, analysisType, createdAt])`
- `@@index([observationBeforeId])`
- `@@index([observationAfterId])`

### `SatelliteWeeklyCheckpoint` (new)

A pre-computed weekly timeline of target checkpoints with the actual observation that was selected (or `NO_USABLE_OBSERVATION` with a reason).

| Field | Type | Description |
|---|---|---|
| `id` | cuid | Primary key |
| `projectId` | string FK | Project |
| `targetDate` | timestamptz | Target day of the week (Monday) |
| `observationId` | string? FK | Selected real observation, or null |
| `windowStart` | timestamptz | Start of search window |
| `windowEnd` | timestamptz | End of search window |
| `availability` | enum | `AVAILABLE` | `NO_USABLE_OBSERVATION` |
| `reason` | string? | Why no observation was found |
| `targetDifference` | int? | Days between target and actual observation (signed) |
| `methodology` | string | "nearest usable observation in ±N day window" |
| `createdAt` | timestamptz | When this checkpoint was generated |

Indexes:
- `@@unique([projectId, targetDate])`
- `@@index([projectId, targetDate])`
- `@@index([availability])`

---

## 4. Weekly checkpoint algorithm

For each project with valid coordinates, generate a checkpoint for every Monday between `startDate` and the most recent Monday ≤ today.

For each checkpoint:

1. **Search window** = `targetDate ± 14 days` (configurable).
2. **Query** real CDSE Sentinel-2 L2A scenes intersecting the project's location.
3. **Filter**: `eo:cloud_cover ≤ 60%` (configurable; tighter threshold for non-monsoon months).
4. **Select** the scene with the lowest absolute temporal distance to the target.
5. If no scene exists or all fail the cloud filter, return `NO_USABLE_OBSERVATION` with reason.
6. **Insert / upsert** the `SatelliteWeeklyCheckpoint` row.

Idempotency: `(projectId, targetDate)` is unique — re-running the same ingestion never duplicates.

---

## 5. Baseline algorithm

1. If `project.startDate` is known:
   - Search ±90 days around startDate.
   - Pick the **lowest-cloud-cover** scene within that window.
   - If no scene: store `BASELINE_UNAVAILABLE` with reason.
2. If `project.startDate` is unknown:
   - Search the last 365 days for the project location.
   - Pick the **earliest** usable scene.
   - Mark `BASELINE_INFERRED` (commencement unknown).
3. Always store:
   - `targetDate` (the desired baseline date)
   - `observationDate` (the actual scene date)
   - `selectionReason`
   - The full scene metadata for provenance.

---

## 6. Change analysis

Pairwise change between two observations is computed from stored NDVI/NDBI/BSI values (already on `SatelliteObservation`):

```
changeScore = clamp(after.ndvi - before.ndvi, -1, 1) * 50
            + clamp(after.ndbi - before.ndbi, -1, 1) * 50
```

Classification thresholds:

| Score | Classification |
|---|---|
| `|changeScore| < 5` | `NO_OBSERVABLE_CHANGE` |
| `5 ≤ |changeScore| < 20` | `LOW_OBSERVABLE_CHANGE` |
| `20 ≤ |changeScore| < 45` | `MODERATE_OBSERVABLE_CHANGE` |
| `|changeScore| ≥ 45` | `HIGH_OBSERVABLE_CHANGE` |

Confidence:
- `HIGH` if both observations are present, cloud cover < 30%, scene area covers project boundary.
- `MEDIUM` if cloud cover 30-60% or partial coverage.
- `LOW` if cloud cover > 60% or scenes far from project.

We **never** compute a "construction completion percentage" — the model only reports observable change, not project state.

---

## 7. Reported progress comparison

Government-reported progress (`0-100%`) is compared against satellite-observable change:

| Reported | Observed | Status |
|---|---|---|
| 0–20% | NO_OBSERVABLE_CHANGE | `CONSISTENT` |
| 0–20% | LOW+ | `POSSIBLY_INCONSISTENT` (low reported vs. visible change) |
| 20–60% | NO / LOW | `INCONCLUSIVE` |
| 20–60% | MODERATE / HIGH | `CONSISTENT` |
| 60–100% | NO / LOW | `POSSIBLY_INCONSISTENT` (high reported vs. minimal change) |
| 60–100% | MODERATE / HIGH | `CONSISTENT` |
| Any | INSUFFICIENT_DATA | `INSUFFICIENT_DATA` |

The UI must always include the underlying observations, dates, and limitations. **Never accuse anyone of fraud.**

---

## 8. Multi-date change engine

For each project, the timeline view returns an ordered list of `TimelineEntry`:

```
PROJECT
├── BASELINE        (targetDate, observationId | null, selectionReason)
├── WEEK N TARGET   (targetDate, observationId | null, reason)
├── WEEK N+1 TARGET
├── …
└── LATEST          (most recent usable observation, or NO_USABLE_OBSERVATION)
```

Pairwise `SatelliteAnalysis` rows are computed for: baseline → latest, and each consecutive pair of weekly checkpoints (capped at last 12 to avoid combinatorial explosion).

---

## 9. Data provenance

Every `SatelliteObservation` row carries:

- `provider` — `CDSE` | `EARTH_ENGINE` | `NULL`
- `satellite` — `SENTINEL-2A` | `SENTINEL-2B`
- `sensor` — `MSI`
- `dataset` — `S2_L2A`
- `sceneId` — Provider's unique scene identifier
- `observationDate` — UTC ISO timestamp
- `cloudCover` — % (provider's value, 0-100)
- `sourceUrl` — Link to the provider's catalogue page
- `sourceName` — "Copernicus Data Space Ecosystem"
- `processingDate` — Provider's processing timestamp
- `processingLevel` — `L2A`
- `retrievalDate` — When VOJAS stored it

The UI exposes a "View Evidence" drawer that shows all of the above plus the methodology that selected the observation.

---

## 10. Caching & idempotency

- **Database uniqueness**: `SatelliteObservation` has `@@unique([sceneId, observationDate])`. Re-ingesting the same scene is a no-op.
- **Weekly checkpoints**: `@@unique([projectId, targetDate])` — re-running the same week never duplicates.
- **Token cache**: CDSE OAuth tokens are cached in memory for 60 seconds before expiry.
- **Rate limiter**: 280 req/min sliding window (below the 300 limit).
- **Search cache**: none — search results vary by coordinates and time, so caching must be in the database, not in-memory.

---

## 11. API design

All routes return the standard `{ success, data, error }` envelope.

```
GET /api/v1/projects/:id/satellite
  → { availability, baseline, latest, observationCount, window }

GET /api/v1/projects/:id/satellite/timeline?from=…&to=…
  → { entries: TimelineEntry[] }

GET /api/v1/projects/:id/satellite/observations?limit=50
  → { observations: SatelliteObservation[] }

GET /api/v1/projects/:id/satellite/baseline
  → { status, observation?, reason?, methodology }

GET /api/v1/projects/:id/satellite/change?from=…&to=…
  → { comparisons: SatelliteAnalysis[] }

POST /api/v1/projects/:id/satellite/sync
  → { status: 'STARTED' | 'ALREADY_RUNNING' | 'COMPLETED', jobId }
```

### Structured response states

```json
// AVAILABLE
{ "status": "AVAILABLE", "observationId": "…", "observationDate": "2026-08-15", "source": "CDSE", "quality": { "cloudCover": 8.2 } }

// NO_USABLE_OBSERVATION
{ "status": "NO_USABLE_OBSERVATION", "targetDate": "2026-08-17", "reason": "CLOUD_COVER_TOO_HIGH", "searchWindow": { "start": "2026-08-03", "end": "2026-08-31" } }

// BASELINE_UNAVAILABLE
{ "status": "BASELINE_UNAVAILABLE", "reason": "NO_SCENE_AVAILABLE", "targetDate": "2026-01-01" }
```

---

## 12. Map integration

The project page map supports these layers:

- `MAP` — OpenStreetMap basemap (no key)
- `SATELLITE` — Esri World Imagery basemap (no key)
- `HYBRID` — Labels over satellite
- `EARTH_OBSERVATION` — CDSE WMS tile for the selected observation
- `PROJECT_BOUNDARY` — Drawn polygon
- `OBSERVATION_FOOTPRINT` — Drawn scene footprint

Opacity slider, layer toggles, and the project marker all stay in sync with the timeline cursor.

---

## 13. Performance

Satellite search and ingestion are slow. The pipeline never blocks the project page:

1. `POST /satellite/sync` enqueues a job in an in-process `SatelliteJobQueue` (later moveable to BullMQ without code change).
2. The queue returns `{ status: "STARTED", jobId }` immediately.
3. `GET /satellite` returns whatever observations are already in the DB plus a `processingStatus` flag.
4. The UI polls every 5 seconds when `processingStatus === "PROCESSING"`.
5. A "Observation processing…" badge is shown instead of a frozen spinner.

This pattern allows scaling from in-process queue → worker container without rewriting the route.

---

## 14. Security

- Project ID validated (cuid regex) on every route.
- Coordinates validated (`-90 ≤ lat ≤ 90`, `-180 ≤ lng ≤ 180`) at the route boundary.
- `POST /satellite/sync` is RBAC-gated: only ADMIN, OFFICER, ANALYST can trigger.
- All writes go through `SatelliteService` (no raw Prisma in route handlers).
- Provider URLs are constructed only from trusted templates — no user-controlled URL → SSRF is impossible.
- `eo:cloud_cover` and other STAC fields are coerced to numbers and clamped before storage.

---

## 15. Known limitations

- Sentinel-2 L2A is 10 m/pixel. Sub-10 m features (a small culvert, a single borewell) are **not directly observable**. The UI must say so.
- Monsoon months (June–September) in India often have >60% cloud cover across most of the country — weeks in that window are routinely `NO_USABLE_OBSERVATION`.
- CDSE WMS tiles require an OAuth2 token; public access is not possible.
- We do **not** claim a contractor is 37% complete. We say "physical change consistent with site activity".
- Real geocoding errors in MPLAD source data (≈ 4% of projects) place a project centroid ~10 km from the actual site. Satellite hits may be off-target. The `Project.boundary` field is the future fix.
- Earth Engine is **not** currently authenticated. The provider interface is in place but `getStatus()` returns `missing_credentials` until a service account is configured.

---

## 16. Environment variables

| Variable | Required? | Default | Description |
|---|---|---|---|
| `SATELLITE_PROVIDER` | No | `null` | `cdse` enables the real provider. Anything else (or unset) uses `NullSatelliteProvider`. |
| `CDSE_CLIENT_ID` | For CDSE | — | OAuth2 client ID from dataspace.copernicus.eu |
| `CDSE_CLIENT_SECRET` | For CDSE | — | OAuth2 client secret |
| `SATELLITE_CLOUD_THRESHOLD` | No | `60` | Max cloud cover % for a scene to be considered usable |
| `SATELLITE_SEARCH_WINDOW_DAYS` | No | `14` | ± days around a weekly target to look for an observation |
| `SATELLITE_MAX_CLOUD_DEFAULT` | No | `60` | Same as cloud threshold, separate env so the ingestion script and the API can diverge if needed |

No secrets are committed. `apps/api/.env.example` lists the variable names only.
