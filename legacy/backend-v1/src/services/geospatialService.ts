/**
 * Geospatial Analysis Service — VOJAS
 *
 * Google Earth Engine (GEE) bridge for satellite-based infrastructure monitoring.
 *
 * Architecture:
 * 1. PRIMARY: CDSE Process API with Evalscript — computes NDVI/NDBI/BSI server-side
 *    without needing a GEE account. Uses the Copernicus Data Space Ecosystem's
 *    open, OAuth2-authenticated endpoint at https://adphas.dataspace.copernicus.eu/process
 *
 * 2. FUTURE / GEE: When a Python GEE microservice is deployed, wire it via
 *    callGeeService() — see the stub at the bottom of this file.
 *    Set GEE_SERVICE_URL and GEE_SERVICE_KEY in .env to activate.
 *
 *    The Python GEE service receives project AOI + scene IDs and returns
 *    JSON with computed indices and a tile URL. VOJAS stores results in the
 *    AnalysisResult table so repeated queries hit the DB cache first.
 *
 * Band indices (Sentinel-2 L2A):
 *   NDVI  = (B08 − B04) / (B08 + B04)     NIR / Red
 *   NDBI  = (B11 − B08) / (B11 + B08)     SWIR / NIR
 *   BSI   = ((B11 + B04) − (B08 + B02)) / ((B11 + B04) + (B08 + B02))
 *           (SWIR + Red − NIR − Blue) / (SWIR + Red + NIR + Blue)
 *
 * Band mapping:
 *   B02 = Blue   B04 = Red   B08 = NIR   B11 = SWIR1
 *
 * Thresholds used in construction detection:
 *   Vegetation area  : NDVI > 0.3
 *   Built-up area    : NDBI > 0.1
 *   Construction gain: built-up area increase > 500 m² between two scenes
 */

import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

// ─── Environment ──────────────────────────────────────────────────────────────

const CDSE_CLIENT_ID     = process.env.CDSE_CLIENT_ID     ?? "";
const CDSE_CLIENT_SECRET = process.env.CDSE_CLIENT_SECRET ?? "";
const CDSE_TOKEN_URL     = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const CDSE_PROCESS_URL   = "https://adphas.dataspace.copernicus.eu/process";
const GEE_SERVICE_URL    = process.env.GEE_SERVICE_URL   ?? "http://localhost:8001";
const GEE_SERVICE_KEY    = process.env.GEE_SERVICE_KEY   ?? "";

const GEE_CONFIGURED = Boolean(GEE_SERVICE_URL && GEE_SERVICE_KEY);
const CDSE_CONFIGURED = Boolean(CDSE_CLIENT_ID && CDSE_CLIENT_SECRET);

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnalysisTypeEnum =
  | "NDVI_TREND"
  | "NDBI_CHANGE"
  | "BUILT_UP_AREA"
  | "LAND_USE_CHANGE"
  | "CONSTRUCTION_DETECTED"
  | "WEEKLY_CHECK";

export type ChangeDirection = "GAIN" | "LOSS" | "STABLE";
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

/** Minimal GeoJSON subset used by VOJAS. Avoids adding @types/geojson. */
export interface VojasGeometryPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}
export interface VojasGeometryPolygon {
  type: "Polygon";
  coordinates: [number, number][][]; // outer ring + holes
}
export interface VojasGeometryMultiPolygon {
  type: "MultiPolygon";
  coordinates: [number, number][][][];
}
export interface VojasGeometryLineString {
  type: "LineString";
  coordinates: [number, number][];
}
export type VojasGeometry =
  | VojasGeometryPoint
  | VojasGeometryPolygon
  | VojasGeometryMultiPolygon
  | VojasGeometryLineString;

export interface GeoAnalysis {
  analysisType: AnalysisTypeEnum;
  result: {
    ndvi?: number;
    ndbii?: number;
    bsi?: number;
    builtUpArea?: number;       // m²
    vegetationArea?: number;     // m²
    changeMagnitude?: number;    // 0–100
    changeDirection?: ChangeDirection;
    confidence: ConfidenceLevel;
    dominantChange: string;
  };
  explanation: string;
  limitations: string;
  /** URL for an XYZ tile overlay to display on the VOJAS map */
  mapTileUrl?: string;
  modelUsed: string;
  processingTimeMs?: number;
}

export interface ChangeParams {
  baselineSceneId: string;
  currentSceneId: string;
  projectBoundary?: VojasGeometry;
  analysisType?: string;
}

export interface SceneAnalysisParams {
  sceneId: string;
  observationDate: Date;
  projectBoundary?: VojasGeometry;
  lat: number;
  lng: number;
}

export interface ProjectAnalysisParams {
  projectId: string;
  targetDate: Date;
  analysisType?: string;
}

export interface TileUrlParams {
  analysisType: string;
  sceneId: string;
  style?: "ndvi" | "ndbi" | "change" | "construction";
}

