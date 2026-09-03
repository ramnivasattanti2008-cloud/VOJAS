/**
 * Copernicus Data Space Ecosystem (CDSE) Sentinel-2 Service — VOJAS 2.0
 *
 * Provides real Sentinel-2 L2A imagery for MPLAD project sites via the
 * Copernicus Data Space Ecosystem STAC API + WMS tile service.
 *
 * Env vars required:
 *   CDSE_CLIENT_ID     — CDSE OAuth2 client ID  (register at dataspace.copernicus.eu)
 *   CDSE_CLIENT_SECRET — CDSE OAuth2 client secret
 *   SATELLITE_CLOUD_THRESHOLD — Max cloud cover % to consider usable (default: 60)
 *   SATELLITE_SEARCH_WINDOW_DAYS — ± days around target to search (default: 14)
 *
 * CDSE free tier: 300 req/min. A sliding-window rate limiter enforces this
 * automatically so the service never exceeds the limit.
 *
 * References:
 *   https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/STAC.html
 *   https://documentation.dataspace.copernicus.eu/APIs/WMS.html
 */

import { PrismaClient } from '@vojas/db';
import type { Prisma } from '@vojas/db';
import { logger } from '../utils/logger.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const CDSE_TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const CDSE_CATALOGUE_URL = 'https://catalogue.dataspace.copernicus.eu/stac/collections/SENTINEL-2/items';
const CDSE_WMS_BASE = 'https://adas.dataspace.copernicus.eu/wms';

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
  tileUrl: string;
  thumbnailUrl: string;
  provider: 'CDSE';
  satellite: 'SENTINEL-2A' | 'SENTINEL-2B';
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

function parseSatelliteFromSceneId(id: string): 'SENTINEL-2A' | 'SENTINEL-2B' {
  if (id.startsWith('S2B')) return 'SENTINEL-2B';
  return 'SENTINEL-2A';
}

function buildBbox(lat: number, lng: number, radiusMeters: number): string {
  const deg = radiusMeters / METRES_PER_DEGREE;
  // CDSE bbox: minLng, minLat, maxLng, maxLat
  return `${(lng - deg).toFixed(6)},${(lat - deg).toFixed(6)},${(lng + deg).toFixed(6)},${(lat + deg).toFixed(6)}`;
}

