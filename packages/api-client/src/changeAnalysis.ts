/**
 * Change Analysis API client — M7
 *
 * All endpoints for the M7 change analysis engine.
 * Every method returns a Promise resolving to the API's data field
 * (the wrapper { success, data, error } is already unwrapped by client.ts).
 */

import type { ApiClient } from './client';

// ── Types ────────────────────────────────────────────────────────────────────

export type ChangeClassification =
  | 'NO_DETECTABLE_CHANGE'
  | 'LOW_CHANGE'
  | 'MODERATE_CHANGE'
  | 'HIGH_CHANGE'
  | 'INCONCLUSIVE'
  | 'INVALID';

export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type ConsistencyAssessment =
  | 'CONSISTENT'
  | 'POSSIBLY_INCONSISTENT'
  | 'INCONCLUSIVE'
  | 'INSUFFICIENT_DATA';

export type SignalType =
  | 'SPECTRAL_CHANGE'
  | 'NDVI_CHANGE'
  | 'BUILT_SURFACE_CHANGE'
  | 'VEGETATION_DISTURBANCE'
  | 'BARE_SOIL'
  | 'WATER_CHANGE';

export type AnalysisType =
  | 'BASELINE_VS_LATEST'
  | 'PREVIOUS_VS_CURRENT'
  | 'CUSTOM'
  | 'MULTI_STAGE';

export type ProcessingStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'INSUFFICIENT_DATA'
  | 'INVALID';

export type GeometryType = 'POLYGON' | 'POINT_BUFFER';

export type ChangeRegionCategory =
  | 'VEGETATION_REMOVAL'
  | 'BUILT_EXPANSION'
  | 'BARE_SOIL_APPEARANCE'
  | 'WATER_CHANGE'
  | 'MIXED_CHANGE';

export interface ChangeRegion {
  id: string;
  areaM2: number;
  centroid: [number, number];
  meanNdviDelta: number;
  meanNdbiDelta: number;
  meanBsiDelta: number;
  category: ChangeRegionCategory;
  confidence: Confidence;
  bbox: [number, number, number, number];
}

export interface ConfidenceFactors {
  imageQuality: Confidence;
  geometryQuality: Confidence;
  spatialCoherence: Confidence;
  seasonalityRisk: Confidence;
  resolutionSuitability: Confidence;
  controlAreaComparison: Confidence;
}

export interface ObservationRef {
  observationId: string;
  sceneId: string | null;
  observationDate: string;
  cloudCover: number;
  satellite: string;
  sourceUrl: string | null;
}

export interface EvidencePackage {
  beforeRef: ObservationRef;
  afterRef: ObservationRef;
  geometry: { type: string; coordinates: unknown };
  metrics: {
    totalAreaM2: number | null;
    validAreaM2: number | null;
    changedAreaM2: number | null;
    changePercent: number | null;
    ndviBefore: number | null;
    ndviAfter: number | null;
    ndviDelta: number | null;
    ndbiBefore: number | null;
    ndbiAfter: number | null;
    ndbiDelta: number | null;
    bsiBefore: number | null;
    bsiAfter: number | null;
    bsiDelta: number | null;
    controlAreaChangePercent: number | null;
    deltaRatio: number | null;
    validPixelsPercent: number | null;
    cloudPercentBefore: number | null;
    cloudPercentAfter: number | null;
  };
  changeRegions: ChangeRegion[];
  algorithm: {
    version: string;
    primarySignal: SignalType;
    ndviThreshold: number;
    ndbiThreshold: number;
    bsiThreshold: number;
    minValidPixelsPercent: number;
    minRegionAreaM2: number;
    controlAreaMultiplier: number;
  };
  confidenceFactors: ConfidenceFactors;
  sourceProvenance: {
    dataset: string;
    resolution: string;
    provider: string;
  };
}

export interface ChangeAnalysis {
  id: string;
  projectId: string;
  observationBeforeId: string;
  observationAfterId: string;
  analysisType: AnalysisType;
  primarySignal: SignalType;
  sector: string | null;
  geometryType: GeometryType;
  analysisBufferM: number;
  totalAreaM2: number | null;
  validAreaM2: number | null;
  changedAreaM2: number | null;
  changePercent: number | null;
  ndviBefore: number | null;
  ndviAfter: number | null;
  ndviDelta: number | null;
  ndbiBefore: number | null;
  ndbiAfter: number | null;
  ndbiDelta: number | null;
  bsiBefore: number | null;
  bsiAfter: number | null;
  bsiDelta: number | null;
  controlAreaChangePercent: number | null;
  deltaRatio: number | null;
  cloudPercentBefore: number | null;
  cloudPercentAfter: number | null;
  validPixelsPercent: number | null;
  changeClassification: ChangeClassification;
  confidence: Confidence;
  confidenceFactors: ConfidenceFactors | null;
  changeRegions: ChangeRegion[];
  changeStory: string | null;
  reportedProgressComparison: ConsistencyAssessment | null;
  evidencePackage: EvidencePackage | null;
  methodology: string;
  limitations: string | null;
  processingStatus: ProcessingStatus;
  provider: string | null;
  algorithmVersion: string;
  parametersHash: string;
  jobId: string | null;
  errorMessage: string | null;
  analysisDate: string;
  baselineDate: string | null;
  comparisonDate: string | null;
  createdAt: string;
  updatedAt: string;
  observationBefore?: { id: string; observationDate: string; cloudCover: number; satellite: string };
  observationAfter?: { id: string; observationDate: string; cloudCover: number; satellite: string };
}