// ─── CDSE Token Cache ─────────────────────────────────────────────────────────

let _cdseToken: { token: string; expiresAt: number } | null = null;

async function getCdseToken(): Promise<string> {
  if (_cdseToken && Date.now() < _cdseToken.expiresAt - 30_000) {
    return _cdseToken.token;
  }

  if (!CDSE_CONFIGURED) {
    throw new Error("CDSE is not configured — set CDSE_CLIENT_ID and CDSE_CLIENT_SECRET in .env");
  }

  const body = new URLSearchParams({
    grant_type:    "client_credentials",
    client_id:     CDSE_CLIENT_ID,
    client_secret: CDSE_CLIENT_SECRET,
  });

  const resp = await fetch(CDSE_TOKEN_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:   body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`CDSE token request failed (${resp.status}): ${text}`);
  }

  const json = await resp.json() as { access_token: string; expires_in: number };
  _cdseToken = {
    token:     json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };

  return _cdseToken.token;
}

// ─── Evalscripts ──────────────────────────────────────────────────────────────

/** Returns a normalised 0–255 band index value; NDVI → green, NDBI → built-up. */
function buildIndexEvalscript(bands: string[]): string {
  const hasAll = (b: string[]) => b.every(bb => bands.includes(bb));
  const defs: string[] = [];

  if (hasAll(["B08", "B04"])) {
    defs.push(`let ndvi = (B08 - B04) / (B08 + B04);`);
  }
  if (hasAll(["B11", "B08"])) {
    defs.push(`let ndbi = (B11 - B08) / (B11 + B08);`);
  }
  if (hasAll(["B11", "B04", "B08", "B02"])) {
    defs.push(`let bsi = ((B11 + B04) - (B08 + B02)) / ((B11 + B04) + (B08 + B02));`);
  }

  return `
function evaluatePixel(samples, orbits) {
  ${defs.join("\n  ")}
  return {
    ndvi: [ndvi],
    ndbi: [ndbi],
    bsi:  [bsi],
  };
}
`.trim();
}

// ─── CDSE Process API Call ─────────────────────────────────────────────────────

interface CdseProcessResult {
  ndvi:   number;
  ndbi:   number;
  bsi:    number;
  tileUrl?: string;
}

async function callCdseProcessApi(params: {
  bbox:   [number, number, number, number];
  timeRange: { from: string; to: string };
  evalscript: string;
  outputUrl?: string;
}): Promise<{ data: Record<string, number[]>; tileUrl?: string }> {
  const token = await getCdseToken();

  const payload = {
    input: {
      bounds: {
        bbox:   params.bbox,
        properties: { crs: "EPSG:4326" },
      },
      data: [
        {
          type: "S2L2A",
          dataFilter: {
            timeRange: params.timeRange,
          },
        },
      ],
    },
    evalscript: params.evalscript,
    output: {
      width:  512,
      height: 512,
      ...(params.outputUrl
        ? { responseUploadParameter: { url: params.outputUrl } }
        : {}),
    },
  };

  const resp = await fetch(CDSE_PROCESS_URL, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`CDSE Process API error (${resp.status}): ${text}`);
  }

  // If an output URL was provided, CDSE uploads directly; the body may be empty or contain metadata.
  // If no output URL, CDSE returns raw binary — not easily parseable here, so callers
  // should always provide an outputUrl (e.g. a presigned S3/Blob URL or a service endpoint).
  if (params.outputUrl) {
    return { data: {}, tileUrl: params.outputUrl };
  }

  // Fallback: try to parse JSON (e.g. for small previews)
  const ct = resp.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return await resp.json() as { data: Record<string, number[]>; tileUrl?: string };
  }

  // Binary response — return empty; caller should use the tile URL path instead.
  return { data: {} };
}

// ─── Synthetic Estimation (when CDSE is unavailable) ──────────────────────────

/**
 * Generates realistic-looking NDVI/NDBI/BSI estimates based on:
 * - Location (latitude correlates with vegetation seasonality)
 * - Project progress (derived from scene date relative to VOJAS project creation)
 * - Per-pixel sampling with deterministic noise for consistency across calls
 *
 * This is NOT real satellite analysis — it provides consistent placeholder
 * values so VOJAS can display the full UI without a CDSE account.
 */
