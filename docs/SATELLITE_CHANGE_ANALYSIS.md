# VOJAS — Satellite Change Analysis Engine (M7)

**Status:** M7 implementation
**Scope:** Real pixel-level change detection between Sentinel-2 L2A observations, with confidence estimation, false-positive controls, and reported-progress comparison.
**Anti-fabrication policy:** No fake change percentages, no fabricated confidence scores, no invented project polygons. Every metric comes from real observations + real spectral math or it is honestly reported as `INSUFFICIENT_DATA` / `INVALID` / `INCONCLUSIVE`.

---

## 1. Core principle

VOJAS detects **observable physical changes** at a project location. It does not determine "the project is 63% complete." The output is evidence for human verification, not a legal determination.

Every analysis answers:

1. **WHAT** changed? — primary signal classification (NDVI, BUILT_SURFACE, etc.)
2. **WHERE** did it change? — change regions (geometry + centroid + area)
3. **HOW MUCH** area changed? — `changeAreaM2` + `changePercent`
4. **WHEN** did it change? — `comparisonDate − baselineDate`
5. **HOW CONFIDENT** are we? — `confidence` (LOW / MEDIUM / HIGH) with factor breakdown
6. **IS IT CONSISTENT** with reported progress? — `CONSISTENT` / `POSSIBLY_INCONSISTENT` / `INCONCLUSIVE` / `INSUFFICIENT_DATA`

---

## 2. Analysis pipeline

```
SatelliteObservation A (before)
        +
SatelliteObservation B (after)
        ↓
Geometry validation (polygon or point buffer)
        ↓
Quality validation (cloud %, valid pixels)
        ↓
Provider selection (GEE if configured, else CDSE pixel fallback)
        ↓
Spectral preprocessing (cloud mask, scaling)
        ↓
Index generation (NDVI, NDBI, BSI)
        ↓
Difference calculation (Δ NDVI, Δ NDBI, Δ BSI)
        ↓
Change region extraction (connected components)
        ↓
Confidence estimation (6 factors)
        ↓
False-positive controls (control area, seasonality)
        ↓
Classification (NO_CHANGE / LOW / MODERATE / HIGH / INCONCLUSIVE)
        ↓
Reported progress comparison
        ↓
Evidence package
        ↓
Store in SatelliteAnalysis table
```

The result is cached by `(projectId, beforeId, afterId, analysisType, algorithmVersion, parametersHash)` so we never recompute the same analysis.

---

## 3. Analysis types

| Type | Description | Bands / Formula | When applicable |
|---|---|---|---|
| `SPECTRAL_CHANGE` | General spectral delta | All bands differenced | Default fallback |
| `NDVI_CHANGE` | Vegetation index change | `(NIR − RED) / (NIR + RED)` = `(B08 − B04) / (B08 + B04)` | All projects |
| `BUILT_SURFACE_CHANGE` | Built-up / impervious change | `(SWIR1 − NIR) / (SWIR1 + NIR)` = `(B11 − B08) / (B11 + B08)` | BUILDING, ROAD, SCHOOL, HOSPITAL |
| `VEGETATION_DISTURBANCE` | Vegetation clearing | Negative NDVI delta | ROAD, IRRIGATION |
| `BARE_SOIL` | Exposed ground | BSI = `(SWIR1+RED−NIR−BLUE)/(SWIR1+RED+NIR+BLUE)` = `(B11+B04−B08−B02)/(B11+B04+B08+B02)` | All projects (proxy for site disturbance) |
| `WATER_CHANGE` | Water extent change | `(GREEN − NIR) / (GREEN + NIR)` = `(B03 − B08) / (B03 + B08)` | WATER projects only |

**Not auto-run.** Each project gets a `sector`-specific primary analysis (see §11). Additional analyses are optional.

---

## 4. Project boundary priority

1. **Validated project polygon** — used as the geometry. Area computed from geometry.
2. **Validated project point** — analytical buffer applied: `ANALYSIS_BUFFER_METERS` (default 200m, configurable per project). Clearly labeled: `ANALYSIS BUFFER — NOT OFFICIAL PROJECT BOUNDARY`.
3. **No geometry** — `ANALYSIS_NOT_POSSIBLE` returned.

The analytical buffer is **never** rendered as the official project boundary. The UI labels it explicitly.

---

## 5. Cloud masking

Two masks are applied:

1. **Provider-reported cloud cover** (per-observation field `cloudCover`) — used for fast pre-flight.
2. **Per-pixel SCL mask** (S2 L2A Scene Classification Layer, when GEE) or `scl`-equivalent when CDSE.

| SCL class | Treat as |
|---|---|
| 4 (VEGETATION) | Valid |
| 5 (NOT_VEGETATED) | Valid |
| 6 (WATER) | Valid |
| 7 (UNCLASSIFIED) | Masked |
| 8..10 (CLOUD_*) | Masked |
| 11 (SNOW) | Masked |
| 0 (NO_DATA) | Masked |

Quality metrics stored per analysis:
- `validPixelsBefore` / `validPixelsAfter`
- `cloudPercentBefore` / `cloudPercentAfter`
- `minValidPixels` (60% threshold — below this, return `INSUFFICIENT_IMAGE_QUALITY`)