export interface ChangeAnalysisJob {
  jobId: string;
  status: ProcessingStatus;
  startedAt: string | null;
  completedAt: string | null;
  result: unknown;
  error: string | null;
}

// ── Client ──────────────────────────────────────────────────────────────────

export function createChangeAnalysisApi(client: ApiClient) {
  return {
    /** List change analyses for a project */
    list(projectId: string, options?: { status?: ProcessingStatus; limit?: number }) {
      return client.get<{ analyses: ChangeAnalysis[] }>(
        `/projects/${projectId}/analysis`,
        options as Record<string, string | number | undefined>
      );
    },

    /** Get the most recent completed change analysis for a project */
    latest(projectId: string) {
      return client.get<{ status: 'FOUND' | 'NO_ANALYSIS'; analysis: ChangeAnalysis | null; message?: string }>(
        `/projects/${projectId}/analysis/latest`
      );
    },

    /** Get a single change analysis */
    get(projectId: string, analysisId: string) {
      return client.get<{ analysis: ChangeAnalysis }>(
        `/projects/${projectId}/analysis/${analysisId}`
      );
    },

    /** Get the methodology, limitations, and confidence factors for an analysis */
    getMethodology(projectId: string, analysisId: string) {
      return client.get<{
        methodology: {
          methodology: string;
          limitations: string | null;
          confidenceFactors: ConfidenceFactors | null;
          algorithmVersion: string;
          runParameters: Record<string, unknown>;
          provider: string | null;
          analysisType: AnalysisType;
          primarySignal: SignalType;
          sector: string | null;
          geometryType: GeometryType;
          analysisBufferM: number;
        };
      }>(`/projects/${projectId}/analysis/${analysisId}/methodology`);
    },

    /** Get the evidence package for an analysis */
    getEvidence(projectId: string, analysisId: string) {
      return client.get<{
        evidence: {
          evidencePackage: EvidencePackage | null;
          changeRegions: ChangeRegion[];
          beforeObservation: { id: string; observationDate: string; satellite: string; sourceUrl: string | null };
          afterObservation: { id: string; observationDate: string; satellite: string; sourceUrl: string | null };
        };
      }>(`/projects/${projectId}/analysis/${analysisId}/evidence`);
    },

    /** Get the change map metadata for an analysis */
    getMap(projectId: string, analysisId: string) {
      return client.get<{
        map: {
          regions: ChangeRegion[];
          geometryRef: unknown;
          totalAreaM2: number | null;
          changedAreaM2: number | null;
          changePercent: number | null;
          classification: ChangeClassification;
          confidence: Confidence;
        };
      }>(`/projects/${projectId}/analysis/${analysisId}/map`);
    },

    /** Trigger a new change analysis */
    run(projectId: string, params: {
      observationBeforeId: string;
      observationAfterId: string;
      sector?: string;
      primarySignal?: SignalType;
    }) {
      return client.post<{ status: ProcessingStatus; jobId: string; message: string }>(
        `/projects/${projectId}/analysis/run`,
        params
      );
    },

    /** Poll job status for an analysis */
    getJob(projectId: string, analysisId: string) {
      return client.get<ChangeAnalysisJob>(`/projects/${projectId}/analysis/${analysisId}/job`);
    },

    /** Get the change analysis history (timeline of analyses) */
    getHistory(projectId: string) {
      return client.get<{
        history: Array<{
          id: string;
          analysisDate: string;
          baselineDate: string | null;
          comparisonDate: string | null;
          changeClassification: ChangeClassification;
          changePercent: number | null;
          confidence: Confidence;
          primarySignal: SignalType;
          provider: string | null;
          ndviDelta: number | null;
          ndbiDelta: number | null;
        }>;
      }>(`/projects/${projectId}/analysis/history`);
    },
  };
}

export type ChangeAnalysisApi = ReturnType<typeof createChangeAnalysisApi>;