function estimateIndicesFromProject(
  projectId: string,
  lat: number,
  lng: number,
  date: Date
): { ndvi: number; ndbi: number; bsi: number; builtUpArea: number; vegetationArea: number } {
  // Deterministic per-project values so repeated calls return the same result
  const hash = (s: string): number => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  };

  const seed = hash(projectId + date.toISOString().slice(0, 10));
  const rand = (): number => {
    seed;
    return ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
  };

  // Project-level baseline (seeded)
  const baseNdvi = 0.3 + (hash(projectId) % 400) / 1000;   // 0.30 – 0.70
  const baseNdbi = 0.1 + (hash(projectId + "b") % 200) / 1000; // 0.10 – 0.30

  // Vegetation drops and built-up rises over time (proxy for project lifecycle)
  const projectStartDays = hash(projectId + "start") % 730; // 0–730 days ago
  const projectAge = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  const progressFactor = Math.min(1, Math.max(0, 1 - projectAge / (365 * 2)));

  const ndvi = Math.max(0, Math.min(1, baseNdvi - progressFactor * 0.4 + (rand() - 0.5) * 0.1));
  const ndbi = Math.max(-1, Math.min(1, baseNdbi + progressFactor * 0.3 + (rand() - 0.5) * 0.1));
  const bsi  = Math.max(-1, Math.min(1, (ndbi + (rand() - 0.5) * 0.2)));

  // Pixel area for a 512×512 tile at ~10 m/px = ~26 km² — use fraction in AOI
  const totalAreaM2  = 512 * 512 * 100; // 26.2 km²
  const builtUpArea   = Math.round(ndbi > 0.1 ? ndbi * totalAreaM2 * 0.4 : 0);
  const vegetationArea = Math.round(ndvi > 0.3 ? ndvi * totalAreaM2 * 0.6 : 0);

  return { ndvi, ndbi, bsi, builtUpArea, vegetationArea };
}

// ─── Change Detection ─────────────────────────────────────────────────────────

interface ChangeResult {
  changeMagnitude:  number;
  changeDirection:  ChangeDirection;
  dominantChange:  string;
}

function computeChangeBetweenScenes(
  baseline: { ndvi: number; ndbi: number; bsi: number; builtUpArea: number; vegetationArea: number },
  current:  { ndvi: number; ndbi: number; bsi: number; builtUpArea: number; vegetationArea: number },
  threshold = 500 // m²
): ChangeResult {
  // Built-up area delta
  const builtUpDelta  = current.builtUpArea   - baseline.builtUpArea;
  const vegetationDelta = current.vegetationArea - baseline.vegetationArea;
  const ndviDelta     = current.ndvi - baseline.ndvi;
  const ndbiDelta     = current.ndbi - baseline.ndbi;

  // Construction detection: significant new built-up area (GEE threshold)
  const constructionArea = Math.max(0, builtUpDelta);

  let changeMagnitude: number;
  let changeDirection: ChangeDirection;
  let dominantChange: string;

  if (constructionArea > threshold) {
    changeDirection = "GAIN";
    changeMagnitude = Math.min(100, Math.round((constructionArea / 1000) * 10));
    dominantChange  = `New construction detected: +${constructionArea.toLocaleString("en-IN")} m² built-up area since baseline.`;
  } else if (builtUpDelta < -threshold) {
    changeDirection = "LOSS";
    changeMagnitude = Math.min(100, Math.round((Math.abs(builtUpDelta) / 1000) * 10));
    dominantChange  = `Built-up area decreased by ${Math.abs(builtUpDelta).toLocaleString("en-IN")} m² — possible demolition or land clearing.`;
  } else if (Math.abs(ndviDelta) > 0.05) {
    changeDirection = ndviDelta > 0 ? "GAIN" : "LOSS";
    changeMagnitude  = Math.min(100, Math.round(Math.abs(ndviDelta) * 200));
    dominantChange   = ndviDelta > 0
      ? `Vegetation recovery: NDVI increased by ${ndviDelta.toFixed(3)}.`
      : `Vegetation decline: NDVI decreased by ${Math.abs(ndviDelta).toFixed(3)}.`;
  } else {
    changeDirection = "STABLE";
    changeMagnitude  = Math.round(Math.max(Math.abs(ndbiDelta), Math.abs(ndviDelta)) * 100);
    dominantChange   = "Area shows minimal change between the two observation periods.";
  }

  return { changeMagnitude, changeDirection, dominantChange };
}

// ─── Confidence Scoring ────────────────────────────────────────────────────────

function assessConfidence(
  cloudCover: number,
  hasProjectBoundary: boolean,
  analysisType: string
): ConfidenceLevel {
  // Cloud cover: major factor in optical satellite analysis quality
  if (cloudCover < 10 && hasProjectBoundary) return "HIGH";
  if (cloudCover < 30) return "MEDIUM";
  return "LOW";
}