---

## 6. Temporal comparison modes

| Mode | When |
|---|---|
| `BASELINE_VS_LATEST` | Earliest observation vs latest |
| `BASELINE_VS_SELECTED` | Earliest vs user-selected date |
| `PREVIOUS_VS_CURRENT` | Consecutive observations |
| `CUSTOM` | User picks any two valid observations |
| `MULTI_STAGE` | Chain: baseline → obs1 → obs2 → latest |

User can pick any two observations from the Time Machine.

---

## 7. Spectral difference

For each pixel:
- `ΔNDVI = NDVI_after − NDVI_before`
- `ΔNDBI = NDBI_after − NDBI_before`
- `ΔBSI  = BSI_after − BSI_before`

A pixel is "changed" if any of the absolute deltas exceeds the per-index threshold:

| Index | Threshold (configurable) | Default |
|---|---|---|
| NDVI | `ANALYSIS_MIN_NDVI_DELTA` | 0.10 |
| NDBI | `ANALYSIS_MIN_NDBI_DELTA` | 0.08 |
| BSI | `ANALYSIS_MIN_BSI_DELTA` | 0.10 |

Thresholds are deliberately conservative — they favor `NO_CHANGE` over false-positive `HIGH_CHANGE`.

---

## 8. Change region extraction

After pixel-level change detection:
1. Build a binary mask of "changed" pixels.
2. Run a 4-connectivity connected-component analysis.
3. Discard components with area < `MIN_REGION_AREA_M2` (default 100 m² ≈ 1 Sentinel-2 pixel pair).
4. For each surviving region: store `id, areaM2, centroid, meanMagnitude, category, confidence`.

Categories assigned by majority-vote on the dominant index in that region:
- `VEGETATION_REMOVAL` (negative ΔNDVI)
- `BUILT_EXPANSION` (positive ΔNDBI)
- `BARE_SOIL_APPEARANCE` (positive ΔBSI)
- `WATER_CHANGE` (water index delta)
- `MIXED_CHANGE` (no clear majority)

---

## 9. False-positive controls

### 9.1 Control area

For each analysis, compute the same change metrics in a **surrounding control area** (1.5× the project area, donut-shaped, excluding the project footprint).

If `controlAreaChangePercent` is comparable to `projectChangePercent`, the project-specific change may not be project-related — it's broader environmental / seasonal.

`ΔRatio = projectChangePercent / controlAreaChangePercent`

| ΔRatio | Interpretation |
|---|---|
| > 2.0 | Project-specific change is strong |
| 1.0–2.0 | Project-specific change is moderate |
| < 1.0 | Change not project-specific — likely broader effect |

Reduces confidence by one level when ΔRatio < 1.0.

### 9.2 Seasonality

For each project, store `regionSeason` (NORTH_INDIA_KHARIF / SOUTH_INDIA / COASTAL / ARID). Compare the two observation dates against:
- `vegetation_green_season` (Jul–Oct)
- `vegetation_dry_season` (Mar–May)

If both observations fall in the same season, NDVI changes are more likely project-related. If they cross seasons, increase `seasonalityRisk` factor.

### 9.3 Image alignment

Bands are co-registered by Sentinel-2 L2A processing. We do not perform per-pixel registration. The `resolutionSuitability` factor reflects this.

### 9.4 Resolution

Sentinel-2 L2A is 10m for RGB / NIR, 20m for SWIR. Features smaller than 10m are not visible.

---

## 10. Confidence engine

Six factors, each scored `HIGH` / `MEDIUM` / `LOW`:

| Factor | HIGH | MEDIUM | LOW |
|---|---|---|---|
| `imageQuality` | cloud% < 20 | 20–60 | > 60 |
| `geometryQuality` | Validated polygon | Point + buffer | None |
| `spatialCoherence` | ≥ 1 region ≥ 500 m² | Multiple small regions | Scattered / no clear region |
| `seasonalityRisk` | Same season | Cross-season, plausible | Cross-season, no plausible explanation |
| `resolutionSuitability` | 10m feature ≥ 50m | 10m feature 10–50m | < 10m feature |
| `controlAreaComparison` | ΔRatio > 2.0 | 1.0–2.0 | < 1.0 |

Overall confidence:
- 5+ factors HIGH → `HIGH`
- 3+ factors HIGH or MEDIUM (no LOW) → `MEDIUM`
- Any factor LOW → `LOW`

All factors stored in `confidenceFactors` JSON so the user can inspect them.

---

## 11. Sector-aware profiles

| Sector | Primary signal | Secondary | Threshold adjustment |
|---|---|---|---|
| `ROAD` | SPECTRAL_CHANGE | NDVI, BARE_SOIL | BSI threshold lowered (0.07) |
| `BUILDING` | BUILT_SURFACE_CHANGE | NDVI, BARE_SOIL | NDBI threshold lowered (0.06) |
| `WATER` | WATER_CHANGE | NDVI | Water index threshold tightened (0.05) |
| `SCHOOL` | BUILT_SURFACE_CHANGE | NDVI, BARE_SOIL | Default |
| `HOSPITAL` | BUILT_SURFACE_CHANGE | NDVI, BARE_SOIL | Default |
| `IRRIGATION` | NDVI_CHANGE | WATER, BARE_SOIL | Default |
| `GENERAL` / others | NDVI_CHANGE | SPECTRAL, BARE_SOIL | Default |

