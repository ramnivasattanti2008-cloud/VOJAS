/**
 * Copernicus Data Space Ecosystem (CDSE) Sentinel-2 Service — VOJAS
 *
 * Provides real Sentinel-2 L2A imagery for MPLAD project sites via the
 * Copernicus Data Space Ecosystem STAC API + WMS tile service.
 *
 * Env vars required:
 *   CDSE_CLIENT_ID     — CDSE OAuth2 client ID
 *   CDSE_CLIENT_SECRET — CDSE OAuth2 client secret
 *
 * CDSE free tier: 300 req/min.  A simple in-memory rate limiter enforces
 * this automatically.
 *
 * References:
 *   https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/STAC.html
 *   https://documentation.dataspace.copernicus.eu/APIs/WMS.html
 */

import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

// ── Constants ──────────────────────────────────────────────────────────────────

const CDSE_TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const CDSE_CATALOGUE_URL = "https://catalogue.dataspace.copernicus.eu/stac/collections/SENTINEL-2/items";
const CDSE_WMS_BASE = "https://adas.dataspace.copernicus.eu/wms";

const METRES_PER_DEGREE = 111_320; // ≈ metres per degree of latitude at equator
const CDSE_RATE_LIMIT = 280;        // requests per minute (keep below 300)
const TOKEN_CACHE_BUFFER_SECS = 60; // refresh token this many seconds early

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CDSEScene {
  id: string;
  observationDate: Date;
  cloudCover: number;       // 0–100
  resolution: number;       // 10 m for Sentinel-2 RGB
  bbox: { sw: [number, number]; ne: [number, number] }; // [lat, lng]
  tileUrl: string;
  thumbnailUrl: string;
  provider: "CDSE";
  satellite: "SENTINEL-2A" | "SENTINEL-2B";
  sensor: "MSI";
  dataset: "S2_L2A";
  sourceUrl: string;
  processingDate: Date | null;
  processingBaseline: string | null;
}

export interface CDSESearchParams {
  lat: number;
  lng: number;
  radiusMeters?: number;
  from?: Date;
  to?: Date;
  maxCloudCover?: number;
  limit?: number;
}

export interface CDSENearestParams {
  lat: number;
  lng: number;
  targetDate: Date;
  radiusMeters?: number;
  maxCloudCover?: number;
}

export interface CDSEBestParams {
  lat: number;
  lng: number;
  from: Date;
  to: Date;
  maxCloudCover?: number;
  limit?: number;
}

export interface CDSEIngestResult {
  created: number;
  skipped: number;
  errors: number;
}

// ── Rate Limiter ─────────────────────────────────────────────────────────────

class RateLimiter {
  private queue: Array<() => void> = [];
  private tokens = CDSE_RATE_LIMIT;
  private lastRefill: number;
  private readonly refillRate = CDSE_RATE_LIMIT / 60_000; // tokens per ms

  constructor() {
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(CDSE_RATE_LIMIT, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
      setTimeout(() => {
        this.refill();
        while (this.tokens >= 1 && this.queue.length > 0) {
          this.tokens -= 1;
          const fn = this.queue.shift();
          if (fn) fn();
        }
      }, 1000);
    });
  }
}

const rateLimiter = new RateLimiter();

// ── Token Cache ───────────────────────────────────────────────────────────────

interface CachedToken {
  token: string;
  expiresAt: number; // ms since epoch
}

let cachedToken: CachedToken | null = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseSatelliteFromSceneId(id: string): "SENTINEL-2A" | "SENTINEL-2B" {
  if (id.startsWith("S2B")) return "SENTINEL-2B";
  return "SENTINEL-2A";
}

function buildBbox(lat: number, lng: number, radiusMeters: number): string {
  const deg = radiusMeters / METRES_PER_DEGREE;
  // CDSE bbox order: minX,minY,maxX,maxY  (→ minLng,minLat,maxLng,maxLat)
  return `${(lng - deg).toFixed(6)},${(lat - deg).toFixed(6)},${(lng + deg).toFixed(6)},${(lat + deg).toFixed(6)}`;
}