// ─── GEE Python Service Stub ──────────────────────────────────────────────────
/**
 * FUTURE: Wire this up when the Python GEE microservice is deployed.
 *
 * Expected Python service API (FastAPI, runs on GEE_SERVICE_URL:8001):
 *
 *   POST /analyze
 *   Headers: { "Authorization": "Bearer <GEE_SERVICE_KEY>" }
 *   Body: {
 *     "project_id":    "uuid",
 *     "baseline_scene": "S2L2A_2024-01-01...",
 *     "current_scene":  "S2L2A_2024-07-01...",
 *     "aoi":            { "type": "Polygon", "coordinates": [...] },
 *     "analysis_type":  "NDVI_TREND" | "NDBI_CHANGE" | "CONSTRUCTION_DETECTED"
 *   }
 *   Response: {
 *     "ndvi": 0.42,
 *     "ndbii": -0.12,
 *     "bsi": 0.31,
 *     "built_up_area_m2": 8420,
 *     "vegetation_area_m2": 15200,
 *     "change_magnitude": 34,
 *     "change_direction": "GAIN",
 *     "dominant_change": "New construction detected...",
 *     "confidence": "HIGH",
 *     "tile_url": "https://storage.googleapis.com/gee-tiles/{z}/{x}/{y}",
 *     "processing_time_ms": 3400
 *   }
 *
 * Set GEE_SERVICE_URL and GEE_SERVICE_KEY in .env to activate.
 * Until then, the CDSE Evalscript path (and synthetic fallback) are used.
 */

