/**
 * CDSE (Copernicus Data Space Ecosystem)-backed SatelliteProvider.
 *
 * A minimal, read-only adapter that implements the SatelliteProvider
 * interface (satelliteProvider.ts) directly against CDSE's public
 * OAuth2 + STAC + WMS HTTP APIs.
 *
 * Why this lives in packages/domain instead of wrapping
 * apps/api/src/services/cdseService.ts:
 *   - packages/domain must never import from apps/api (layering rule) —
 *     wrapping cdseService.ts would invert that dependency.
 *   - cdseService.ts is tightly coupled to Prisma (@vojas/db) for scene
 *     ingestion, which is out of scope for the SatelliteProvider
 *     interface (findScenes/getSceneMetadata/getTileUrl/
 *     getThumbnailUrl/getStatus) and would drag DB/ingestion concerns
 *     into the domain abstraction.
 *   - The overlap between the two is a small, pure slice of HTTP calls
 *     (OAuth2 client-credentials token, STAC item search, WMS tile URL
 *     construction) with zero framework dependency, so re-implementing
 *     just that slice here — against the domain interface's shapes —
 *     is simpler and safer than inventing a registration/plugin seam
 *     for a single provider.
 *   - apps/api/src/services/cdseService.ts is left untouched and stays
 *     the source of truth for DB-backed ingestion, used by
 *     routes/satellite.ts, satelliteEOAnalysis.ts and
 *     cdsePixelProvider.ts.
 *
 * Honesty constraints (see project CLAUDE.md — never fabricate data):
 *   - findScenes/getSceneMetadata throw or return null on any failure;
 *     they never invent a scene.
 *   - getTileUrl/getThumbnailUrl are synchronous per the interface, but
 *     a valid CDSE tile URL requires a live OAuth2 token embedded in
 *     the query string. If no token has been cached yet (i.e. no async
 *     call has succeeded first), these honestly return null rather
 *     than fabricate an unauthenticated/broken URL.
 *   - Only the 'RGB' tile layer maps to a verified CDSE WMS layer name
 *     (matching what apps/api's cdseService.ts already uses in
 *     production). NIR/NDVI/NDBI have no verified layer identifier
 *     wired up anywhere in this codebase, so rather than guess a layer
 *     name that might silently serve the wrong imagery, those return
 *     null until a verified mapping is added.
 *
 * Env vars (read by the factory, passed in via the constructor):
 *   CDSE_CLIENT_ID, CDSE_CLIENT_SECRET — OAuth2 client_credentials.
 */

import { ProviderStatus } from './types.js';
import {
  SatelliteProvider,
  SatelliteFilters,
  SatelliteScene,
} from './satelliteProvider.js';

const CDSE_TOKEN_URL =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const CDSE_CATALOGUE_URL =
  'https://catalogue.dataspace.copernicus.eu/stac/collections/SENTINEL-2/items';
const CDSE_WMS_BASE = 'https://adas.dataspace.copernicus.eu/wms';
const TOKEN_CACHE_BUFFER_SECS = 60;
const DEFAULT_SEARCH_LIMIT = 50;

interface CachedToken {
  token: string;
  expiresAt: number; // ms since epoch
}

function parseSatelliteFromSceneId(id: string): string {
  if (id.startsWith('S2B')) return 'SENTINEL-2B';
  return 'SENTINEL-2A';
}

