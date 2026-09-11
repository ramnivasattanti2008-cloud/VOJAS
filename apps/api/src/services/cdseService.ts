/**
 * Copernicus Data Space Ecosystem (CDSE) Sentinel-2 Service — VOJAS 2.0
 *
 * Two independent capability tiers, each honest about what it needs:
 *
 * 1. CATALOG (this file) — STAC search over stac.dataspace.copernicus.eu/v1.
 *    PUBLIC. No credentials required. Returns real product ids, acquisition
 *    timestamps, eo:cloud_cover, footprints, and a publicly fetchable
 *    whole-granule quicklook JPEG per item. This is what powers observation
 *    listing, historical dates, and the "best observation" selector even
 *    when CDSE_CLIENT_ID/SECRET are unset.
 *
 * 2. PIXEL PROCESSING (satelliteEOAnalysis.ts / cdsePixelProvider.ts) —
 *    Sentinel Hub Process API. Requires OAuth (CDSE_CLIENT_ID/SECRET).
 *    AOI-cropped true-colour rendering, NDVI/NDBI/BSI computed from real
 *    B04/B08 pixels, and change-detection metrics all live there and return
 *    an explicit unavailable state (not a fabricated number) while
 *    credentials are absent.
 *
 * Historical note: the catalogue URL this file used before pointed at
 * catalogue.dataspace.copernicus.eu/stac/collections/SENTINEL-2/items, which
 * now answers 404 — CDSE moved to a v1 STAC API. It also gated catalog search
 * on an OAuth token, and built WMS "tile" URLs against
 * adas.dataspace.copernicus.eu (unreachable) with the access token embedded
 * in the URL — a URL that was then persisted and served to browsers. Fixed by
 * switching to the live public STAC endpoint and its real thumbnail asset.
 *
 * Env vars:
 *   CDSE_CLIENT_ID     — CDSE OAuth2 client ID (register at dataspace.copernicus.eu).
 *                        Needed only for pixel processing, not catalog search.
 *   CDSE_CLIENT_SECRET — CDSE OAuth2 client secret
 *   SATELLITE_CLOUD_THRESHOLD — Max cloud cover % to consider usable (default: 60)
 *   SATELLITE_SEARCH_WINDOW_DAYS — ± days around target to search (default: 14)
 *
 * CDSE free tier: 300 req/min. A sliding-window rate limiter enforces this
 * automatically so the service never exceeds the limit.
 *
 * References:
 *   https://documentation.dataspace.copernicus.eu/APIs/STAC.html
 *   https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Process.html
 */

import type { PrismaClient } from '@vojas/db';
import type { Prisma } from '@vojas/db';
import { logger } from '../utils/logger.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const CDSE_TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';

// CDSE STAC API v1. This is the live catalogue and it is PUBLIC — search needs no
// credentials, which is what lets the catalogue half of this subsystem return real
// observations before anyone provisions CDSE_CLIENT_ID/SECRET.
//
// The previous constant pointed at
//   https://catalogue.dataspace.copernicus.eu/stac/collections/SENTINEL-2/items
// which now answers 404, so scene search could not have worked even WITH
// credentials. Verified 2026-09-11: v1/search returns real Sentinel-2 L2A items
// (product id, acquisition datetime, eo:cloud_cover, geometry).
const CDSE_STAC_SEARCH_URL = 'https://stac.dataspace.copernicus.eu/v1/search';
const CDSE_STAC_ITEM_BASE = 'https://stac.dataspace.copernicus.eu/v1/collections/sentinel-2-l2a/items';
const CDSE_STAC_COLLECTION = 'sentinel-2-l2a';