function parseBboxFromGeoJson(geometry: any): { sw: [number, number]; ne: [number, number] } | null {
  if (!geometry?.coordinates) return null;
  let coords: number[][] = [];

  if (geometry.type === "Polygon") {
    // Outer ring only
    coords = geometry.coordinates[0] as number[][];
  } else if (geometry.type === "MultiPolygon") {
    coords = geometry.coordinates[0][0] as number[][];
  } else {
    return null;
  }

  if (!coords.length) return null;

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lng, lat] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  return { sw: [minLat, minLng], ne: [maxLat, maxLng] };
}

function buildWmsTileUrl(sceneId: string, token: string): string {
  // Attempt to extract datetime from scene ID: S2A_MSIL2A_20240613T053641_...
  const isoMatch = sceneId.match(/_(\d{8}T\d{6})_/);
  const isoTime = isoMatch ? isoMatch[1] : undefined;
  const timeParam = isoTime ? `&time=${isoTime}` : "";

  return (
    `${CDSE_WMS_BASE}?service=WMS&request=GetMap` +
    `&layers=1_NATURAL_COLOUR_RGB` +
    `&srs=EPSG:4326` +
    `&width=512&height=512` +
    `&token=${token}` +
    timeParam
  );
}

function buildThumbnailUrl(sceneId: string, token: string): string {
  return (
    `${CDSE_WMS_BASE}?service=WMS&request=GetMap` +
    `&layers=1_NATURAL_COLOUR_RGB` +
    `&srs=EPSG:4326` +
    `&width=256&height=256` +
    `&token=${token}` +
    `&transparent=false`
  );
}

// Map CDSE STAC properties → CDSEScene
function mapStacItemToScene(item: any, token: string): CDSEScene | null {
  try {
    const props = item.properties ?? {};
    const assets = item.assets ?? {};

    const id: string = item.id ?? "";
    const rawDate = props.datetime ?? props.created;
    if (!rawDate) return null;

    const observationDate = new Date(rawDate);
    if (isNaN(observationDate.getTime())) return null;

    const cloudCover = Math.round(props["eo:cloud_cover"] ?? 100);
    const parsedBbox = parseBboxFromGeoJson(item.geometry);
    if (!parsedBbox) return null;

    const rawProcessingDate = props.created ?? null;
    const processingDate = rawProcessingDate ? new Date(rawProcessingDate) : null;

    // processingBaseline is not in STAC properties; check assets for hints
    const processingBaseline: string | null = null;

    return {
      id,
      observationDate,
      cloudCover,
      resolution: 10,
      bbox: parsedBbox,
      tileUrl: buildWmsTileUrl(id, token),
      thumbnailUrl: buildThumbnailUrl(id, token),
      provider: "CDSE",
      satellite: parseSatelliteFromSceneId(id),
      sensor: "MSI",
      dataset: "S2_L2A",
      sourceUrl: `${CDSE_CATALOGUE_URL}/${id}`,
      processingDate: isNaN(processingDate?.getTime() ?? NaN) ? null : processingDate,
      processingBaseline,
    };
  } catch {
    return null;
  }
}

// ── OAuth2 Token ──────────────────────────────────────────────────────────────

async function getValidToken(): Promise<string | null> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt - TOKEN_CACHE_BUFFER_SECS * 1000 > now) {
    return cachedToken.token;
  }

  // Fetch a fresh token (and capture its TTL)
  const clientId = process.env.CDSE_CLIENT_ID;
  const clientSecret = process.env.CDSE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    logger.warn("[cdse] CDSE_CLIENT_ID or CDSE_CLIENT_SECRET not set — CDSE calls will be skipped");
    return null;
  }

  let token: string;
  let expiresInSecs = 3600;
  try {
    await rateLimiter.acquire();
    const response = await fetch(CDSE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logger.error(`[cdse] Token fetch failed (${response.status}): ${text}`);
      return null;
    }

    const data = (await response.json()) as { access_token: string; expires_in?: number };
    token = data.access_token;
    expiresInSecs = data.expires_in ?? 3600;
  } catch (err) {
    logger.error("[cdse] Exception fetching OAuth2 token", err);
    return null;
  }

  cachedToken = {
    token,
    expiresAt: now + expiresInSecs * 1000,
  };

  logger.info(`[cdse] OAuth2 token obtained, expires in ${expiresInSecs}s`);
  return token;
}

// ── STAC Catalog Search ───────────────────────────────────────────────────────