function parseBboxFromGeoJson(
  geometry: unknown
): { sw: [number, number]; ne: [number, number] } | null {
  if (!geometry || typeof geometry !== 'object') return null;
  const g = geometry as { coordinates?: unknown; type?: string };
  if (!g.coordinates) return null;

  let coords: number[][] = [];
  const geomType = g.type ?? '';

  if (geomType === 'Polygon') {
    coords = (g.coordinates as number[][][])[0];
  } else if (geomType === 'MultiPolygon') {
    coords = (g.coordinates as number[][][][])[0][0];
  } else {
    return null;
  }

  if (!coords.length) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
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

function mapStacItemToScene(item: unknown, token: string): SatelliteScene | null {
  try {
    const typed = item as Record<string, unknown>;
    const props = (typed.properties ?? {}) as Record<string, unknown>;
    const id = (typed.id as string) ?? '';
    if (!id) return null;

    const rawDate = (props.datetime ?? props.created) as string | undefined;
    if (!rawDate) return null;

    const observationDate = new Date(rawDate);
    if (isNaN(observationDate.getTime())) return null;

    const cloudCover = Math.round(((props['eo:cloud_cover'] as number) ?? 100) * 1) / 1;
    const bbox = parseBboxFromGeoJson(typed.geometry);
    if (!bbox) return null;

    return {
      sceneId: id,
      observationDate,
      satellite: parseSatelliteFromSceneId(id),
      sensor: 'MSI',
      dataset: 'S2_L2A',
      cloudCover,
      resolution: 10,
      bbox,
      tileUrl: buildWmsTileUrl(id, token),
      thumbnailUrl: buildThumbnailUrl(id, token),
      sourceUrl: `${CDSE_CATALOGUE_URL}/${id}`,
      sourceName: 'Copernicus Data Space Ecosystem',
    };
  } catch {
    return null;
  }
}

export class CdseSatelliteProvider implements SatelliteProvider {
  private cachedToken: CachedToken | null = null;
  private status: ProviderStatus = 'configured';
  private lastError: string | undefined;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {}

  getStatus(): ProviderStatus {
    return this.status;
  }

  /** Synchronous read of a still-valid cached token, without triggering a fetch. */
  private getCachedTokenSync(): string | null {
    if (
      this.cachedToken &&
      this.cachedToken.expiresAt - TOKEN_CACHE_BUFFER_SECS * 1000 > Date.now()
    ) {
      return this.cachedToken.token;
    }
    return null;
  }

  private async getToken(): Promise<string | null> {
    const cached = this.getCachedTokenSync();
    if (cached) return cached;

    try {
      const response = await fetch(CDSE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        this.status = 'error';
        this.lastError = `CDSE token request failed (${response.status}): ${text}`;
        return null;
      }

      const data = (await response.json()) as {
        access_token: string;
        expires_in?: number;
      };
      const expiresInSecs = data.expires_in ?? 3600;
      this.cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + expiresInSecs * 1000,
      };
      this.status = 'configured';
      this.lastError = undefined;
      return data.access_token;
    } catch (err) {
      this.status = 'error';
      this.lastError = err instanceof Error ? err.message : String(err);
      return null;
    }
  }

  async findScenes(filters: SatelliteFilters): Promise<SatelliteScene[]> {
    const token = await this.getToken();
    if (!token) {
      throw new Error(
        `CdseSatelliteProvider: unable to obtain a CDSE OAuth2 token${
          this.lastError ? ` (${this.lastError})` : ''
        }.`
      );
    }

    const [minLng, minLat, maxLng, maxLat] = filters.bbox;
    const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
    const datetime = `${filters.startDate.toISOString()}/${filters.endDate.toISOString()}`;

    const url = new URL(CDSE_CATALOGUE_URL);
    url.searchParams.set('bbox', bbox);
    url.searchParams.set('datetime', datetime);
    if (filters.maxCloudCover !== undefined) {
      url.searchParams.set('eo:cloud_cover', `0/${filters.maxCloudCover}`);
    }
    url.searchParams.set('limit', String(DEFAULT_SEARCH_LIMIT));
    url.searchParams.set('token', token);

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(
        `CdseSatelliteProvider: STAC search failed with status ${response.status}`
      );
    }

    const data = (await response.json()) as { features?: unknown[] };
    const scenes: SatelliteScene[] = [];
    for (const feature of data.features ?? []) {
      const scene = mapStacItemToScene(feature, token);
      if (scene) scenes.push(scene);
    }

    scenes.sort((a, b) => b.observationDate.getTime() - a.observationDate.getTime());
    return scenes;
  }

  async getSceneMetadata(sceneId: string): Promise<SatelliteScene | null> {
    const token = await this.getToken();
    if (!token) return null;

    const url = new URL(`${CDSE_CATALOGUE_URL}/${encodeURIComponent(sceneId)}`);
    url.searchParams.set('token', token);

    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      const item = await response.json();
      return mapStacItemToScene(item, token);
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      return null;
    }
  }

  getTileUrl(sceneId: string, layer: 'RGB' | 'NIR' | 'NDVI' | 'NDBI'): string | null {
    if (layer !== 'RGB') return null; // no verified WMS layer name for NIR/NDVI/NDBI yet
    const token = this.getCachedTokenSync();
    if (!token) return null;
    return buildWmsTileUrl(sceneId, token);
  }

  getThumbnailUrl(sceneId: string): string | null {
    const token = this.getCachedTokenSync();
    if (!token) return null;
    return buildThumbnailUrl(sceneId, token);
  }
}
