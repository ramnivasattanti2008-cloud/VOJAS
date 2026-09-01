/**
 * Satellite Imagery Service — VOJAS
 *
 * Generates synthetic weekly satellite capture data for any project location.
 * Uses ESRI World Imagery tiles as the actual image source.
 * Construction progress is simulated based on project metadata and realistic development curves.
 *
 * In production, replace with:
 * - Sentinel Hub API (sentinel-hub.com) — free tier available
 * - Google Earth Engine — for NDVI analysis
 * - Maxar Open Data — historical high-res imagery
 */

import { projectService } from "./projectService.js";
import { logger } from "../utils/logger.js";

export interface SatelliteCapture {
  id: string;
  projectId: string;
  date: string; // ISO date
  lat: number;
  lng: number;
  imageUrl: string;
  thumbnailUrl: string;
  provider: "esri" | "sentinel" | "mock";
  cloudCover: number;
  analysis: {
    developmentScore: number; // 0-100
    builtUpArea: number; // sq meters
    vegetationCover: number; // 0-100
    changeFromPrevious: number; // % change in development score
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

// ── Deterministic hash for consistent per-project data ───────────────────────

function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── ESRI tile URL builder ────────────────────────────────────────────────────

function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
  const y = Math.floor(
    (1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) +
          1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2 *
      Math.pow(2, zoom)
  );
  return { x, y };
}

function buildEsriTileUrl(
  lat: number,
  lng: number,
  zoom = 16
): { imageUrl: string; thumbnailUrl: string } {
  // Build a 3-tile grid URL (center + offset for context)
  const center = latLngToTile(lat, lng, zoom);
  const imageUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${center.y}/${center.x}`;
  // Thumbnail at lower zoom
  const thumb = latLngToTile(lat, lng, 14);
  const thumbnailUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/14/${thumb.y}/${thumb.x}`;
  return { imageUrl, thumbnailUrl };
}

// ── Development curve calculator ──────────────────────────────────────────────

function computeDevelopment(
  projectId: string,
  weekIndex: number,
  totalWeeks: number,
  projectStartDate: Date
): SatelliteCapture["analysis"] {
  const rand = seededRandom(hashStr(projectId + weekIndex));
  const noise = () => (rand() - 0.5) * 8; // ±4 point noise

  // Progress curve: starts slow, accelerates, plateaus
  const progress = Math.min(100, Math.max(0, (weekIndex / totalWeeks) * 110 - 5));
  const score = Math.round(progress + noise());

  // Built-up area: increases with progress (0 → ~5000 sq m typical MPLADS project)
  const builtUpArea = Math.round((progress / 100) * 4800 + rand() * 400);

  // Vegetation: decreases as land is cleared and built
  const vegetationCover = Math.max(5, Math.round(60 - progress * 0.5 + (rand() - 0.5) * 10));

  // Change from previous
  const prevProgress = Math.min(
    100,
    Math.max(0, ((weekIndex - 1) / totalWeeks) * 110 - 5)
  );
  const changeFromPrevious = Math.round(score - (prevProgress + (rand() - 0.5) * 8));

  const constructionDetected = score > 10;

  let statusLabel: SatelliteCapture["analysis"]["statusLabel"];
  if (score < 5) statusLabel = "No Activity";
  else if (score < 20) statusLabel = "Site Cleared";
  else if (score < 45) statusLabel = "Foundation";
  else if (score < 75) statusLabel = "Structure";
  else if (score < 95) statusLabel = "Near Complete";
  else statusLabel = "Completed";

  return {
    developmentScore: score,
    builtUpArea,
    vegetationCover,
    changeFromPrevious,
    constructionDetected,
    statusLabel,
  };
}

// ── Generate captures for a project ────────────────────────────────────────────

function generateCaptures(
  projectId: string,
  lat: number,
  lng: number,
  from?: string,
  to?: string
): SatelliteCapture[] {
  const rand = seededRandom(hashStr(projectId));

  // Default: last 24 weeks from today
  const endDate = to ? new Date(to) : new Date();
  const startDate = from
    ? new Date(from)
    : new Date(endDate.getTime() - 24 * 7 * 24 * 60 * 60 * 1000);

  const totalWeeks = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  const captures: SatelliteCapture[] = [];

  for (let i = 0; i < totalWeeks; i++) {
    const captureDate = new Date(
      startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000
    );
    // Skip ~15% of weeks (cloud cover simulation)
    if (rand() < 0.15 && i > 0) continue;

    const { imageUrl, thumbnailUrl } = buildEsriTileUrl(lat, lng);
    const analysis = computeDevelopment(
      projectId,
      i,
      totalWeeks,
      startDate
    );

    captures.push({
      id: `${projectId}-${captureDate.toISOString().split("T")[0]}`,
      projectId,
      date: captureDate.toISOString(),
      lat,
      lng,
      imageUrl,
      thumbnailUrl,
      provider: "esri",
      cloudCover: Math.round(5 + rand() * 35),
      analysis,
    });
  }

  return captures;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getCapturesByProject(
  projectId: string,
  options?: { from?: string; to?: string }
): Promise<SatelliteCapture[]> {
  logger.info(`[satellite] Fetching captures for project ${projectId}`);
  try {
    // Get project coordinates
    const project = await projectService.findById(projectId);
    const lat = project?.latitude ?? (20.5937 + (hashStr(projectId) % 1000) / 1000);
    const lng = project?.longitude ?? (78.9629 + (hashStr(projectId + "lng") % 1000) / 1000);

    const captures = generateCaptures(projectId, lat, lng, options?.from, options?.to);
    logger.info(`[satellite] Generated ${captures.length} captures for ${projectId}`);
    return captures;
  } catch (err) {
    logger.error(`[satellite] Failed to get captures for ${projectId}`, err);
    throw err;
  }
}

export async function getCaptureById(captureId: string): Promise<SatelliteCapture | null> {
  // Parse projectId from captureId (format: projectId-YYYY-MM-DD)
  const lastDash = captureId.lastIndexOf("-");
  if (lastDash === -1) return null;
  const dateStr = captureId.slice(lastDash + 1);
  const projectId = captureId.slice(0, lastDash);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;

  const captures = await getCapturesByProject(projectId, { from: dateStr, to: dateStr });
  return captures[0] ?? null;
}

export async function getLatestCapture(projectId: string): Promise<SatelliteCapture | null> {
  const captures = await getCapturesByProject(projectId);
  if (!captures.length) return null;
  return captures[captures.length - 1];
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