The sector influences interpretation language in the change story but **does not loosen the evidence thresholds**. It only prioritizes the dominant signal.

---

## 12. Change classification

| Classification | Trigger | UI label |
|---|---|---|
| `NO_DETECTABLE_CHANGE` | All Δ under threshold | "No detectable change" |
| `LOW_CHANGE` | 1–10% project area changed | "Low observable change" |
| `MODERATE_CHANGE` | 10–30% project area changed | "Moderate observable change" |
| `HIGH_CHANGE` | > 30% project area changed | "High observable change" |
| `INCONCLUSIVE` | Confidence LOW or insufficient data | "Inconclusive — evidence insufficient" |
| `INVALID` | Geometry missing or invalid observations | "Analysis could not be performed" |

---

## 13. Reported progress comparison

Inputs:
- `reportedProgress` (from project spend / approved amount)
- `changeClassification`
- `confidence`

| Reported | Observable | Result |
|---|---|---|
| Low (≤ 20%) | None / Low | `CONSISTENT` |
| Low (≤ 20%) | Moderate / High | `POSSIBLY_INCONSISTENT` (possible under-reporting) |
| High (> 60%) | None | `POSSIBLY_INCONSISTENT` (requires field verification) |
| High (> 60%) | Moderate / High | `CONSISTENT` |
| Mid | Any | `INCONCLUSIVE` |
| Any | `INCONCLUSIVE` | `INCONCLUSIVE` |
| Any | Confidence LOW | `INSUFFICIENT_DATA` |

**Never** convert satellite change to a completion percentage.

---

## 14. Limitations (always stored)

- `resolution: 10m` — sub-meter features not visible
- `cloudCover` per observation
- `analyticalBuffer` size and warning if used
- `seasonalityWarning` if cross-season
- `temporalGap` days between observations
- `interpretationLimits` per index (e.g. "NDVI decrease does not necessarily mean construction")

---

## 15. Versioning

`algorithmVersion` is a string of the form `change-vMAJOR.MINOR`.

When any threshold, mask, or formula changes:
1. Bump the version.
2. Historical results keep their original `algorithmVersion`.
3. New runs use the new version.
4. Re-running an old analysis with the new version requires an explicit parameter (`?forceNewVersion=true`).

This guarantees that stored analysis results are always reproducible from the recorded parameters.

---

## 16. Reproducibility

Every analysis row stores:
- `algorithmVersion`
- `runParameters` — JSON snapshot of all thresholds, buffer sizes, mask settings
- `parametersHash` — SHA-256 of the run parameters
- `observationBeforeId` / `observationAfterId`
- Provider name (`GEE` or `CDSE_PIXEL`)
- `processingTimestamp`

---

## 17. Security

- Only `ADMIN` / `OFFICER` / `ANALYST` roles can trigger a new analysis (expensive operation).
- All other authenticated users can read results.
- Project IDs validated against `^c[a-z0-9]{20,}$` regex.
- `runParameters` validated against an allowlist (no arbitrary Earth Engine expressions).
- Project geometry validated: must be a valid GeoJSON polygon or a single point inside Sentinel-2 coverage.
- Analysis buffer hard-capped at 1000m.

---

## 18. Performance

- Cached by `(projectId, beforeId, afterId, analysisType, algorithmVersion, parametersHash)`.
- GEE calls deduplicated within a 60s window.
- CDSE pixel sampling is bounded to 2,500 pixels (50×50 grid) to keep memory under 1MB.
- Change region extraction runs in O(n) over the pixel grid.

---

## 19. Provider interfaces

```ts
interface ChangeAnalysisProvider {
  name: 'GEE' | 'CDSE_PIXEL';
  isConfigured(): boolean;
  analyze(params: AnalysisParams): Promise<RawAnalysisResult>;
}

interface AnalysisParams {
  before: ObservationRef;
  after: ObservationRef;
  geometry: GeoJSON.Polygon;
  analysisType: AnalysisType;
  sector: string;
  runParameters: RunParameters;
}

interface RawAnalysisResult {
  ndviBefore: number;
  ndviAfter: number;
  ndviDelta: number;
  ndbiBefore: number;
  ndbiAfter: number;
  ndbiDelta: number;
  bsiBefore: number;
  bsiAfter: number;
  bsiDelta: number;
  changedAreaM2: number;
  totalAreaM2: number;
  changePercent: number;
  changeRegions: ChangeRegion[];
  controlAreaChangePercent: number;
  validPixelsPercent: number;
  primarySignal: SignalType;
  cloudPercentBefore: number;
  cloudPercentAfter: number;
  imageQuality: QualityScore;
}
```

The orchestration engine adds: confidence estimation, classification, reported-progress comparison, evidence package, and storage.