const METRES_PER_DEGREE = 111_320; // ≈ metres per degree of latitude at equator
const CDSE_RATE_LIMIT = 280; // requests per minute (keep below 300 to be safe)
const TOKEN_CACHE_BUFFER_SECS = 60; // refresh token this many seconds early

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CDSEScene {
  id: string;
  observationDate: Date;
  cloudCover: number; // 0–100
  resolution: number; // 10 m for Sentinel-2 RGB
  bbox: { sw: [number, number]; ne: [number, number] }; // [lat, lng]
  /**
   * Publicly fetchable product quicklook (whole-granule JPEG) taken straight from
   * the STAC item's `thumbnail` asset. Null when the item carries no thumbnail —
   * never a synthesised or placeholder URL.
   */
  tileUrl: string | null;
  thumbnailUrl: string | null;
  provider: 'CDSE';
  // Sentinel-2C is operational and the live catalogue returns S2C products
  // constantly; the union previously stopped at 2B, so every S2C scene was
  // recorded as SENTINEL-2A — a provenance error about which satellite observed
  // the site.
  satellite: 'SENTINEL-2A' | 'SENTINEL-2B' | 'SENTINEL-2C' | 'SENTINEL-2';
  sensor: 'MSI';
  dataset: 'S2_L2A';
  sourceUrl: string;
  processingDate: Date | null;
  processingBaseline: string | null;
  acquisitionTimestamp: Date | null;
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

export interface CDSENearestResult {
  status: 'FOUND' | 'NO_USABLE_OBSERVATION' | 'NOT_CONFIGURED' | 'ERROR';
  scene?: CDSEScene;
  reason?: string;
  searchWindow?: { start: string; end: string };
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

/**
 * Which spacecraft acquired the scene, read from the product id prefix.
 *
 * Falls back to the generic 'SENTINEL-2' rather than guessing a specific
 * spacecraft: this value is shown to users as provenance, so naming the wrong
 * satellite is worse than naming the constellation.
 */
export function parseSatelliteFromSceneId(
  id: string
): 'SENTINEL-2A' | 'SENTINEL-2B' | 'SENTINEL-2C' | 'SENTINEL-2' {
  if (id.startsWith('S2A')) return 'SENTINEL-2A';
  if (id.startsWith('S2B')) return 'SENTINEL-2B';
  if (id.startsWith('S2C')) return 'SENTINEL-2C';
  return 'SENTINEL-2';
}

/**
 * A square bbox in degrees around a point, sized to radiusMeters. This is the
 * "derived observation area around the coordinate" tier of AOI — used only
 * when the project has no official polygon. Callers must present it to users
 * as derived, not as an official project boundary.
 */
export function buildBboxArray(
  lat: number,
  lng: number,
  radiusMeters: number
): [number, number, number, number] {
  const deg = radiusMeters / METRES_PER_DEGREE;
  // STAC bbox order: minLng, minLat, maxLng, maxLat
  return [lng - deg, lat - deg, lng + deg, lat + deg];
}

export function parseBboxFromGeoJson(geometry: unknown): { sw: [number, number]; ne: [number, number] } | null {
  if (!geometry || typeof geometry !== 'object') return null;
  const g = geometry as { coordinates?: unknown };
  if (!g.coordinates) return null;

  let coords: number[][] = [];
  const geomType = (geometry as { type?: string }).type ?? '';

  if (geomType === 'Polygon') {
    coords = ((g.coordinates as number[][][])[0]) as number[][];
  } else if (geomType === 'MultiPolygon') {
    coords = ((g.coordinates as number[][][][])[0][0]) as number[][];
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

/**
 * The publicly fetchable quicklook href for a STAC item, or null.
 *
 * This replaces two builders that synthesised WMS GetMap URLs against
 * `adas.dataspace.copernicus.eu`, which is unreachable (connection failure, not
 * even an HTTP status), and which embedded the OAuth access token as `&token=`
 * in a URL that was then persisted to SatelliteObservation.thumbnailUrl/tileUrl
 * and served to browsers — leaking a CDSE credential to every client. They also
 * carried no BBOX, so the URL was not scoped to the project's area of interest.
 *
 * The item's own `thumbnail` asset needs no credential and is a real JPEG of the
 * granule. Returning null when it is absent keeps "no preview" distinguishable
 * from "a preview that 404s".
 */
export function extractQuicklookHref(assets: Record<string, unknown>): string | null {
  // CDSE spells it `thumbnail`; accept the other common STAC spellings too.
  for (const key of ['thumbnail', 'quicklook', 'overview', 'rendered_preview']) {
    const asset = assets[key] as { href?: unknown } | undefined;
    const href = asset?.href;
    if (typeof href === 'string' && href.startsWith('https://')) return href;
  }
  return null;
}

/**
 * Maps one CDSE STAC item to a CDSEScene. Returns null (never a partial or
 * guessed record) when the item is missing a usable date, geometry, or cloud
 * cover figure — those three are the only claims this function makes about the
 * scene, and each one must come straight from the STAC response.
 */
export function mapStacItemToScene(item: unknown): CDSEScene | null {
  try {
    const typed = item as Record<string, unknown>;
    const props = (typed.properties ?? {}) as Record<string, unknown>;
    const assets = (typed.assets ?? {}) as Record<string, unknown>;
    const id: string = (typed.id as string) ?? '';
    if (!id) return null;

    const rawDate = (props.datetime ?? props.start_datetime) as string | undefined;
    if (!rawDate) return null;

    const observationDate = new Date(rawDate);
    if (isNaN(observationDate.getTime())) return null;

    // eo:cloud_cover is a required STAC EO extension field for Sentinel-2 L2A.
    // If a response item is missing it, cloud quality is genuinely unknown —
    // defaulting to 0 (looks great) or 100 (looks unusable) both fabricate a
    // reading, so the item is dropped instead of guessed.
    const rawCloud = props['eo:cloud_cover'];
    if (typeof rawCloud !== 'number' || Number.isNaN(rawCloud)) return null;
    const cloudCover = Math.round(rawCloud * 100) / 100;

    const parsedBbox = parseBboxFromGeoJson(typed.geometry);
    if (!parsedBbox) return null;

    const rawProcessingDate = (props.created as string) ?? null;
    const processingDate = rawProcessingDate ? new Date(rawProcessingDate) : null;
    const quicklookHref = extractQuicklookHref(assets);

    return {
      id,
      observationDate,
      cloudCover,
      resolution: 10,
      bbox: parsedBbox,
      // Same asset for both: CDSE's public thumbnail is a single whole-granule
      // JPEG, not a tile service. There is no AOI-cropped tile without an
      // authenticated Sentinel Hub Process API call (see satelliteEOAnalysis.ts).
      tileUrl: quicklookHref,
      thumbnailUrl: quicklookHref,
      provider: 'CDSE',
      satellite: parseSatelliteFromSceneId(id),
      sensor: 'MSI',
      dataset: 'S2_L2A',
      sourceUrl: `${CDSE_STAC_ITEM_BASE}/${id}`,
      processingDate: isNaN(processingDate?.getTime() ?? NaN) ? null : processingDate,
      processingBaseline: null,
      acquisitionTimestamp: observationDate,
    };
  } catch {
    return null;
  }
}

// ── OAuth2 Token ─────────────────────────────────────────────────────────────

async function getValidToken(): Promise<string | null> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt - TOKEN_CACHE_BUFFER_SECS * 1000 > now) {
    return cachedToken.token;
  }

  const clientId = process.env.CDSE_CLIENT_ID;
  const clientSecret = process.env.CDSE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    logger.warn('[cdse] CDSE_CLIENT_ID or CDSE_CLIENT_SECRET not set — CDSE calls will be skipped');
    return null;
  }

  let token: string;
  let expiresInSecs = 3600;
  try {
    await rateLimiter.acquire();
    const response = await fetch(CDSE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logger.error(`[cdse] Token fetch failed (${response.status}): ${text}`);
      return null;
    }

    const data = (await response.json()) as { access_token: string; expires_in?: number };
    token = data.access_token;
    expiresInSecs = data.expires_in ?? 3600;
  } catch (err) {
    logger.error('[cdse] Exception fetching OAuth2 token', { error: String(err) });
    return null;
  }

  cachedToken = { token, expiresAt: now + expiresInSecs * 1000 };
  logger.info(`[cdse] OAuth2 token obtained, expires in ${expiresInSecs}s`);
  return token;
}

// ── STAC Catalog Search ───────────────────────────────────────────────────────

interface StacSearchResult {
  features: unknown[];
  numberMatched?: number;
}

/**
 * Queries the CDSE STAC catalogue. This endpoint is public — catalog search
 * (dates, cloud cover, product ids, footprints, quicklook hrefs) needs no CDSE
 * credential at all. Only pixel-level processing (Sentinel Hub Process API,
 * true-colour rendering, NDVI) requires OAuth, and that is a separate code
 * path (see satelliteEOAnalysis.ts) gated on isConfigured().
 */
async function stacSearch(params: {
  bbox: [number, number, number, number];
  datetime: string;
  maxCloudCover?: number;
  limit?: number;
}): Promise<{ features: unknown[]; status: 'OK' | 'SOURCE_UNAVAILABLE' | 'RATE_LIMITED' }> {
  await rateLimiter.acquire();

  const body: Record<string, unknown> = {
    collections: [CDSE_STAC_COLLECTION],
    bbox: params.bbox,
    datetime: params.datetime,
    limit: params.limit ?? 50,
  };
  if (typeof params.maxCloudCover === 'number') {
    body.query = { 'eo:cloud_cover': { lte: params.maxCloudCover } };
  }

  try {
    const response = await fetch(CDSE_STAC_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      logger.warn('[cdse] STAC search rate-limited');
      return { features: [], status: 'RATE_LIMITED' };
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logger.error(`[cdse] STAC search failed (${response.status}): ${text}`);
      return { features: [], status: 'SOURCE_UNAVAILABLE' };
    }

    const data = (await response.json()) as StacSearchResult;
    return { features: data.features ?? [], status: 'OK' };
  } catch (err) {
    logger.error('[cdse] Exception during STAC search', { error: String(err) });
    return { features: [], status: 'SOURCE_UNAVAILABLE' };
  }
}

// ── Ingestion to Prisma ───────────────────────────────────────────────────────

async function upsertObservation(
  prisma: PrismaClient,
  projectId: string,
  scene: CDSEScene,
  targetDate?: Date,
  selectionReason?: string
): Promise<{ created: boolean; skipped: boolean; error: boolean }> {
  try {
    const existing = await prisma.satelliteObservation.findUnique({
      where: {
        projectId_sceneId_observationDate: {
          projectId,
          sceneId: scene.id,
          observationDate: scene.observationDate,
        },
      },
    });

    if (existing) {
      return { created: false, skipped: true, error: false };
    }

    await prisma.satelliteObservation.create({
      data: {
        projectId,
        sceneId: scene.id,
        observationDate: scene.observationDate,
        targetDate: targetDate ?? null,
        provider: scene.provider,
        satellite: scene.satellite,
        sensor: scene.sensor,
        dataset: scene.dataset,
        cloudCover: scene.cloudCover,
        resolution: scene.resolution,
        bbox: scene.bbox as unknown as Prisma.InputJsonValue,
        tileUrl: scene.tileUrl,
        thumbnailUrl: scene.thumbnailUrl,
        centerLat: (scene.bbox.sw[0] + scene.bbox.ne[0]) / 2,
        centerLng: (scene.bbox.sw[1] + scene.bbox.ne[1]) / 2,
        processingDate: scene.processingDate ?? undefined,
        processingLevel: 'L2A',
        sourceUrl: scene.sourceUrl,
        sourceName: 'Copernicus Data Space Ecosystem',
        retrievalDate: new Date(),
        quality: 'USABLE',
        selectionReason: selectionReason ?? 'NEAREST_TARGET',
      },
    });

    return { created: true, skipped: false, error: false };
  } catch (err) {
    const errObj = err as { code?: string };
    if (errObj.code === 'P2002') {
      return { created: false, skipped: true, error: false };
    }
    logger.error(`[cdse] Failed to upsert scene ${scene.id}`, { error: String(err) });
    return { created: false, skipped: false, error: true };
  }
}

// ── CDSEService ─────────────────────────────────────────────────────────────

class CDSEService {
  private get prisma(): PrismaClient {
    // Lazy import to avoid circular deps
     
    const { prisma: p } = require('@vojas/db');
    return p;
  }

  /**
   * Returns true only if CDSE credentials are configured.
   */
  isConfigured(): boolean {
    return !!(process.env.CDSE_CLIENT_ID && process.env.CDSE_CLIENT_SECRET);
  }

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
      maxCloudCover = parseInt(process.env.SATELLITE_CLOUD_THRESHOLD ?? '60'),
      limit = 50,
    } = params;

    const bbox = buildBboxArray(lat, lng, radiusMeters);

    const toDate = to ? to : new Date();
    const fromDate = from ?? new Date(toDate.getTime() - 365 * 24 * 60 * 60 * 1000);
    const datetime = `${fromDate.toISOString()}/${toDate.toISOString()}`;

    logger.info(`[cdse] Searching scenes: lat=${lat} lng=${lng} bbox=${bbox.join(',')} from=${fromDate.toISOString()} to=${toDate.toISOString()}`);

    const { features, status } = await stacSearch({ bbox, datetime, maxCloudCover, limit });
    if (status !== 'OK') {
      logger.warn(`[cdse] Scene search returned no results (${status})`);
      return [];
    }

    const scenes: CDSEScene[] = [];
    for (const feature of features) {
      const scene = mapStacItemToScene(feature);
      if (scene) scenes.push(scene);
    }

    // Sort newest first
    scenes.sort((a, b) => b.observationDate.getTime() - a.observationDate.getTime());

    logger.info(`[cdse] Found ${scenes.length} scenes for lat=${lat} lng=${lng}`);
    return scenes;
  }

  /**
   * Get the single nearest scene to a target date.
   * Returns structured status so the caller can distinguish NOT_FOUND from NOT_CONFIGURED.
   */
  async getNearestScene(params: CDSENearestParams): Promise<CDSENearestResult> {
    const { lat, lng, targetDate, radiusMeters = 1000, maxCloudCover = parseInt(process.env.SATELLITE_CLOUD_THRESHOLD ?? '60') } = params;

    const searchWindowDays = parseInt(process.env.SATELLITE_SEARCH_WINDOW_DAYS ?? '14');
    const halfMs = searchWindowDays * 24 * 60 * 60 * 1000;
    const fromDate = new Date(targetDate.getTime() - halfMs);
    const toDate = new Date(targetDate.getTime() + halfMs);

    const { features, status } = await stacSearch({
      bbox: buildBboxArray(lat, lng, radiusMeters),
      datetime: `${fromDate.toISOString()}/${toDate.toISOString()}`,
      maxCloudCover,
      limit: 20,
    });

    if (status === 'SOURCE_UNAVAILABLE') {
      return { status: 'ERROR', reason: 'API_UNAVAILABLE' };
    }
    if (status === 'RATE_LIMITED') {
      return { status: 'ERROR', reason: 'RATE_LIMITED' };
    }

    let best: CDSEScene | null = null;
    let bestDiff = Infinity;

    for (const feature of features) {
      const scene = mapStacItemToScene(feature);
      if (!scene) continue;
      const diff = Math.abs(scene.observationDate.getTime() - targetDate.getTime());
      if (diff < bestDiff) {
        bestDiff = diff;
        best = scene;
      }
    }

    if (best) {
      const diffDays = Math.round(bestDiff / (24 * 60 * 60 * 1000));
      logger.info(`[cdse] Nearest scene to ${targetDate.toISOString()}: ${best.id} (${diffDays} days away)`);
      return {
        status: 'FOUND',
        scene: best,
      };
    }

    logger.info(`[cdse] No scene found near target date ${targetDate.toISOString()}`);
    return {
      status: 'NO_USABLE_OBSERVATION',
      reason: 'NO_SCENE_AVAILABLE',
      searchWindow: { start: fromDate.toISOString(), end: toDate.toISOString() },
    };
  }

  /**
   * Get the best N scenes (least cloudy) within a date range.
   */
  async getBestScenes(params: CDSEBestParams): Promise<CDSEScene[]> {
    const { lat, lng, from, to, maxCloudCover = parseInt(process.env.SATELLITE_CLOUD_THRESHOLD ?? '60'), limit = 5 } = params;

    const { features, status } = await stacSearch({
      bbox: buildBboxArray(lat, lng, 1000),
      datetime: `${from.toISOString()}/${to.toISOString()}`,
      maxCloudCover,
      limit: Math.max(limit * 4, 30),
    });
    if (status !== 'OK') return [];

    const scenes: CDSEScene[] = [];
    for (const feature of features) {
      const scene = mapStacItemToScene(feature);
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
   * Skips scenes already stored (by unique sceneId + observationDate).
   */
  async ingestProjectObservations(params: {
    projectId: string;
    lat: number;
    lng: number;
    from?: Date;
    to?: Date;
    maxCloudCover?: number;
  }): Promise<CDSEIngestResult> {
    const { projectId, lat, lng, from, to, maxCloudCover = parseInt(process.env.SATELLITE_CLOUD_THRESHOLD ?? '60') } = params;

    logger.info(`[cdse] Starting ingestion for project ${projectId} at ${lat},${lng}`);

    if (!this.isConfigured()) {
      logger.warn('[cdse] CDSE not configured — skipping ingestion');
      return { created: 0, skipped: 0, errors: 0 };
    }

    const scenes = await this.searchScenes({
      lat, lng,
      radiusMeters: 1000,
      from,
      to,
      maxCloudCover,
      limit: 100,
    });

    if (!scenes.length) {
      logger.info(`[cdse] No scenes found for project ${projectId}`);
      return { created: 0, skipped: 0, errors: 0 };
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;
    const p = this.prisma;

    for (const scene of scenes) {
      const result = await upsertObservation(p, projectId, scene);
      if (result.created) created++;
      else if (result.skipped) skipped++;
      else errors++;
    }

    logger.info(`[cdse] Ingestion complete for ${projectId}: ${created} created, ${skipped} skipped, ${errors} errors`);
    return { created, skipped, errors };
  }
}

// ── Singleton export ─────────────────────────────────────────────────────────

export const cdseService = new CDSEService();