interface StacSearchResult {
  features: any[];
  numberMatched?: number;
}

async function stacSearch(params: {
  bbox: string;
  datetime: string;
  "eo:cloud_cover"?: string;
  limit?: number;
  token: string;
}): Promise<any[]> {
  const url = new URL(CDSE_CATALOGUE_URL);
  url.searchParams.set("bbox", params.bbox);
  url.searchParams.set("datetime", params.datetime);
  if (params["eo:cloud_cover"]) {
    url.searchParams.set("eo:cloud_cover", params["eo:cloud_cover"]);
  }
  url.searchParams.set("limit", String(params.limit ?? 50));
  url.searchParams.set("token", params.token); // CDSE STAC uses token param

  await rateLimiter.acquire();

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (response.status === 401 || response.status === 403) {
      logger.warn("[cdse] STAC auth failed — clearing cached token");
      cachedToken = null;
      return [];
    }

    if (response.status === 404) {
      logger.info("[cdse] STAC endpoint returned 404 — CDSE may be unavailable");
      return [];
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logger.error(`[cdse] STAC search failed (${response.status}): ${text}`);
      return [];
    }

    const data = (await response.json()) as StacSearchResult;
    return data.features ?? [];
  } catch (err) {
    logger.error("[cdse] Exception during STAC search", err);
    return [];
  }
}

// ── CDSE Service ──────────────────────────────────────────────────────────────

class CDSEService {
  /**
   * OAuth2 token. Returns null if credentials are not configured.
   */
  async getToken(): Promise<string | null> {
    return getValidToken();
  }

  /**
   * Search Sentinel-2 L2A scenes covering a lat/lng point.
   * Returns scenes sorted by observation date descending (newest first).
   */
  async searchScenes(params: CDSESearchParams): Promise<CDSEScene[]> {
    const {
      lat,
      lng,
      radiusMeters = 1000,
      from,
      to,
      maxCloudCover = 70,
      limit = 50,
    } = params;

    const token = await getValidToken();
    if (!token) {
      logger.warn("[cdse] Skipping scene search — no valid token");
      return [];
    }

    const bbox = buildBbox(lat, lng, radiusMeters);

    const toDate = to ? to : new Date();
    const fromDate = from ?? new Date(toDate.getTime() - 365 * 24 * 60 * 60 * 1000); // default: last year
    const datetime = `${fromDate.toISOString()}/${toDate.toISOString()}`;

    logger.info(`[cdse] Searching scenes: lat=${lat} lng=${lng} bbox=${bbox} from=${fromDate.toISOString()} to=${toDate.toISOString()}`);

    const features = await stacSearch({
      bbox,
      datetime,
      "eo:cloud_cover": `0/${maxCloudCover}`,
      limit,
      token,
    });

    const scenes: CDSEScene[] = [];
    for (const feature of features) {
      const scene = mapStacItemToScene(feature, token);
      if (scene) scenes.push(scene);
    }

    // Sort newest first
    scenes.sort((a, b) => b.observationDate.getTime() - a.observationDate.getTime());

    logger.info(`[cdse] Found ${scenes.length} scenes for lat=${lat} lng=${lng}`);
    return scenes;
  }

  /**
   * Get the single nearest scene to a target date.
   */
  async getNearestScene(params: CDSENearestParams): Promise<CDSEScene | null> {
    const { lat, lng, targetDate, radiusMeters = 1000, maxCloudCover = 70 } = params;

    const token = await getValidToken();
    if (!token) return null;

    const bbox = buildBbox(lat, lng, radiusMeters);

    // Expand date window: ±6 months around target
    const halfYear = 180 * 24 * 60 * 60 * 1000;
    const fromDate = new Date(targetDate.getTime() - halfYear);
    const toDate = new Date(targetDate.getTime() + halfYear);
    const datetime = `${fromDate.toISOString()}/${toDate.toISOString()}`;

    const features = await stacSearch({
      bbox,
      datetime,
      "eo:cloud_cover": `0/${maxCloudCover}`,
      limit: 20,
      token,
    });

    let best: CDSEScene | null = null;
    let bestDiff = Infinity;

    for (const feature of features) {
      const scene = mapStacItemToScene(feature, token);
      if (!scene) continue;

      const diff = Math.abs(scene.observationDate.getTime() - targetDate.getTime());
      if (diff < bestDiff) {
        bestDiff = diff;
        best = scene;
      }
    }

    if (best) {
      logger.info(`[cdse] Nearest scene to ${targetDate.toISOString()}: ${best.id} (${bestDiff / 86_400_000} days away)`);
    } else {
      logger.info(`[cdse] No scene found near target date ${targetDate.toISOString()}`);
    }

    return best;
  }

