/**
 * CDSE Pixel Provider — M7
 *
 * Fallback / development provider. Uses the existing CDSE OAuth2 token from
 * cdseService.ts to fetch Sentinel-2 L2A band assets via the CDSE STAC API,
 * then computes spectral indices in pure JavaScript on a sampled pixel grid.
 *
 * Unlike GEE, this provider works without any additional credentials — if
 * CDSE_CLIENT_ID / CDSE_CLIENT_SECRET are set (required by cdseService), this
 * provider can run real spectral analysis.
 *
 * Sample size is bounded to 2,500 pixels (50×50 grid) to keep memory under 1 MB.
 */

import { logger } from '../../utils/logger.js';
import { cdseService } from '../cdseService.js';
import {
  type AnalysisParams,
  type ChangeRegion,
  type ChangeRegionCategory,
  type ProviderError,
  type ProviderResponse,
  type ProviderSuccess,
  type RawAnalysisResult,
  type SignalType,
} from './changeAnalysisProvider.js';

// ── Constants ────────────────────────────────────────────────────────────────

const METRES_PER_DEGREE = 111_320;
const SAMPLE_GRID_SIZE = 50; // 50×50 = 2,500 pixels max

// ── Token helper (shared with cdseService) ───────────────────────────────────

async function getCdseToken(): Promise<string | null> {
  // Re-use cdseService's token infrastructure
  const token = await (cdseService as unknown as { getToken(): Promise<string | null> }).getToken();
  return token;
}

// ── Band fetching ─────────────────────────────────────────────────────────────

interface BandData {
  name: string;
  data: Float32Array;
  width: number;
  height: number;
}

/**
 * Fetch a single band for a given sceneId from CDSE STAC.
 * Returns the band as a Float32Array of reflectance values (0–1 scale).
 */
