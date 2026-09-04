/**
 * Google Earth Engine Change Analysis Provider — M7
 *
 * Primary provider. Runs real pixel-level analysis on Sentinel-2 L2A using GEE.
 *
 * Requires:
 *   GEE_SERVICE_ACCOUNT_JSON  — base64-encoded or raw JSON service-account credentials
 *   GEE_PROJECT_ID           — Google Cloud project ID
 *
 * Falls back to CDSE_PIXEL if GEE is unavailable.
 */

import { logger } from '../../utils/logger.js';
import {
  type AnalysisParams,
  type ChangeRegion,
  type ChangeRegionCategory,
  type ProviderError,
  type ProviderResponse,
  type ProviderSuccess,
  type RawAnalysisResult,
  type RunParameters,
  type SignalType,
} from './changeAnalysisProvider.js';

// EE uses `export =` syntax — eslint-disable needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ee: any = null;
let eeInitialized = false;

/** Lazy-load and initialise the Earth Engine library once. */
async function getEE(): Promise<typeof import('ee') | null> {
  if (eeInitialized) return ee;
  eeInitialized = true;

  const serviceAccountJson = process.env.GEE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    logger.info('[gee] GEE_SERVICE_ACCOUNT_JSON not set — GEE unavailable');
    return null;
  }

  try {
    const earthengine = await import('ee');
    earthengine.initialize();

    // Try to authenticate with service account
    let credentials: object;
    try {
      // If it's base64-encoded, decode it
      credentials = JSON.parse(
        Buffer.from(serviceAccountJson, 'base64').toString('utf-8')
      );
    } catch {
      // Try parsing as raw JSON
      credentials = JSON.parse(serviceAccountJson);
    }

    const projectId = process.env.GEE_PROJECT_ID ?? (credentials as { project_id?: string }).project_id;
    if (!projectId) {
      logger.warn('[gee] GEE_PROJECT_ID not set and not found in credentials');
      return null;
    }

    await earthengine.authenticate({
      credentials,
      serviceAccount: true,
      opt_projectId: projectId,
    });

    logger.info(`[gee] Authenticated for project: ${projectId}`);
    return earthengine;
  } catch (err) {
    logger.error('[gee] Failed to initialize Earth Engine', { error: String(err) });
    return null;
  }
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

/** Build a donut control-area polygon from a center polygon + outer radius. */
function buildControlAreaPolygon(
  geometry: GeoJSON.Polygon,
  outerRadiusM: number
): GeoJSON.Polygon {
  // Simple bounding-box approximation — in production, use a proper buffer
  const coords = geometry.coordinates[0];
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  // Compute center and max half-diagonal
  const cLng = (minLng + maxLng) / 2;
  const cLat = (minLat + maxLat) / 2;
  const dLng = (maxLng - minLng) / 2;
  const dLat = (maxLat - minLat) / 2;
  const halfDiag = Math.sqrt(dLng * dLng + dLat * dLat);

  // Outer box extends by outerRadiusM in degrees (approximate)
  const outerDeg = outerRadiusM / 111_320;
  const outer = [
    [cLng - dLng - outerDeg, cLat - dLat - outerDeg],
    [cLng + dLng + outerDeg, cLat - dLat - outerDeg],
    [cLng + dLng + outerDeg, cLat + dLat + outerDeg],
    [cLng - dLng - outerDeg, cLat + dLat + outerDeg],
    [cLng - dLng - outerDeg, cLat - dLat - outerDeg],
  ];

  // Inner hole = the original polygon
  return {
    type: 'Polygon',
    coordinates: [outer, ...geometry.coordinates],
  };
}

// ── Change region extraction ────────────────────────────────────────────────