function parseBboxFromGeoJson(geometry: unknown): { sw: [number, number]; ne: [number, number] } | null {
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

function buildWmsTileUrl(sceneId: string, token: string): string {
  const isoMatch = sceneId.match(/_(\d{8}T\d{6})_/);
  const isoTime = isoMatch ? isoMatch[1] : undefined;
  const timeParam = isoTime ? `&time=${isoTime}` : '';

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

function mapStacItemToScene(item: unknown, token: string): CDSEScene | null {
  try {
    const typed = item as Record<string, unknown>;
    const props = (typed.properties ?? {}) as Record<string, unknown>;
    const assets = (typed.assets ?? {}) as Record<string, unknown>;
    const id: string = (typed.id as string) ?? '';

    const rawDate = (props.datetime ?? props.created) as string | undefined;
    if (!rawDate) return null;

    const observationDate = new Date(rawDate);
    if (isNaN(observationDate.getTime())) return null;

    const cloudCover = Math.round(((props['eo:cloud_cover'] as number) ?? 100) * 1) / 1;
    const parsedBbox = parseBboxFromGeoJson(typed.geometry);
    if (!parsedBbox) return null;

    const rawProcessingDate = (props.created as string) ?? null;
    const processingDate = rawProcessingDate ? new Date(rawProcessingDate) : null;
    const acquisitionTimestamp = rawDate ? new Date(rawDate) : null;

    return {
      id,
      observationDate,
      cloudCover,
      resolution: 10,
      bbox: parsedBbox,
      tileUrl: buildWmsTileUrl(id, token),
      thumbnailUrl: buildThumbnailUrl(id, token),
      provider: 'CDSE',
      satellite: parseSatelliteFromSceneId(id),
      sensor: 'MSI',
      dataset: 'S2_L2A',
      sourceUrl: `${CDSE_CATALOGUE_URL}/${id}`,
      processingDate: isNaN(processingDate?.getTime() ?? NaN) ? null : processingDate,
      processingBaseline: null,
      acquisitionTimestamp,
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

async function stacSearch(params: {
  bbox: string;
  datetime: string;
  'eo:cloud_cover'?: string;
  limit?: number;
  token: string;
}): Promise<unknown[]> {
  const url = new URL(CDSE_CATALOGUE_URL);
  url.searchParams.set('bbox', params.bbox);
  url.searchParams.set('datetime', params.datetime);
  if (params['eo:cloud_cover']) {
    url.searchParams.set('eo:cloud_cover', params['eo:cloud_cover']);
  }
  url.searchParams.set('limit', String(params.limit ?? 50));
  url.searchParams.set('token', params.token); // CDSE STAC uses token param

  await rateLimiter.acquire();

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (response.status === 401 || response.status === 403) {
      logger.warn('[cdse] STAC auth failed — clearing cached token');
      cachedToken = null;
      return [];
    }

    if (response.status === 404) {
      logger.info('[cdse] STAC endpoint returned 404 — CDSE may be unavailable');
      return [];
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logger.error(`[cdse] STAC search failed (${response.status}): ${text}`);
      return [];
    }

    const data = (await response.json()) as StacSearchResult;
    return data.features ?? [];
  } catch (err) {
    logger.error('[cdse] Exception during STAC search', { error: String(err) });
    return [];
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
      where: { sceneId_observationDate: { sceneId: scene.id, observationDate: scene.observationDate } },
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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

    const token = await getValidToken();
    if (!token) {
      logger.warn('[cdse] Skipping scene search — no valid token');
      return [];
    }

    const bbox = buildBbox(lat, lng, radiusMeters);

    const toDate = to ? to : new Date();
    const fromDate = from ?? new Date(toDate.getTime() - 365 * 24 * 60 * 60 * 1000);
    const datetime = `${fromDate.toISOString()}/${toDate.toISOString()}`;

    logger.info(`[cdse] Searching scenes: lat=${lat} lng=${lng} bbox=${bbox} from=${fromDate.toISOString()} to=${toDate.toISOString()}`);

    const features = await stacSearch({
      bbox,
      datetime,
      'eo:cloud_cover': `0/${maxCloudCover}`,
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
   * Returns structured status so the caller can distinguish NOT_FOUND from NOT_CONFIGURED.
   */
  async getNearestScene(params: CDSENearestParams): Promise<CDSENearestResult> {
    if (!this.isConfigured()) {
      return { status: 'NOT_CONFIGURED', reason: 'AUTHENTICATION_REQUIRED' };
    }

    const { lat, lng, targetDate, radiusMeters = 1000, maxCloudCover = parseInt(process.env.SATELLITE_CLOUD_THRESHOLD ?? '60') } = params;

    const token = await getValidToken();
    if (!token) {
      return { status: 'NOT_CONFIGURED', reason: 'AUTHENTICATION_REQUIRED' };
    }

    const searchWindowDays = parseInt(process.env.SATELLITE_SEARCH_WINDOW_DAYS ?? '14');
    const halfMs = searchWindowDays * 24 * 60 * 60 * 1000;
    const fromDate = new Date(targetDate.getTime() - halfMs);
    const toDate = new Date(targetDate.getTime() + halfMs);

    const features = await stacSearch({
      bbox: buildBbox(lat, lng, radiusMeters),
      datetime: `${fromDate.toISOString()}/${toDate.toISOString()}`,
      'eo:cloud_cover': `0/${maxCloudCover}`,
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

    const token = await getValidToken();
    if (!token) return [];

    const features = await stacSearch({
      bbox: buildBbox(lat, lng, 1000),
      datetime: `${from.toISOString()}/${to.toISOString()}`,
      'eo:cloud_cover': `0/${maxCloudCover}`,
      limit: Math.max(limit * 4, 30),
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