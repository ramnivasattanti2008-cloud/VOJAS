/**
 * Change Analysis Provider Interface — M7
 *
 * Provider-agnostic contract for change-analysis backends.
 * Concrete implementations: Google Earth Engine (primary), CDSE pixel (fallback).
 */

import type { GeoJSON } from 'geojson';

// ── Geometry ─────────────────────────────────────────────────────────────────

/** GeoJSON polygon: [[lng, lat], ...] closed ring. */
export type AnalysisGeometry = GeoJSON.Polygon;

// ── Reference to a real observation ──────────────────────────────────────────

export interface ObservationRef {
  id: string;
  sceneId: string | null;
  observationDate: Date;
  cloudCover: number;
  resolution: number; // metres per pixel
  centerLat: number | null;
  centerLng: number | null;
  provider: string;
  satellite: string;
  sourceUrl: string | null;
}

// ── Run parameters (snapshot) ────────────────────────────────────────────────

export interface RunParameters {
  algorithmVersion: string;       // 'change-v1.0'
  ndviThreshold: number;          // default 0.10
  ndbiThreshold: number;          // default 0.08
  bsiThreshold: number;           // default 0.10
  minValidPixelsPercent: number;  // default 60
  minRegionAreaM2: number;        // default 100
  controlAreaMultiplier: number;  // default 1.5
  cloudCoverMax: number;          // default 60
  pixelGridSize: number;          // default 50 (50x50 = 2500 sample pixels)
  sector: string;                 // 'ROAD' | 'BUILDING' | ...
  analysisBufferM: number;        // default 200 (metres for point-only projects)
}

export const DEFAULT_RUN_PARAMETERS: RunParameters = {
  algorithmVersion: 'change-v1.0',
  ndviThreshold: 0.10,
  ndbiThreshold: 0.08,
  bsiThreshold: 0.10,
  minValidPixelsPercent: 60,
  minRegionAreaM2: 100,
  controlAreaMultiplier: 1.5,
  cloudCoverMax: 60,
  pixelGridSize: 50,
  sector: 'GENERAL',
  analysisBufferM: parseInt(process.env.ANALYSIS_BUFFER_METERS ?? '200'),
};

// ── Input to a provider ─────────────────────────────────────────────────────

export interface AnalysisParams {
  before: ObservationRef;
  after: ObservationRef;
  geometry: AnalysisGeometry;
  analysisType: 'SPECTRAL_CHANGE' | 'NDVI_CHANGE' | 'BUILT_SURFACE_CHANGE' | 'VEGETATION_DISTURBANCE' | 'BARE_SOIL' | 'WATER_CHANGE';
  runParameters: RunParameters;
  jobId?: string;
}

// ── Output from a provider ──────────────────────────────────────────────────

export type SignalType =
  | 'SPECTRAL_CHANGE'
  | 'NDVI_CHANGE'
  | 'BUILT_SURFACE_CHANGE'
  | 'VEGETATION_DISTURBANCE'
  | 'BARE_SOIL'
  | 'WATER_CHANGE';

export type ChangeRegionCategory =
  | 'VEGETATION_REMOVAL'
  | 'BUILT_EXPANSION'
  | 'BARE_SOIL_APPEARANCE'
  | 'WATER_CHANGE'
  | 'MIXED_CHANGE';

export interface ChangeRegion {
  id: string;
  areaM2: number;
  centroid: [number, number]; // [lng, lat]
  meanNdviDelta: number;
  meanNdbiDelta: number;
  meanBsiDelta: number;
  category: ChangeRegionCategory;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  bbox: [number, number, number, number]; // [west, south, east, north]
}

export type QualityScore = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RawAnalysisResult {
  // Spectral snapshots (means over valid pixels)
  ndviBefore: number | null;
  ndviAfter: number | null;
  ndviDelta: number | null;
  ndbiBefore: number | null;
  ndbiAfter: number | null;
  ndbiDelta: number | null;
  bsiBefore: number | null;
  bsiAfter: number | null;
  bsiDelta: number | null;

  // Areas
  totalAreaM2: number;
  validAreaM2: number;
  changedAreaM2: number;
  changePercent: number;

  // Control area (for false-positive detection)
  controlAreaChangePercent: number;
  deltaRatio: number; // projectChangePercent / controlAreaChangePercent

  // Quality
  cloudPercentBefore: number;
  cloudPercentAfter: number;
  validPixelsPercent: number;

  // Regions
  changeRegions: ChangeRegion[];
  primarySignal: SignalType;

  // Diagnostics
  imageQuality: QualityScore;
  processingNotes: string[];
}

// ── Provider interface ──────────────────────────────────────────────────────

export type ProviderErrorReason =
  | 'AUTHENTICATION_REQUIRED'
  | 'API_UNAVAILABLE'
  | 'INVALID_GEOMETRY'
  | 'INSUFFICIENT_IMAGE_QUALITY'
  | 'INTERNAL_ERROR';

export interface ProviderError {
  ok: false;
  reason: ProviderErrorReason;
  message: string;
}

export interface ProviderSuccess {
  ok: true;
  result: RawAnalysisResult;
  provider: string;
}

export type ProviderResponse = ProviderSuccess | ProviderError;

export interface ChangeAnalysisProvider {
  /** Stable identifier for this provider. */
  readonly name: 'GEE' | 'CDSE_PIXEL';

  /** True if env vars / credentials are configured. */
  isConfigured(): boolean;

  /** Run the analysis pipeline. */
  analyze(params: AnalysisParams): Promise<ProviderResponse>;
}
