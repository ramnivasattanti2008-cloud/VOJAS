/**
 * Satellite Imagery Service — VOJAS (Phase 53)
 *
 * Queries real satellite observations from the SatelliteObservation table
 * (populated via CDSE/STAC ingestion). Returns real acquisition dates,
 * cloud cover, and NDVI/NDBI analysis — no synthetic data.
 *
 * When no observations exist for a project (CDSE not configured, or project
 * not yet ingested), the service returns empty arrays so the frontend shows
 * "No satellite data available" rather than fake data.
 *
 * API shape preserved from the legacy service so existing routes stay valid.
 */

import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

// ── Public API types (same contract as before) ────────────────────────────────

export interface SatelliteCapture {
  id: string;
  projectId: string;
  date: string; // ISO date (observationDate)
  lat: number;
  lng: number;
  imageUrl: string;  // WMS tile URL from CDSE or placeholder
  thumbnailUrl: string;
  provider: "CDSE" | "NONE";
  cloudCover: number;
  analysis: {
    developmentScore: number; // 0-100 (computed from ndvi/ndbii or 0 if no data)
    builtUpArea: number;     // sq metres (from SatelliteObservation.builtUpArea)
    vegetationCover: number;  // 0-100 (computed from ndvi)
    changeFromPrevious: number; // % change (computed from analysis results)
    constructionDetected: boolean;
    statusLabel: "No Activity" | "Site Cleared" | "Foundation" | "Structure" | "Near Complete" | "Completed";
  };
}

export interface TimelinePoint {
  date: string;
  developmentScore: number;
  builtUpArea: number;
  vegetationCover: number;
  changeFromPrevious: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Converts NDVI (range -1 to 1) to a 0-100 vegetation cover score. */
function ndviToVegetation(ndvi: number | null | undefined): number {
  if (ndvi == null) return 0;
  return Math.round(((ndvi + 1) / 2) * 100);
}

/**
 * Converts NDBI to an approximate built-up development score.
 * NDBI range: -1 (all vegetation) to 1 (all built-up).
 * Maps to 0-100 development score.
 */
function ndbiToDevelopment(ndbi: number | null | undefined): number {
  if (ndbi == null) return 0;
  return Math.round(((ndbi + 1) / 2) * 100);
}

/**
 * Classifies the development status from a 0-100 score.
 */
function classifyStatus(score: number): SatelliteCapture["analysis"]["statusLabel"] {
  if (score < 5)  return "No Activity";
  if (score < 20) return "Site Cleared";
  if (score < 45) return "Foundation";
  if (score < 75) return "Structure";
  if (score < 95) return "Near Complete";
  return "Completed";
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getCapturesByProject(
  projectId: string,
  options?: { from?: string; to?: string }
): Promise<SatelliteCapture[]> {
  logger.info(`[satellite] Fetching real captures for project ${projectId}`);

  try {
    const observations = await prisma.satelliteObservation.findMany({
      where: {
        projectId,
        ...(options?.from && { observationDate: { gte: new Date(options.from) } }),
        ...(options?.to   && { observationDate: { lte: new Date(options.to) } }),
      },
      orderBy: { observationDate: "asc" },
    });

    logger.info(`[satellite] Found ${observations.length} real observations for ${projectId}`);

    if (!observations.length) return [];

    // Look up the project so we can fall back to its coordinates when the
    // observation is missing lat/lng (older records predate the centre fields).
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { latitude: true, longitude: true },
    });
    const fallbackLat = project?.latitude ?? null;
    const fallbackLng = project?.longitude ?? null;

    // Enrich each observation with analysis from the latest analysis result
    const captures: SatelliteCapture[] = await Promise.all(
      observations.map(async (obs) => {
        const latestAnalysis = await prisma.analysisResult.findFirst({
          where: { observationId: obs.id },
          orderBy: { createdAt: "desc" },
        });

        const ndvi = obs.ndvi ?? null;
        const ndbii = obs.ndbii ?? null;
        const builtUpArea = obs.builtUpArea ?? 0;
        const vegetationCover = ndviToVegetation(ndvi);
        const developmentScore = ndbiToDevelopment(ndbii);
        const constructionDetected = developmentScore > 15;

        // Look up change from the analysis result if available
        let changeFromPrevious = 0;
        if (latestAnalysis?.result) {
          try {
            const resultObj = JSON.parse(latestAnalysis.result) as Record<string, unknown>;
            const prevScore = resultObj["previousDevelopmentScore"] as number | undefined;
            if (prevScore !== undefined) {
              changeFromPrevious = Math.round(developmentScore - prevScore);
            }
          } catch {
            // result was not valid JSON — skip
          }
        }

        return {
          id: obs.id, // internal PK — always present; use as stable capture ID
          projectId: obs.projectId,
          date: obs.observationDate.toISOString(),
          lat: obs.centerLat || (fallbackLat ?? 0),
          lng: obs.centerLng || (fallbackLng ?? 0),
          imageUrl: obs.tileUrl ?? buildPlaceholderTileUrl(obs.centerLat || (fallbackLat ?? 0), obs.centerLng || (fallbackLng ?? 0)),
          thumbnailUrl: obs.thumbnailUrl ?? "",
          provider: obs.provider === "CDSE" ? "CDSE" : "NONE",
          cloudCover: obs.cloudCover ?? 0,
          analysis: {
            developmentScore,
            builtUpArea,
            vegetationCover,
            changeFromPrevious,
            constructionDetected,
            statusLabel: classifyStatus(developmentScore),
          },
        } satisfies SatelliteCapture;
      })
    );

    return captures;
  } catch (err) {
    logger.error(`[satellite] Failed to get captures for ${projectId}`, err);
    return []; // Return empty rather than throwing — graceful degradation
  }
}

export async function getCaptureById(captureId: string): Promise<SatelliteCapture | null> {
  // captureId is the internal PK (UUID) of SatelliteObservation
  try {
    const obs = await prisma.satelliteObservation.findUnique({
      where: { id: captureId },
    });
    if (!obs) return null;
    const captures = await getCapturesByProject(obs.projectId, {
      from: obs.observationDate.toISOString().slice(0, 10),
      to:   obs.observationDate.toISOString().slice(0, 10),
    });
    return captures[0] ?? null;
  } catch {
    return null;
  }
}

export async function getLatestCapture(projectId: string): Promise<SatelliteCapture | null> {
  const captures = await getCapturesByProject(projectId);
  if (!captures.length) return null;
  return captures[captures.length - 1]; // ascending order → last is latest
}

export async function getTimeline(projectId: string): Promise<TimelinePoint[]> {
  const captures = await getCapturesByProject(projectId);
  return captures.map((c) => ({
    date: c.date,
    developmentScore: c.analysis.developmentScore,
    builtUpArea: c.analysis.builtUpArea,
    vegetationCover: c.analysis.vegetationCover,
    changeFromPrevious: c.analysis.changeFromPrevious,
  }));
}

// ── Placeholder tile URL when no CDSE tiles are available ─────────────────────

function buildPlaceholderTileUrl(lat: number, lng: number): string {
  // Returns an OpenStreetMap tile as a neutral basemap
  // Frontend can overlay this with WMS layers from the observation record
  const zoom = 16;
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
  const y = Math.floor(
    (1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180) * Math.PI)) /
      2 *
      Math.pow(2, zoom)
  );
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}