async function fetchBand(
  sceneId: string,
  band: string,
  token: string
): Promise<BandData | null> {
  // CDSE Catalogue STAC API — get the item with asset links
  const catalogueUrl = `https://catalogue.dataspace.copernicus.eu/stac/collections/SENTINEL-2/items/${sceneId}`;
  const params = new URLSearchParams({ token });

  try {
    const response = await fetch(`${catalogueUrl}?${params}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      logger.warn(`[cdse-pixel] Failed to fetch STAC item ${sceneId}: ${response.status}`);
      return null;
    }

    const item = await response.json() as {
      assets?: Record<string, { href?: string; title?: string }>;
    };
    const assets = item?.assets ?? {};

    // Find the band asset by title or key
    const bandEntry = Object.entries(assets).find(
      ([, v]) => v?.title === band || v?.title === `${band} (10m)` || v?.title === `${band} (20m)` || v?.title === `${band} (60m)`
    );

    const href = bandEntry?.[1]?.href;
    if (!href) {
      logger.warn(`[cdse-pixel] Band ${band} asset not found for scene ${sceneId}`);
      return null;
    }

    // Fetch the band data
    // Note: CDSE may require an additional token parameter for the asset URL
    const assetResponse = await fetch(`${href}${href.includes('?') ? '&' : '?'}token=${token}`, {
      headers: { Accept: 'application/octet-stream' },
    });

    if (!assetResponse.ok) {
      logger.warn(`[cdse-pixel] Failed to fetch band ${band} data: ${assetResponse.status}`);
      return null;
    }

    // CDSE Sentinel-2 band assets are JPEG2000. No JP2/COG decoder is wired
    // up here, so real pixel values can only be read when the response
    // happens to already be raw Float32 (application/octet-stream).
    //
    // TODO: Integrate a lightweight COG parser (e.g., the 'geotiff' npm
    // package) to actually decode JP2 assets for production use.
    const contentType = assetResponse.headers.get('content-type') ?? '';

    if (contentType.includes('image/jp2') || contentType.includes('image/jpeg2000')) {
      // Real Sentinel-2 band assets are JP2, and no JP2/COG decoder is
      // wired up here (see the TODO below) — return null so the caller's
      // hasRealBands gate reports INSUFFICIENT_IMAGE_QUALITY. Never fabricate
      // a synthetic band in place of a real one: an invented reflectance
      // grid would silently feed fake NDVI/NDBI/BSI into change detection.
      logger.info(`[cdse-pixel] ${band} is JP2 format — no real decoder available for ${sceneId}, reporting unavailable`);
      return null;
    }

    // Try to read as raw Float32
    const buffer = await assetResponse.arrayBuffer();
    if (buffer.byteLength === 0) return null;

    const arr = new Float32Array(buffer);
    const width = Math.round(Math.sqrt(arr.length));
    const height = width > 0 ? Math.floor(arr.length / width) : 0;

    return { name: band, data: arr, width, height };
  } catch (err) {
    logger.error(`[cdse-pixel] Error fetching band ${band} for ${sceneId}`, { error: String(err) });
    return null;
  }
}

// ── NDVI / NDBI / BSI computation ───────────────────────────────────────────

function computeNDVI(band8: Float32Array, band4: Float32Array): Float32Array {
  const result = new Float32Array(band8.length);
  for (let i = 0; i < band8.length; i++) {
    const nir = band8[i];
    const red = band4[i];
    const denom = nir + red;
    result[i] = denom !== 0 ? (nir - red) / denom : 0;
  }
  return result;
}

function computeNDBI(band11: Float32Array, band8: Float32Array): Float32Array {
  const result = new Float32Array(band11.length);
  for (let i = 0; i < band11.length; i++) {
    const swir1 = band11[i];
    const nir = band8[i];
    const denom = swir1 + nir;
    result[i] = denom !== 0 ? (swir1 - nir) / denom : 0;
  }
  return result;
}

function computeBSI(band11: Float32Array, band4: Float32Array, band8: Float32Array, band2: Float32Array): Float32Array {
  const result = new Float32Array(band11.length);
  for (let i = 0; i < band11.length; i++) {
    const swir1 = band11[i];
    const red = band4[i];
    const nir = band8[i];
    const blue = band2[i];
    const denom = swir1 + red + nir + blue;
    result[i] = denom !== 0 ? (swir1 + red - nir - blue) / denom : 0;
  }
  return result;
}

// ── Area computation ─────────────────────────────────────────────────────────

/** Compute the area of a GeoJSON polygon in m² using the shoelace formula (approximate). */
function polygonAreaM2(coords: [number, number][]): number {
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  area = Math.abs(area) / 2;
  // Convert from degree² to m² (approximate at mid-latitude)
  const avgLat = coords.reduce((s, [, lat]) => s + lat, 0) / (n - 1);
  const latDegM = METRES_PER_DEGREE;
  const lngDegM = METRES_PER_DEGREE * Math.cos((avgLat * Math.PI) / 180);
  return area * latDegM * lngDegM;
}

// ── Change region extraction ────────────────────────────────────────────────

function classifyPixel(
  ndviDelta: number,
  ndbiDelta: number,
  bsiDelta: number,
  ndviThreshold: number,
  ndbiThreshold: number,
  bsiThreshold: number
): ChangeRegionCategory {
  const hasNdvi = Math.abs(ndviDelta) >= ndviThreshold;
  const hasNdbi = Math.abs(ndbiDelta) >= ndbiThreshold;
  const hasBsi = Math.abs(bsiDelta) >= bsiThreshold;

  if (!hasNdvi && !hasNdbi && !hasBsi) return 'MIXED_CHANGE';

  const vegScore = Math.abs(ndviDelta) * (ndviDelta < 0 ? 1 : 0.3);
  const builtScore = Math.abs(ndbiDelta);
  const soilScore = Math.abs(bsiDelta) * (bsiDelta > 0 ? 1 : 0.3);

  if (builtScore >= vegScore && builtScore >= soilScore) return 'BUILT_EXPANSION';
  if (vegScore >= builtScore && vegScore >= soilScore) return 'VEGETATION_REMOVAL';
  return 'BARE_SOIL_APPEARANCE';
}

function extractChangeRegions(
  deltaGrid: Float32Array,
  ndviDeltaGrid: Float32Array,
  ndbiDeltaGrid: Float32Array,
  bsiDeltaGrid: Float32Array,
  gridSize: number,
  geometry: GeoJSON.Polygon,
  ndviThreshold: number,
  ndbiThreshold: number,
  bsiThreshold: number,
  minRegionAreaM2: number,
  imageQuality: RawAnalysisResult['imageQuality']
): ChangeRegion[] {
  const regions: ChangeRegion[] = [];
  const bbox = [
    Math.min(...geometry.coordinates[0].map((c) => c[0])),
    Math.min(...geometry.coordinates[0].map((c) => c[1])),
    Math.max(...geometry.coordinates[0].map((c) => c[0])),
    Math.max(...geometry.coordinates[0].map((c) => c[1])),
  ];
  const cellWidthDeg = (bbox[2] - bbox[0]) / gridSize;
  const cellHeightDeg = (bbox[3] - bbox[1]) / gridSize;
  const cellAreaM2 =
    (cellWidthDeg * METRES_PER_DEGREE * Math.cos(((bbox[1] + bbox[3]) / 2 * Math.PI) / 180)) *
    (cellHeightDeg * METRES_PER_DEGREE);

  // Simple connected-component scan (4-connectivity)
  const visited = new Uint8Array(gridSize * gridSize);
  let regionId = 0;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const idx = y * gridSize + x;
      if (visited[idx]) continue;

      const delta = deltaGrid[idx];
      if (Math.abs(delta) < ndviThreshold) continue; // Not a changed pixel

      // Flood-fill a region
      const regionPixels: number[] = [];
      const stack: [number, number][] = [[x, y]];
      const regionBbox = { minX: x, maxX: x, minY: y, maxY: y };

      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        const cidx = cy * gridSize + cx;
        if (cx < 0 || cx >= gridSize || cy < 0 || cy >= gridSize) continue;
        if (visited[cidx]) continue;
        if (Math.abs(deltaGrid[cidx]) < ndviThreshold) continue;

        visited[cidx] = 1;
        regionPixels.push(cidx);
        if (cx < regionBbox.minX) regionBbox.minX = cx;
        if (cx > regionBbox.maxX) regionBbox.maxX = cx;
        if (cy < regionBbox.minY) regionBbox.minY = cy;
        if (cy > regionBbox.maxY) regionBbox.maxY = cy;

        // 4-connectivity
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }

      const regionAreaM2 = regionPixels.length * cellAreaM2;
      if (regionAreaM2 < minRegionAreaM2) continue;

      regionId++;
      const meanNdviDelta =
        regionPixels.reduce((s, i) => s + ndviDeltaGrid[i], 0) / regionPixels.length;
      const meanNdbiDelta =
        regionPixels.reduce((s, i) => s + ndbiDeltaGrid[i], 0) / regionPixels.length;
      const meanBsiDelta =
        regionPixels.reduce((s, i) => s + bsiDeltaGrid[i], 0) / regionPixels.length;

      // Centroid in lng/lat
      const centroidX = (regionBbox.minX + regionBbox.maxX) / 2;
      const centroidY = (regionBbox.minY + regionBbox.maxY) / 2;
      const lng = bbox[0] + (centroidX + 0.5) * cellWidthDeg;
      const lat = bbox[1] + (centroidY + 0.5) * cellHeightDeg;

      regions.push({
        id: `region-${regionId}`,
        areaM2: Math.round(regionAreaM2),
        centroid: [lng, lat],
        meanNdviDelta,
        meanNdbiDelta,
        meanBsiDelta,
        category: classifyPixel(
          meanNdviDelta, meanNdbiDelta, meanBsiDelta,
          ndviThreshold, ndbiThreshold, bsiThreshold
        ),
        confidence: imageQuality,
        bbox: [
          bbox[0] + regionBbox.minX * cellWidthDeg,
          bbox[1] + regionBbox.minY * cellHeightDeg,
          bbox[0] + (regionBbox.maxX + 1) * cellWidthDeg,
          bbox[1] + (regionBbox.maxY + 1) * cellHeightDeg,
        ],
      });
    }
  }

  return regions;
}

// ── Main provider ────────────────────────────────────────────────────────────

class CDSEDPixelProvider {
  get name(): 'CDSE_PIXEL' { return 'CDSE_PIXEL'; }

  isConfigured(): boolean {
    return cdseService.isConfigured();
  }

  async analyze(params: AnalysisParams): Promise<ProviderResponse> {
    const start = Date.now();
    const { before, after, geometry, analysisType, runParameters } = params;
    const notes: string[] = [];
    const gridSize = runParameters.pixelGridSize ?? SAMPLE_GRID_SIZE;

    // 1. Get CDSE token
    const token = await getCdseToken();
    if (!token) {
      return {
        ok: false,
        reason: 'AUTHENTICATION_REQUIRED',
        message: 'CDSE credentials not configured. Set CDSE_CLIENT_ID and CDSE_CLIENT_SECRET.',
      } satisfies ProviderError;
    }

    const beforeSceneId = before.sceneId;
    const afterSceneId = after.sceneId;

    if (!beforeSceneId || !afterSceneId) {
      return {
        ok: false,
        reason: 'INSUFFICIENT_IMAGE_QUALITY',
        message: 'CDSE pixel analysis requires scene IDs from CDSE observations. Observations must be ingested via CDSE STAC to have band asset links.',
      } satisfies ProviderError;
    }

    // 2. Fetch bands for both observations
    notes.push(`Fetching bands for before=${beforeSceneId} after=${afterSceneId}`);
    const [beforeB02, beforeB04, beforeB08, beforeB11] = await Promise.all([
      fetchBand(beforeSceneId, 'B02', token),
      fetchBand(beforeSceneId, 'B04', token),
      fetchBand(beforeSceneId, 'B08', token),
      fetchBand(beforeSceneId, 'B11', token),
    ]);

    const [afterB02, afterB04, afterB08, afterB11] = await Promise.all([
      fetchBand(afterSceneId, 'B02', token),
      fetchBand(afterSceneId, 'B04', token),
      fetchBand(afterSceneId, 'B08', token),
      fetchBand(afterSceneId, 'B11', token),
    ]);

    // Real bands only — hasRealBands gates the honest INSUFFICIENT_IMAGE_QUALITY
    // response below; nothing is synthesized when a band is missing.
    const hasRealBandsBefore = beforeB02 && beforeB04 && beforeB08 && beforeB11;
    const hasRealBandsAfter = afterB02 && afterB04 && afterB08 && afterB11;
    const hasRealBands = hasRealBandsBefore && hasRealBandsAfter;

    if (!hasRealBands) {
      return {
        ok: false,
        reason: 'INSUFFICIENT_IMAGE_QUALITY',
        message: 'One or more required Sentinel-2 bands (B02/B04/B08/B11) could not be fetched for this scene pair. Real pixel data is required for change analysis — no index values were synthesized.',
      } satisfies ProviderError;
    }

    // 3. Compute indices for both dates — real bands only, never synthesized.
    const beforeNDVI: Float32Array = computeNDVI(beforeB08!.data, beforeB04!.data);
    const afterNDVI: Float32Array = computeNDVI(afterB08!.data, afterB04!.data);
    const beforeNDBI: Float32Array = computeNDBI(beforeB11!.data, beforeB08!.data);
    const afterNDBI: Float32Array = computeNDBI(afterB11!.data, afterB08!.data);
    const beforeBSI: Float32Array = computeBSI(beforeB11!.data, beforeB04!.data, beforeB08!.data, beforeB02!.data);
    const afterBSI: Float32Array = computeBSI(afterB11!.data, afterB04!.data, afterB08!.data, afterB02!.data);

    // 4. Compute deltas
    const deltaNDVI = new Float32Array(beforeNDVI.length);
    const deltaNDBI = new Float32Array(beforeNDBI.length);
    const deltaBSI = new Float32Array(beforeBSI.length);
    let validCount = 0;

    for (let i = 0; i < beforeNDVI.length; i++) {
      deltaNDVI[i] = afterNDVI[i] - beforeNDVI[i];
      deltaNDBI[i] = afterNDBI[i] - beforeNDBI[i];
      deltaBSI[i] = afterBSI[i] - beforeBSI[i];
      if (isFinite(deltaNDVI[i]) && isFinite(deltaNDBI[i])) validCount++;
    }

    const validPixelsPercent = (validCount / beforeNDVI.length) * 100;

    // 5. Zonal statistics (mean over the sample grid)
    const meanNdviDelta =
      deltaNDVI.reduce((s, v) => s + (isFinite(v) ? v : 0), 0) / validCount;
    const meanNdbiDelta =
      deltaNDBI.reduce((s, v) => s + (isFinite(v) ? v : 0), 0) / validCount;
    const meanBsiDelta =
      deltaBSI.reduce((s, v) => s + (isFinite(v) ? v : 0), 0) / validCount;

    // 6. Area computation
    const ring = geometry.coordinates[0] as [number, number][];
    const totalAreaM2 = polygonAreaM2(ring);
    const validAreaM2 = (validPixelsPercent / 100) * totalAreaM2;
    const pixelAreaM2 = totalAreaM2 / beforeNDVI.length;

    const { ndviThreshold, ndbiThreshold, bsiThreshold, minRegionAreaM2 } = runParameters;
    let changedAreaM2 = 0;
    for (let i = 0; i < deltaNDVI.length; i++) {
      if (Math.abs(deltaNDVI[i]) >= ndviThreshold) changedAreaM2 += pixelAreaM2;
    }
    const changePercent = totalAreaM2 > 0 ? (changedAreaM2 / totalAreaM2) * 100 : 0;

    // 7. Control area — unlike geeProvider (which samples a real Earth
    // Engine control polygon), this provider has no real control-area
    // sampling implemented. Report not-measured rather than fabricating a
    // ratio from the project's own change percentage — a fixed multiple of
    // changePercent would guarantee a "control comparison" that isn't one.
    const controlAreaChangePercent: number | null = null;
    const deltaRatio: number | null = null;
    notes.push('Control-area comparison not implemented for this provider — reported as not measured.');

    // 8. Primary signal
    const primarySignal = this.resolvePrimarySignal(analysisType, meanNdviDelta, meanNdbiDelta);

    // 9. Image quality
    const imageQuality = this.scoreImageQuality(
      before.cloudCover,
      after.cloudCover,
      validPixelsPercent
    );

    // 10. Change regions
    const changeRegions = extractChangeRegions(
      deltaNDVI,
      deltaNDVI, // reuse for mean
      deltaNDBI,
      deltaBSI,
      gridSize,
      geometry,
      ndviThreshold,
      ndbiThreshold,
      bsiThreshold,
      minRegionAreaM2,
      imageQuality
    );

    notes.push(`CDSE pixel analysis completed in ${Date.now() - start}ms`);
    notes.push(`Valid pixels: ${validCount}/${beforeNDVI.length} (${validPixelsPercent.toFixed(1)}%)`);
    notes.push(`Change regions detected: ${changeRegions.length}`);

    const result: RawAnalysisResult = {
      ndviBefore:
        beforeNDVI.reduce((s, v) => s + (isFinite(v) ? v : 0), 0) / validCount,
      ndviAfter:
        afterNDVI.reduce((s, v) => s + (isFinite(v) ? v : 0), 0) / validCount,
      ndviDelta: meanNdviDelta,
      ndbiBefore:
        beforeNDBI.reduce((s, v) => s + (isFinite(v) ? v : 0), 0) / validCount,
      ndbiAfter:
        afterNDBI.reduce((s, v) => s + (isFinite(v) ? v : 0), 0) / validCount,
      ndbiDelta: meanNdbiDelta,
      bsiBefore:
        beforeBSI.reduce((s, v) => s + (isFinite(v) ? v : 0), 0) / validCount,
      bsiAfter:
        afterBSI.reduce((s, v) => s + (isFinite(v) ? v : 0), 0) / validCount,
      bsiDelta: meanBsiDelta,
      totalAreaM2,
      validAreaM2,
      changedAreaM2,
      changePercent,
      controlAreaChangePercent,
      deltaRatio,
      cloudPercentBefore: before.cloudCover,
      cloudPercentAfter: after.cloudCover,
      validPixelsPercent,
      changeRegions,
      primarySignal,
      imageQuality,
      processingNotes: notes,
    };

    return { ok: true, result, provider: 'CDSE_PIXEL' } satisfies ProviderSuccess;
  }

  private resolvePrimarySignal(
    requested: AnalysisParams['analysisType'],
    ndviDelta: number,
    ndbiDelta: number
  ): SignalType {
    switch (requested) {
      case 'NDVI_CHANGE': return 'NDVI_CHANGE';
      case 'BUILT_SURFACE_CHANGE': return 'BUILT_SURFACE_CHANGE';
      case 'VEGETATION_DISTURBANCE': return 'VEGETATION_DISTURBANCE';
      case 'BARE_SOIL': return 'BARE_SOIL';
      case 'WATER_CHANGE': return 'WATER_CHANGE';
      case 'SPECTRAL_CHANGE':
      default: {
        if (Math.abs(ndbiDelta) > Math.abs(ndviDelta)) return 'BUILT_SURFACE_CHANGE';
        if (Math.abs(ndviDelta) > 0) return 'NDVI_CHANGE';
        return 'SPECTRAL_CHANGE';
      }
    }
  }

  private scoreImageQuality(
    cloudBefore: number,
    cloudAfter: number,
    validPixelsPercent: number
  ): RawAnalysisResult['imageQuality'] {
    const avgCloud = (cloudBefore + cloudAfter) / 2;
    if (avgCloud < 20 && validPixelsPercent > 80) return 'HIGH';
    if (avgCloud < 50) return 'MEDIUM';
    return 'LOW';
  }
}

export const cdsePixelProvider = new CDSEDPixelProvider();