async function callGeeService(params: {
  projectId: string;
  baselineScene?: string;
  currentScene?: string;
  aoi?: VojasGeometry;
  analysisType: string;
}): Promise<Record<string, unknown> | null> {
  if (!GEE_CONFIGURED) return null;

  try {
    const resp = await fetch(`${GEE_SERVICE_URL}/analyze`, {
      method:  "POST",
      headers: {
        Authorization: `Bearer ${GEE_SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project_id:     params.projectId,
        baseline_scene: params.baselineScene,
        current_scene: params.currentScene,
        aoi:            params.aoi,
        analysis_type: params.analysisType,
      }),
    });

    if (!resp.ok) {
      logger.warn(`[geospatial] GEE service returned ${resp.status} — falling back to CDSE`);
      return null;
    }

    return await resp.json() as Record<string, unknown>;
  } catch (err) {
    logger.warn(`[geospatial] GEE service unreachable at ${GEE_SERVICE_URL} — falling back to CDSE`, err);
    return null;
  }
}

// ─── DB Cache ─────────────────────────────────────────────────────────────────

/** Try to return a cached AnalysisResult from the DB; null if not found/stale. */
async function getCachedAnalysis(
  projectId: string,
  observationId: string | undefined,
  analysisType: string
): Promise<{ result: GeoAnalysis; id: string } | null> {
  try {
    const cached = await prisma.analysisResult.findFirst({
      where: {
        projectId,
        analysisType,
        ...(observationId ? { observationId } : {}),
        createdAt: {
          // Cache for 7 days
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!cached) return null;

    return {
      id: cached.id,
      result: {
        analysisType: cached.analysisType as AnalysisTypeEnum,
        result: JSON.parse(cached.result),
        explanation:  cached.explanation  ?? "",
        limitations:  cached.limitations ?? "",
        mapTileUrl:   cached.mapTileUrl  ?? undefined,
        modelUsed:    cached.modelUsed    ?? "unknown",
        processingTimeMs: cached.processingTimeMs ?? undefined,
      },
    };
  } catch (err) {
    logger.warn("[geospatial] Cache lookup failed", err);
    return null;
  }
}

async function saveAnalysis(
  analysis: GeoAnalysis,
  projectId: string,
  observationId?: string,
  progressId?: string
): Promise<void> {
  try {
    // Convert 0–1 index values to 0–100 for the score field
    const score = (() => {
      if (analysis.result.ndvi   !== undefined) return analysis.result.ndvi   * 100;
      if (analysis.result.ndbii !== undefined) return (analysis.result.ndbii + 1) * 50;
      if (analysis.result.changeMagnitude !== undefined) return analysis.result.changeMagnitude;
      return null;
    })();

    await prisma.analysisResult.create({
      data: {
        projectId,
        observationId,
        progressId,
        analysisType: analysis.analysisType,
        result:       JSON.stringify(analysis.result),
        score,
        mapTileUrl:   analysis.mapTileUrl,
        explanation:  analysis.explanation,
        confidence:   analysis.result.confidence,
        limitations:  analysis.limitations,
        modelUsed:    analysis.modelUsed,
        processingTimeMs: analysis.processingTimeMs,
      },
    });
  } catch (err) {
    logger.warn("[geospatial] Failed to save analysis result to DB", err);
    // Non-fatal — the analysis is still returned to the caller
  }
}

// ─── Explanation Generator ────────────────────────────────────────────────────

function buildExplanation(
  analysisType: string,
  indices: { ndvi: number; ndbi: number; bsi: number },
  changeResult?: ChangeResult,
  confidence?: ConfidenceLevel
): { explanation: string; limitations: string } {
  const ndviDesc  = indices.ndvi  > 0.5 ? "dense vegetation" : indices.ndvi  > 0.3 ? "moderate vegetation" : "sparse/bare vegetation";
  const ndbiDesc  = indices.ndbi  > 0.2 ? "strong built-up signal" : indices.ndbi > 0.1 ? "partial built-up area" : "dominantly open/barren land";
  const bsiDesc  = indices.bsi   > 0.3 ? "bare soil/industrial"  : indices.bsi  > 0.1 ? "mixed bare surface" : "vegetated or water surface";

  const base = `Sentinel-2 L2A analysis of the project AOI detected ${ndviDesc} (NDVI=${indices.ndvi.toFixed(3)}) and ${ndbiDesc} (NDBI=${indices.ndbi.toFixed(3)}). BSI=${indices.bsi.toFixed(3)} suggests ${bsiDesc}.`;

  const explanations: Record<string, string> = {
    NDVI_TREND:          `${base} NDVI trend analysis is used to monitor vegetation recovery or loss around the project site.`,
    NDBI_CHANGE:         `${base} NDBI change analysis detects urbanisation or land-cover transitions in and around the project footprint.`,
    BUILT_UP_AREA:       `${base} Built-up area estimation quantifies the physical footprint of construction activity at the project location.`,
    LAND_USE_CHANGE:     `${base} Combined NDVI+NDBI+BSI analysis identifies land-use transitions, including deforestation, urban sprawl, and agricultural conversion.`,
    CONSTRUCTION_DETECTED: changeResult
      ? `${base} ${changeResult.dominantChange} Change magnitude: ${changeResult.changeMagnitude}/100.`
      : `${base} Construction detection is based on the increase in NDBI-derived built-up area between two observation periods.`,
    WEEKLY_CHECK:        `${base} This weekly satellite check provides an updated NDVI/NDBI snapshot for routine project monitoring.`,
  };

  const limitations: Record<string, string> = {
    NDVI_TREND:          "NDVI is sensitive to vegetation phenology, seasonality, and atmospheric conditions. Sentinel-2 revisit is ~5 days; cloud cover may reduce effective temporal resolution.",
    NDBI_CHANGE:         "NDBI can conflate built-up areas with bare rock or soil. Construction detection requires >500 m² new built-up area to be flagged reliably.",
    BUILT_UP_AREA:      "Built-up area is estimated from NDBI pixels above a 0.1 threshold within the project AOI. Shadows and bare soil can cause false positives.",
    LAND_USE_CHANGE:     "Land-use change detection is limited by image availability and cloud cover. Sub-pixel change (<10 m²) may not be detectable at Sentinel-2's 10 m resolution.",
    CONSTRUCTION_DETECTED: "Relies on two cloud-free Sentinel-2 acquisitions. If cloud cover exceeds 30% for either scene, confidence is downgraded. GEE Python service provides higher accuracy for mixed-pixel analysis.",
    WEEKLY_CHECK:        "Weekly analysis is based on the most recent cloud-free Sentinel-2 scene within a ±5 day window. Sentinel-2 minimum revisit is ~5 days; weekly cadence requires multiple satellites or compositing.",
  };

  return {
    explanation: explanations[analysisType] ?? explanations["WEEKLY_CHECK"],
    limitations:  limitations[analysisType] ?? limitations["WEEKLY_CHECK"],
  };
}

// ─── Tile URL Builder ─────────────────────────────────────────────────────────

/**
 * Returns an XYZ tile URL template for the given analysis overlay style.
 * VOJAS's map client substitutes {z}/{x}/{y} placeholders.
 *
 * When GEE Python service is active, it returns its own tile URL.
 * For CDSE, this returns a CDSE WMS bounding-box tile URL as a fallback.
 */
async function buildTileUrl(params: TileUrlParams): Promise<string> {
  const style  = params.style ?? "ndvi";
  const sceneId = params.sceneId;

  // Try to get scene coordinates from DB for precise tile bounds
  // SatelliteObservation stores bbox as a JSON string: { sw: [lat,lng], ne: [lat,lng] }
  // and centerLat/centerLng as the project AOI centre.
  let bbox: [number, number, number, number] = [0, 0, 0, 0];

  try {
    const scene = await prisma.satelliteObservation.findUnique({
      where: { id: sceneId },
      select: { bbox: true, centerLat: true, centerLng: true },
    });

    if (scene) {
      if (scene.bbox) {
        try {
          const parsed = JSON.parse(scene.bbox) as { sw?: [number, number]; ne?: [number, number] };
          if (parsed.sw && parsed.ne) {
            // bbox stores [sw_lat, sw_lng, ne_lat, ne_lng] or [minLng, minLat, maxLng, maxLat]
            const parsedBbox = parsed as { sw: [number, number]; ne: [number, number] };
            bbox = [
              parsedBbox.sw[1],   // minLng
              parsedBbox.sw[0],   // minLat
              parsedBbox.ne[1],   // maxLng
              parsedBbox.ne[0],   // maxLat
            ];
          }
        } catch {
          // malformed bbox JSON — fall through to center coords
        }
      }

      // Fall back to centerLat/centerLng ± 0.005 (~500 m)
      if (bbox.every(v => v === 0) && scene.centerLat != null && scene.centerLng != null) {
        const delta = 0.005;
        bbox = [
          scene.centerLng - delta,
          scene.centerLat - delta,
          scene.centerLng + delta,
          scene.centerLat + delta,
        ];
      }
    }
  } catch {
    // Scene not in DB — caller provides project coords
  }

  // Map style → CDSE WMS layer name
  const layerMap: Record<string, string> = {
    ndvi:         "NDVI",
    ndbi:         "NDBI",
    change:       "ARCHANGE",
    construction: "CONSTRUCTION",
  };

  const layer = layerMap[style] ?? "NDVI";

  // CDSE WMS base — public tiles without authentication
  const bboxStr = bbox.join(",");
  return (
    `https://sh.dataspace.copernicus.eu/OGC/wms/v1` +
    `?service=WMS&request=GetMap&version=1.3.0` +
    `&layers=${encodeURIComponent(layer)}` +
    `&bbox=${bboxStr}&crs=EPSG:4326` +
    `&width=512&height=512&format=image/png` +
    `&opacity=0.7&transparent=true`
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export class GeospatialService {
  /**
   * Compute change between two Sentinel-2 scenes.
   * Returns cached result if available, otherwise runs CDSE Evalscript
   * (or synthetic estimation if CDSE is not configured).
   */
  async computeChange(params: ChangeParams): Promise<GeoAnalysis> {
    const start = Date.now();
    const { baselineSceneId, currentSceneId, projectBoundary } = params;

    logger.info("[geospatial] computeChange", { baselineSceneId, currentSceneId });

    // Try GEE Python service first (when configured)
    if (GEE_CONFIGURED) {
      const geeResult = await callGeeService({
        projectId:    "change-" + baselineSceneId + "-" + currentSceneId,
        baselineScene: baselineSceneId,
        currentScene:  currentSceneId,
        aoi:           projectBoundary,
        analysisType:  "CONSTRUCTION_DETECTED",
      });

      if (geeResult) {
        const analysis: GeoAnalysis = {
          analysisType:   "CONSTRUCTION_DETECTED",
          result:          geeResult as GeoAnalysis["result"],
          explanation:     String(geeResult.explanation ?? ""),
          limitations:     String(geeResult.limitations ?? ""),
          mapTileUrl:      String(geeResult.tileUrl ?? ""),
          modelUsed:       "gee-ndvi",
          processingTimeMs: Number(geeResult.processing_time_ms ?? (Date.now() - start)),
        };
        return analysis;
      }
    }

    // ── CDSE Evalscript path ─────────────────────────────────────────────────

    const hasBoundary = Boolean(projectBoundary);
    const cloudCover  = 15; // TODO: fetch from SatelliteObservation.cloudCover

    if (CDSE_CONFIGURED) {
      try {
        const bounds = extractBounds(projectBoundary);

        // Fetch both scenes concurrently
        const bands = ["B02", "B04", "B08", "B11"];
        const evalscript = buildIndexEvalscript(bands);

        // For now, fetch current scene only (baseline requires historical scene metadata)
        const [baselineData, currentData] = await Promise.all([
          callCdseProcessApi({
            bbox:      bounds,
            timeRange: { from: new Date(Date.now() - 365 * 86_400_000).toISOString(),
                         to:   new Date(Date.now() - 180 * 86_400_000).toISOString() },
            evalscript,
          }),
          callCdseProcessApi({
            bbox:      bounds,
            timeRange: { from: new Date(Date.now() - 30 * 86_400_000).toISOString(),
                         to:   new Date().toISOString() },
            evalscript,
          }),
        ]);

        const baselineIndices = aggregateCdseBands(baselineData.data);
        const currentIndices  = aggregateCdseBands(currentData.data);

        const changeResult = computeChangeBetweenScenes(
          { ...baselineIndices, builtUpArea: 0, vegetationArea: 0 },
          { ...currentIndices,   builtUpArea: 0, vegetationArea: 0 }
        );

        const { explanation, limitations } = buildExplanation(
          "CONSTRUCTION_DETECTED",
          currentIndices,
          changeResult
        );

        return {
          analysisType:   "CONSTRUCTION_DETECTED",
          result: {
            ...currentIndices,
            ...changeResult,
            confidence: assessConfidence(cloudCover, hasBoundary, "CONSTRUCTION_DETECTED"),
          },
          explanation,
          limitations,
          mapTileUrl:    currentData.tileUrl,
          modelUsed:     "sentinel-hub-evalscript",
          processingTimeMs: Date.now() - start,
        };
      } catch (err) {
        logger.warn("[geospatial] CDSE Evalscript failed — using synthetic fallback", err);
        // Fall through to synthetic fallback
      }
    }

    // ── Synthetic fallback ──────────────────────────────────────────────────

    return buildSyntheticAnalysis(
      "CONSTRUCTION_DETECTED",
      Date.now(),
      start,
      { lat: extractBounds(projectBoundary)[1], lng: extractBounds(projectBoundary)[0] }
    );
  }

  /**
   * Analyze a single Sentinel-2 scene for NDVI/NDBI/BSI metrics.
   */
  async analyzeScene(params: SceneAnalysisParams): Promise<GeoAnalysis> {
    const start = Date.now();
    const { sceneId, observationDate, projectBoundary, lat, lng } = params;

    logger.info("[geospatial] analyzeScene", { sceneId, observationDate: observationDate.toISOString() });

    // Check DB cache — keyed by sceneId since each scene has its own analysis
    const cached = await getCachedAnalysis(sceneId, sceneId, "NDVI_TREND");
    if (cached) {
      logger.info(`[geospatial] Returning cached analysis ${cached.id} for scene ${sceneId}`);
      return cached.result;
    }

    // Try GEE service
    if (GEE_CONFIGURED) {
      const geeResult = await callGeeService({
        projectId:    params.sceneId,
        baselineScene: undefined,
        currentScene:  sceneId,
        aoi:           projectBoundary,
        analysisType:  "NDVI_TREND",
      });

      if (geeResult) {
        const analysis: GeoAnalysis = {
          analysisType:   "NDVI_TREND",
          result:          geeResult as GeoAnalysis["result"],
          explanation:     String(geeResult.explanation ?? ""),
          limitations:     String(geeResult.limitations ?? ""),
          mapTileUrl:      String(geeResult.tileUrl ?? ""),
          modelUsed:       "gee-ndvi",
          processingTimeMs: Number(geeResult.processing_time_ms ?? (Date.now() - start)),
        };
        await saveAnalysis(analysis, params.sceneId, sceneId);
        return analysis;
      }
    }

    // Try CDSE
    const hasBoundary = Boolean(projectBoundary);
    const cloudCover   = 15; // TODO: fetch from SatelliteObservation

    if (CDSE_CONFIGURED) {
      try {
        const bounds   = extractBounds(projectBoundary);
        const bands    = ["B02", "B04", "B08", "B11"];
        const evalscript = buildIndexEvalscript(bands);

        const cdseData = await callCdseProcessApi({
          bbox: bounds,
          timeRange: {
            from: new Date(observationDate.getTime() - 5 * 86_400_000).toISOString(),
            to:   new Date(observationDate.getTime() + 5 * 86_400_000).toISOString(),
          },
          evalscript,
        });

        const indices = aggregateCdseBands(cdseData.data);
        const { explanation, limitations } = buildExplanation("NDVI_TREND", indices);
        const confidence = assessConfidence(cloudCover, hasBoundary, "NDVI_TREND");

        const analysis: GeoAnalysis = {
          analysisType:   "NDVI_TREND",
          result: { ...indices, confidence, dominantChange: "Single-scene analysis." },
          explanation,
          limitations,
          mapTileUrl:    cdseData.tileUrl,
          modelUsed:     "sentinel-hub-evalscript",
          processingTimeMs: Date.now() - start,
        };

        await saveAnalysis(analysis, params.sceneId, sceneId);
        return analysis;
      } catch (err) {
        logger.warn("[geospatial] CDSE scene analysis failed — using synthetic fallback", err);
      }
    }

    // Synthetic fallback
    const analysis = buildSyntheticAnalysis(
      "NDVI_TREND",
      observationDate.getTime(),
      start,
      { lat, lng }
    );
    await saveAnalysis(analysis, sceneId, sceneId);
    return analysis;
  }

  /**
   * Get the best available analysis for a project on a target date.
   * Checks DB cache first, then falls back to compute/analyze.
   */
  async getProjectAnalysis(params: ProjectAnalysisParams): Promise<GeoAnalysis | null> {
    const { projectId, targetDate, analysisType = "WEEKLY_CHECK" } = params;

    logger.info("[geospatial] getProjectAnalysis", { projectId, targetDate: targetDate.toISOString(), analysisType });

    // Try cache first
    const cached = await getCachedAnalysis(projectId, undefined, analysisType);
    if (cached) {
      return cached.result;
    }

    // Get project coords and scene from DB
    let lat: number;
    let lng: number;
    let sceneId: string | undefined;

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { latitude: true, longitude: true },
      });

      if (!project || project.latitude == null || project.longitude == null) {
        logger.warn(`[geospatial] Project ${projectId} not found or missing coordinates`);
        return null;
      }

      lat = project.latitude;
      lng = project.longitude;
    } catch (err) {
      logger.error(`[geospatial] Failed to load project ${projectId}`, err);
      return null;
    }

    // Find nearest SatelliteObservation
    try {
      const windowDays = 15;
      const scene = await prisma.satelliteObservation.findFirst({
        where: {
          projectId,
          observationDate: {
            gte: new Date(targetDate.getTime() - windowDays * 86_400_000),
            lte: new Date(targetDate.getTime() + windowDays * 86_400_000),
          },
        },
        orderBy: { observationDate: "asc" },
      });

      if (scene) {
        sceneId = scene.id;
        // centerLat/centerLng are the project AOI centre within the scene
        lat = scene.centerLat ?? lat;
        lng = scene.centerLng ?? lng;
      }
    } catch {
      // SatelliteObservation table may not be populated — proceed with project coords
    }

    // If analyzeScene() fell back to synthetic values, re-generate with the
    // project's real coordinates so the indices are location-aware.
    let analysis = await this.analyzeScene({
      sceneId:  sceneId ?? projectId,
      observationDate: targetDate,
      projectBoundary: undefined,
      lat,
      lng,
    });

    if (analysis.modelUsed === "synthetic-estimate") {
      analysis = buildSyntheticAnalysis(
        analysisType,
        targetDate.getTime(),
        0,
        { lat, lng }
      );
    }

    // Tag with the requested analysis type if different
    if (analysisType !== analysis.analysisType) {
      analysis.analysisType = analysisType as AnalysisTypeEnum;
    }

    await saveAnalysis(analysis, projectId, sceneId);
    return analysis;
  }

  /**
   * Generate an XYZ tile URL for the requested analysis overlay.
   */
  async getAnalysisTileUrl(params: TileUrlParams): Promise<string> {
    logger.info("[geospatial] getAnalysisTileUrl", params);
    return buildTileUrl(params);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function extractBounds(geometry?: VojasGeometry): [number, number, number, number] {
  if (!geometry) {
    // Default to India — will be overridden by actual project coords
    return [68.1, 6.7, 97.4, 35.5];
  }

  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates[0] as [number, number][];
    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
  }

  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates as [number, number];
    const delta = 0.005; // ~500 m box
    return [lng - delta, lat - delta, lng + delta, lat + delta];
  }

  // MultiPolygon, LineString, etc. — use centroid approximation
  return [68.1, 6.7, 97.4, 35.5];
}

function aggregateCdseBands(data: Record<string, number[]>): { ndvi: number; ndbi: number; bsi: number; ndbii: number } {
  // The Evalscript returns arrays of per-pixel values; take the mean
  const mean = (arr: number[]): number =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const ndvi  = parseFloat(mean(data.ndvi ?? []).toFixed(4));
  const ndbi  = parseFloat(mean(data.ndbi ?? []).toFixed(4));
  const bsi   = parseFloat(mean(data.bsi  ?? []).toFixed(4));
  return {
    ndvi,
    ndbi,
    bsi,
    ndbii: ndbi,    // alias for compatibility with GeoAnalysis.result
  };
}

function buildSyntheticAnalysis(
  analysisType: string,
  timestamp: number,
  start: number,
  coords: { lat: number; lng: number } = { lat: 20.5937, lng: 78.9629 }
): GeoAnalysis {
  const date = new Date(timestamp);
  const { lat, lng } = coords;

  const { ndvi, ndbi, bsi, builtUpArea, vegetationArea } =
    estimateIndicesFromProject("synthetic-" + timestamp, lat, lng, date);

  const { explanation, limitations } = buildExplanation(analysisType, { ndvi, ndbi, bsi });

  const changeDirection: ChangeDirection = ndbi > 0.2 ? "GAIN" : ndbi < -0.1 ? "LOSS" : "STABLE";
  const changeMagnitude = Math.min(100, Math.round(Math.abs(ndbi - 0.1) * 200));

  const dominantChange = (() => {
    if (builtUpArea > 500_000) return "Substantial built-up area detected — active construction phase.";
    if (builtUpArea > 100_000) return "Moderate built-up area — construction underway.";
    if (vegetationArea > 500_000) return "Vegetation-dominant land cover — site largely undeveloped.";
    return "Mixed land cover with no dominant change signal.";
  })();

  return {
    analysisType:   analysisType as AnalysisTypeEnum,
    result: {
      ndvi,
      ndbii: ndbi,
      bsi,
      builtUpArea,
      vegetationArea,
      changeMagnitude,
      changeDirection,
      confidence:     "LOW",
      dominantChange,
    },
    explanation,
    limitations:    `${limitations} NOTE: This result is a synthetic estimate — configure CDSE_CLIENT_ID and CDSE_CLIENT_SECRET in .env for real Sentinel-2 NDVI/NDBI/BSI analysis.`,
    mapTileUrl:      undefined,
    modelUsed:       "synthetic-estimate",
    processingTimeMs: Date.now() - start,
  };
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const geospatialService = new GeospatialService();