  /**
   * Get the best N scenes (least cloudy) within a date range.
   */
  async getBestScenes(params: CDSEBestParams): Promise<CDSEScene[]> {
    const { lat, lng, from, to, maxCloudCover = 70, limit = 5 } = params;

    const token = await getValidToken();
    if (!token) return [];

    const radiusMeters = 1000;
    const bbox = buildBbox(lat, lng, radiusMeters);
    const datetime = `${from.toISOString()}/${to.toISOString()}`;

    const features = await stacSearch({
      bbox,
      datetime,
      "eo:cloud_cover": `0/${maxCloudCover}`,
      limit: Math.max(limit * 4, 30), // fetch more, then pick best
      token,
    });

    const scenes: CDSEScene[] = [];
    for (const feature of features) {
      const scene = mapStacItemToScene(feature, token);
      if (scene) scenes.push(scene);
    }

    // Sort by cloud cover asc (least cloudy first), then by date desc
    scenes.sort((a, b) => {
      if (a.cloudCover !== b.cloudCover) return a.cloudCover - b.cloudCover;
      return b.observationDate.getTime() - a.observationDate.getTime();
    });

    return scenes.slice(0, limit);
  }

  /**
   * Ingest all CDSE Sentinel-2 observations for a project into the DB.
   *
   * Skips scenes that are already stored (by unique sceneId + observationDate).
   * Returns counts of created, skipped, and errored records.
   */
  async ingestProjectObservations(params: {
    projectId: string;
    lat: number;
    lng: number;
    from?: Date;
    to?: Date;
    maxCloudCover?: number;
  }): Promise<CDSEIngestResult> {
    const { projectId, lat, lng, from, to, maxCloudCover = 70 } = params;

    logger.info(`[cdse] Starting ingestion for project ${projectId} at ${lat},${lng}`);

    const scenes = await this.searchScenes({
      lat,
      lng,
      radiusMeters: 1000,
      from,
      to,
      maxCloudCover,
      limit: 100,
    });

    if (!scenes.length) {
      logger.info(`[cdse] No scenes found for project ${projectId} — nothing to ingest`);
      return { created: 0, skipped: 0, errors: 0 };
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const scene of scenes) {
      try {
        // Upsert — skip if already exists
        const existing = await prisma.satelliteObservation.findUnique({
          where: { sceneId_observationDate: { sceneId: scene.id, observationDate: scene.observationDate } },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.satelliteObservation.create({
          data: {
            projectId,
            sceneId: scene.id,
            observationDate: scene.observationDate,
            provider: scene.provider,
            satellite: scene.satellite,
            sensor: scene.sensor,
            dataset: scene.dataset,
            cloudCover: scene.cloudCover,
            resolution: scene.resolution,
            bbox: JSON.stringify(scene.bbox),
            tileUrl: scene.tileUrl,
            thumbnailUrl: scene.thumbnailUrl,
            centerLat: lat,
            centerLng: lng,
            processingDate: scene.processingDate,
            processingBaseline: scene.processingBaseline,
            processingLevel: "L2A",
            sourceUrl: scene.sourceUrl,
            sourceName: "Copernicus Data Space Ecosystem",
            retrievalDate: new Date(),
          },
        });

        created++;
        logger.debug(`[cdse] Ingested scene ${scene.id} for project ${projectId}`);
      } catch (err) {
        // Handle unique constraint violations gracefully
        if ((err as any)?.code === "P2002") {
          skipped++;
        } else {
          logger.error(`[cdse] Failed to ingest scene ${scene.id}`, err);
          errors++;
        }
      }
    }

    logger.info(
      `[cdse] Ingestion complete for project ${projectId}: ${created} created, ${skipped} skipped, ${errors} errors`
    );
    return { created, skipped, errors };
  }
}

// ── Singleton export ─────────────────────────────────────────────────────────

export const cdseService = new CDSEService();