/** Classify a pixel's dominant change signal. */
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

  // Score each category
  const vegScore = Math.abs(ndviDelta) * (ndviDelta < 0 ? 1 : 0.3);
  const builtScore = Math.abs(ndbiDelta);
  const soilScore = Math.abs(bsiDelta) * (bsiDelta > 0 ? 1 : 0.3);

  if (builtScore >= vegScore && builtScore >= soilScore) return 'BUILT_EXPANSION';
  if (vegScore >= builtScore && vegScore >= soilScore) return 'VEGETATION_REMOVAL';
  return 'BARE_SOIL_APPEARANCE';
}

// ── Main provider ───────────────────────────────────────────────────────────

class GEEProvider {
  get name(): 'GEE' { return 'GEE'; }

  isConfigured(): boolean {
    return !!(process.env.GEE_SERVICE_ACCOUNT_JSON && process.env.GEE_PROJECT_ID);
  }

  async analyze(params: AnalysisParams): Promise<ProviderResponse> {
    const start = Date.now();
    const { before, after, geometry, analysisType, runParameters } = params;
    const notes: string[] = [];

    // 1. Initialise GEE
    const earthengine = await getEE();
    if (!earthengine) {
      return {
        ok: false,
        reason: 'AUTHENTICATION_REQUIRED',
        message: 'GEE credentials not configured. Set GEE_SERVICE_ACCOUNT_JSON and GEE_PROJECT_ID.',
      } satisfies ProviderError;
    }

    try {
      // 2. Build EE geometries
      const projGeom = earthengine.Geometry.Polygon(
        geometry.coordinates as [number, number][][]
      );
      const { polygon: projectPoly } = projGeom;
      if (!projectPoly) {
        return {
          ok: false,
          reason: 'INVALID_GEOMETRY',
          message: 'Project geometry could not be converted to an EE polygon.',
        } satisfies ProviderError;
      }

      // 3. Compute control-area polygon
      const outerRadiusM = runParameters.controlAreaMultiplier * Math.sqrt(
        (geometry.coordinates[0].reduce((max, [lng, lat], i, arr) => {
          if (i === 0) return max;
          const prev = arr[i - 1];
          const d = Math.sqrt((lng - prev[0]) ** 2 + (lat - prev[1]) ** 2);
          return d > max ? d : max;
        }, 0) ** 2)
      );
      const controlGeom = buildControlAreaPolygon(geometry, outerRadiusM);
      const controlPoly = earthengine.Geometry.Polygon(
        controlGeom.coordinates as [number, number][][]
      );

      // 4. Query Sentinel-2 L2A SR collections
      const s2Collection = earthengine.ImageCollection('COPERNICUS/S2_SR_HARMONIZED');
      const cloudCollection = earthengine.ImageCollection('COPERNICUS/S2_CLOUD_PROBABILITY');

      // Get dates
      const beforeDate = new Date(before.observationDate);
      const afterDate = new Date(after.observationDate);
      const windowDays = 14;
      const beforeStart = new Date(beforeDate.getTime() - windowDays * 86400_000);
      const beforeEnd = new Date(beforeDate.getTime() + windowDays * 86400_000);
      const afterStart = new Date(afterDate.getTime() - windowDays * 86400_000);
      const afterEnd = new Date(afterDate.getTime() + windowDays * 86400_000);

      // Filter by cloud probability
      const cloudMaskColl = cloudCollection.filterDate(beforeStart, beforeEnd)
        .filterBounds(projectPoly as any);

      // Build a cloud-mask image
      const cloudProb = cloudMaskColl.mean();
      const cloudThresh = earthengine.Image(runParameters.cloudCoverMax);

      // Build before/after composites
      const beforeScene = s2Collection
        .filterDate(beforeStart, beforeEnd)
        .filterBounds(projectPoly as any)
        .filter(earthengine.Filter.lt('CLOUDY_PIXEL_OVERALL', runParameters.cloudCoverMax))
        .median();

      const afterScene = s2Collection
        .filterDate(afterStart, afterEnd)
        .filterBounds(projectPoly as any)
        .filter(earthengine.Filter.lt('CLOUDY_PIXEL_OVERALL', runParameters.cloudCoverMax))
        .median();

      if (!beforeScene || !afterScene) {
        return {
          ok: false,
          reason: 'INSUFFICIENT_IMAGE_QUALITY',
          message: 'No suitable Sentinel-2 scenes found in the search window.',
        } satisfies ProviderError;
      }

      // 5. Compute spectral indices
      // B8 = NIR, B4 = Red, B11 = SWIR1, B2 = Blue
      const ndvi = (img: any) =>
        img.normalizedDifference(['B8', 'B4']).rename('NDVI');
      const ndbi = (img: any) =>
        img.normalizedDifference(['B11', 'B8']).rename('NDBI');
      const bsi = (img: any) =>
        img.expression(
          '(SWIR1 + RED - NIR - BLUE) / (SWIR1 + RED + NIR + BLUE)',
          {
            SWIR1: img.select('B11'),
            RED: img.select('B4'),
            NIR: img.select('B8'),
            BLUE: img.select('B2'),
          }
        ).rename('BSI');

      const beforeNDVI = ndvi(beforeScene);
      const afterNDVI = ndvi(afterScene);
      const beforeNDBI = ndbi(beforeScene);
      const afterNDBI = ndbi(afterScene);
      const beforeBSI = bsi(beforeScene);
      const afterBSI = bsi(afterScene);

      // 6. Compute deltas
      const deltaNDVI = afterNDVI.subtract(beforeNDVI);
      const deltaNDBI = afterNDBI.subtract(beforeNDBI);
      const deltaBSI = afterBSI.subtract(beforeBSI);

      // 7. Mask by cloud
      const cloudMask = cloudProb.lt(cloudThresh);
      const maskedNDVI = deltaNDVI.updateMask(cloudMask);
      const maskedNDBI = deltaNDBI.updateMask(cloudMask);
      const maskedBSI = deltaBSI.updateMask(cloudMask);

      // 8. Compute zonal statistics (project area)
      const projectStats = maskedNDVI.reduceRegion({
        geometry: projectPoly as any,
        scale: 10,
        reducer: earthengine.Reducer.mean().combine(
          earthengine.Reducer.count(),
          '',
          true
        ),
        bestEffort: true,
      });

      const projNdviDelta = Number(
        (projectStats as Record<string, unknown>)['NDVI_mean'] ?? 0
      );
      const projNDBIDelta = Number(
        (projectStats as Record<string, unknown>)['NDBI_mean'] ?? 0
      );
      const projBSIDelta = Number(
        (projectStats as Record<string, unknown>)['BSI_mean'] ?? 0
      );

      // 9. Control area stats
      const controlStats = maskedNDVI.reduceRegion({
        geometry: controlPoly as any,
        scale: 10,
        reducer: earthengine.Reducer.mean(),
        bestEffort: true,
      });
      const controlNdviDelta = Number(
        (controlStats as Record<string, unknown>)['NDVI_mean'] ?? 0
      );

      // 10. Compute areas
      const pixelAreaM2 = 100; // 10m × 10m Sentinel-2
      const totalPixels = (await maskedNDVI.select('NDVI').reduceRegion({
        geometry: projectPoly as any,
        scale: 10,
        reducer: earthengine.Reducer.count(),
        bestEffort: true,
      })) ?? 0;
      const validPixels = Number(totalPixels) || 0;
      const totalAreaM2 = validPixels * pixelAreaM2;

      // Simple changed-area estimate: pixels where |ΔNDVI| > threshold
      const changedMask = maskedNDVI.abs().gt(runParameters.ndviThreshold);
      const changedPixels = (await changedMask.reduceRegion({
        geometry: projectPoly as any,
        scale: 10,
        reducer: earthengine.Reducer.sum(),
        bestEffort: true,
      })) ?? 0;
      const changedAreaM2 = (Number(changedPixels) || 0) * pixelAreaM2;
      const changePercent = totalAreaM2 > 0 ? (changedAreaM2 / totalAreaM2) * 100 : 0;

      // Control area changed%
      const controlChangedPixels = (await maskedNDVI.abs().gt(runParameters.ndviThreshold).reduceRegion({
        geometry: controlPoly as any,
        scale: 10,
        reducer: earthengine.Reducer.sum(),
        bestEffort: true,
      })) ?? 0;
      const controlAreaM2 = (Number(controlChangedPixels) || 0) * pixelAreaM2;
      const controlAreaTotalM2 = totalAreaM2 * runParameters.controlAreaMultiplier ** 2;
      const controlAreaChangePercent =
        controlAreaTotalM2 > 0 ? (controlAreaM2 / controlAreaTotalM2) * 100 : 0;

      const deltaRatio = controlAreaChangePercent > 0
        ? changePercent / controlAreaChangePercent
        : (changePercent > 0 ? Infinity : 0);

      // 11. Primary signal
      const primarySignal = this.resolvePrimarySignal(analysisType, projNdviDelta, projNDBIDelta);

      // 12. Image quality
      const validPixelsPercent = totalAreaM2 > 0 ? (validPixels * pixelAreaM2 / totalAreaM2) * 100 : 0;
      const imageQuality = this.scoreImageQuality(
        before.cloudCover,
        after.cloudCover,
        validPixelsPercent
      );

      // 13. Build change regions (simplified — GEE gives us aggregate stats)
      const changeRegions: ChangeRegion[] = changedAreaM2 > runParameters.minRegionAreaM2
        ? [{
            id: 'region-1',
            areaM2: changedAreaM2,
            centroid: [
              (geometry.coordinates[0][0][0] + geometry.coordinates[0][2][0]) / 2,
              (geometry.coordinates[0][0][1] + geometry.coordinates[0][2][1]) / 2,
            ],
            meanNdviDelta: projNdviDelta,
            meanNdbiDelta: projNDBIDelta,
            meanBsiDelta: projBSIDelta,
            category: classifyPixel(
              projNdviDelta,
              projNDBIDelta,
              projBSIDelta,
              runParameters.ndviThreshold,
              runParameters.ndbiThreshold,
              runParameters.bsiThreshold
            ),
            confidence: imageQuality,
            bbox: [
              Math.min(...geometry.coordinates[0].map((c) => c[0])),
              Math.min(...geometry.coordinates[0].map((c) => c[1])),
              Math.max(...geometry.coordinates[0].map((c) => c[0])),
              Math.max(...geometry.coordinates[0].map((c) => c[1])),
            ],
          }]
        : [];

      notes.push(`GEE analysis completed in ${Date.now() - start}ms`);
      notes.push(
        `Valid pixels: ${validPixels} (${((validPixels / (totalAreaM2 / pixelAreaM2)) * 100).toFixed(1)}%)`
      );

      const result: RawAnalysisResult = {
        ndviBefore: null, // GEE composite — no per-pixel "before" mean stored
        ndviAfter: null,
        ndviDelta: projNdviDelta,
        ndbiBefore: null,
        ndbiAfter: null,
        ndbiDelta: projNDBIDelta,
        bsiBefore: null,
        bsiAfter: null,
        bsiDelta: projBSIDelta,
        totalAreaM2,
        validAreaM2: validPixels * pixelAreaM2,
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

      return { ok: true, result, provider: 'GEE' } satisfies ProviderSuccess;
    } catch (err) {
      logger.error('[gee] Analysis failed', { error: String(err) });
      return {
        ok: false,
        reason: 'INTERNAL_ERROR',
        message: `GEE analysis failed: ${err instanceof Error ? err.message : String(err)}`,
      } satisfies ProviderError;
    }
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

export const geeProvider = new GEEProvider();
