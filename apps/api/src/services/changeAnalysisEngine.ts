/**
 * Change Analysis Engine — M7 Orchestrator
 *
 * Coordinates the full analysis pipeline:
 *  1. Geometry validation (polygon or point + buffer)
 *  2. Quality validation (cloud %, valid pixels)
 *  3. Provider selection (GEE first, CDSE_PIXEL fallback)
 *  4. Spectral preprocessing
 *  5. Confidence estimation (6 factors)
 *  6. False-positive controls (control area)
 *  7. Classification (NO_DETECTABLE_CHANGE / LOW / MODERATE / HIGH / INCONCLUSIVE / INVALID)
 *  8. Reported progress comparison
 *  9. Evidence package
 * 10. Storage
 *
 * Anti-fabrication: every metric is computed from real data or honestly
 * reported as INSUFFICIENT_DATA / INCONCLUSIVE / INVALID.
 */

import { createHash } from 'node:crypto';
import { PrismaClient } from '@vojas/db';
import type { Prisma } from '@vojas/db';
import { logger } from '../utils/logger.js';
import { geeProvider } from './changeAnalysisProviders/geeProvider.js';
import { cdsePixelProvider } from './changeAnalysisProviders/cdsePixelProvider.js';
import {
  type AnalysisGeometry,
  type AnalysisParams,
  type ChangeRegion,
  type ChangeRegionCategory,
  type ChangeAnalysisProvider,
  DEFAULT_RUN_PARAMETERS,
  type ProviderResponse,
  type RawAnalysisResult,
  type RunParameters,
  type SignalType,
} from './changeAnalysisProviders/changeAnalysisProvider.js';

// ── Public types ───────────────────────────────────────────────────────────

export type AnalysisStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'INSUFFICIENT_DATA'
  | 'INVALID';

export type AnalysisType =
  | 'BASELINE_VS_LATEST'
  | 'PREVIOUS_VS_CURRENT'
  | 'CUSTOM'
  | 'MULTI_STAGE';

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

export interface SectorProfile {
  primarySignal: SignalType;
  secondarySignals: SignalType[];
  thresholds: Partial<Pick<RunParameters, 'ndviThreshold' | 'ndbiThreshold' | 'bsiThreshold'>>;
}

const SECTOR_PROFILES: Record<string, SectorProfile> = {
  ROAD: {
    primarySignal: 'SPECTRAL_CHANGE',
    secondarySignals: ['NDVI_CHANGE', 'BARE_SOIL'],
    thresholds: { bsiThreshold: 0.07, ndviThreshold: 0.08 },
  },
  BUILDING: {
    primarySignal: 'BUILT_SURFACE_CHANGE',
    secondarySignals: ['NDVI_CHANGE', 'BARE_SOIL'],
    thresholds: { ndbiThreshold: 0.06, ndviThreshold: 0.10 },
  },
  WATER: {
    primarySignal: 'WATER_CHANGE',
    secondarySignals: ['NDVI_CHANGE'],
    thresholds: { ndviThreshold: 0.12 },
  },
  SCHOOL: {
    primarySignal: 'BUILT_SURFACE_CHANGE',
    secondarySignals: ['NDVI_CHANGE', 'BARE_SOIL'],
    thresholds: {},
  },
  HOSPITAL: {
    primarySignal: 'BUILT_SURFACE_CHANGE',
    secondarySignals: ['NDVI_CHANGE', 'BARE_SOIL'],
    thresholds: {},
  },
  IRRIGATION: {
    primarySignal: 'NDVI_CHANGE',
    secondarySignals: ['WATER_CHANGE', 'BARE_SOIL'],
    thresholds: {},
  },
  GENERAL: {
    primarySignal: 'NDVI_CHANGE',
    secondarySignals: ['SPECTRAL_CHANGE', 'BARE_SOIL'],
    thresholds: {},
  },
};

export interface RunAnalysisInput {
  projectId: string;
  observationBeforeId: string;
  observationAfterId: string;
  analysisType?: AnalysisType;
  primarySignal?: SignalType;
  sector?: string;
  runParameters?: Partial<RunParameters>;
  jobId?: string;
  /** Whether to force re-running even if cached result exists. */
  forceNewRun?: boolean;
}

export interface ConfidenceFactors {
  imageQuality: Confidence;
  geometryQuality: Confidence;
  spatialCoherence: Confidence;
  seasonalityRisk: Confidence;
  resolutionSuitability: Confidence;
  controlAreaComparison: Confidence;
}

export interface AnalysisResult {
  id: string;
  projectId: string;
  observationBeforeId: string;
  observationAfterId: string;
  analysisType: AnalysisType;
  primarySignal: SignalType;
  sector: string | null;
  geometryType: 'POLYGON' | 'POINT_BUFFER';
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
  evidencePackage: Record<string, unknown> | null;
  methodology: string;
  limitations: string | null;
  processingStatus: AnalysisStatus;
  provider: string | null;
  algorithmVersion: string;
  runParameters: RunParameters;
  parametersHash: string;
  jobId: string | null;
  errorMessage: string | null;
  analysisDate: string;
  createdAt: string;
  updatedAt: string;
}

// ── Engine ─────────────────────────────────────────────────────────────────

class ChangeAnalysisEngine {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Public entry point ──────────────────────────────────────────────────

  async run(input: RunAnalysisInput): Promise<AnalysisResult> {
    const { projectId, observationBeforeId, observationAfterId } = input;
    const jobId = input.jobId ?? `change-${projectId}-${Date.now()}`;
    const sector = input.sector ?? 'GENERAL';
    const profile = SECTOR_PROFILES[sector] ?? SECTOR_PROFILES.GENERAL;

    // Build the merged run parameters
    const runParameters: RunParameters = {
      ...DEFAULT_RUN_PARAMETERS,
      ...profile.thresholds,
      ...input.runParameters,
      algorithmVersion: 'change-v1.0',
      sector,
    };

    const parametersHash = this.hashParameters(runParameters);

    logger.info(`[change-analysis] Running analysis for project=${projectId} jobId=${jobId}`);

    // 1. Check cache unless forceNewRun
    if (!input.forceNewRun) {
      const cached = await this.findCachedResult(
        projectId, observationBeforeId, observationAfterId, parametersHash
      );
      if (cached) {
        logger.info(`[change-analysis] Cache hit: ${cached.id}`);
        return this.toAnalysisResult(cached);
      }
    }

    // 2. Load project + observations
    const { project, before, after } = await this.loadObservations(
      projectId, observationBeforeId, observationAfterId
    );

    if (!before || !after) {
      return this.createFailedRecord({
        ...input,
        jobId,
        sector,
        runParameters,
        parametersHash,
        processingStatus: 'INSUFFICIENT_DATA',
        errorMessage: 'One or both observations could not be loaded.',
        methodology: this.buildMethodology(input, sector, runParameters, null),
      });
    }

    if (!project.latitude || !project.longitude) {
      return this.createFailedRecord({
        ...input,
        jobId,
        sector,
        runParameters,
        parametersHash,
        processingStatus: 'INVALID',
        errorMessage: 'Project has no coordinates.',
        methodology: this.buildMethodology(input, sector, runParameters, null),
      });
    }

    // 3. Build geometry
    const { geometry, geometryType, analysisBufferM } = this.buildGeometry(project);

    // 4. Determine analysis type
    const analysisType: AnalysisType = input.analysisType ?? 'CUSTOM';
    const primarySignal: SignalType = input.primarySignal ?? profile.primarySignal;

    // 5. Run the provider
    const provider = this.selectProvider();
    const analysisParams: AnalysisParams = {
      before: this.toObsRef(before),
      after: this.toObsRef(after),
      geometry,
      analysisType: primarySignal,
      runParameters,
      jobId,
    };

    const providerResponse = await provider.analyze(analysisParams);

    if (!providerResponse.ok) {
      return this.createFailedRecord({
        ...input,
        jobId,
        sector,
        runParameters,
        parametersHash,
        processingStatus: 'FAILED',
        errorMessage: `${provider.name}: ${providerResponse.message}`,
        methodology: this.buildMethodology(input, sector, runParameters, provider.name),
      });
    }

    const raw = providerResponse.result;

    // 6. Compute confidence factors
    const confidenceFactors = this.computeConfidenceFactors(
      raw, geometryType, analysisBufferM, before, after
    );
    const confidence = this.scoreOverallConfidence(confidenceFactors);

    // 7. Classify change
    const changeClassification = this.classifyChange(
      raw.changePercent, confidence
    );

    // 8. Reported progress comparison
    const approved = project.approvedAmount ?? 0;
    const spent = project.spentAmount ?? 0;
    const reportedProgress = approved > 0 ? (spent / approved) * 100 : 0;
    const reportedProgressComparison = this.compareWithReportedProgress(
      reportedProgress,
      changeClassification,
      confidence
    );

    // 9. Build change story
    const changeStory = this.buildChangeStory(
      raw, changeClassification, confidence, before, after, sector
    );

    // 10. Build evidence package
    const evidencePackage = this.buildEvidencePackage(
      before, after, raw, geometry, confidenceFactors, runParameters
    );

    // 11. Build limitations
    const limitations = this.buildLimitations(
      raw, geometryType, analysisBufferM, before, after, provider.name
    );

    const methodology = this.buildMethodology(input, sector, runParameters, provider.name);

    // 12. Store result
    const created = await this.prisma.changeAnalysis.create({
      data: {
        projectId,
        observationBeforeId,
        observationAfterId,
        analysisType,
        primarySignal,
        sector,
        geometryType,
        analysisBufferM,
        geometryRef: geometry as unknown as Prisma.InputJsonValue,
        totalAreaM2: raw.totalAreaM2,
        validAreaM2: raw.validAreaM2,
        changedAreaM2: raw.changedAreaM2,
        changePercent: raw.changePercent,
        ndviBefore: raw.ndviBefore,
        ndviAfter: raw.ndviAfter,
        ndviDelta: raw.ndviDelta,
        ndbiBefore: raw.ndbiBefore,
        ndbiAfter: raw.ndbiAfter,
        ndbiDelta: raw.ndbiDelta,
        bsiBefore: raw.bsiBefore,
        bsiAfter: raw.bsiAfter,
        bsiDelta: raw.bsiDelta,
        controlAreaChangePercent: raw.controlAreaChangePercent,
        deltaRatio: raw.deltaRatio,
        cloudPercentBefore: raw.cloudPercentBefore,
        cloudPercentAfter: raw.cloudPercentAfter,
        validPixelsPercent: raw.validPixelsPercent,
        changeClassification,
        confidence,
        confidenceFactors: confidenceFactors as unknown as Prisma.InputJsonValue,
        changeRegions: raw.changeRegions as unknown as Prisma.InputJsonValue,
        changeStory,
        reportedProgressComparison,
        evidencePackage: evidencePackage as unknown as Prisma.InputJsonValue,
        methodology,
        limitations,
        processingStatus: 'COMPLETED',
        provider: provider.name,
        algorithmVersion: runParameters.algorithmVersion,
        runParameters: runParameters as unknown as Prisma.InputJsonValue,
        parametersHash,
        jobId,
        baselineDate: before.observationDate,
        comparisonDate: after.observationDate,
      },
    });

    logger.info(`[change-analysis] Completed: id=${created.id} classification=${changeClassification} confidence=${confidence}`);

    return this.toAnalysisResult(created);
  }

  // ── Geometry ────────────────────────────────────────────────────────────

  private buildGeometry(project: {
    latitude: number | null;
    longitude: number | null;
  }): { geometry: AnalysisGeometry; geometryType: 'POLYGON' | 'POINT_BUFFER'; analysisBufferM: number } {
    const bufferM = parseInt(process.env.ANALYSIS_BUFFER_METERS ?? '200');
    const half = (bufferM / 111_320);

    // For now, use point + buffer for all projects.
    // In future, support validated polygon from ProjectLocation.geometry.
    const lat = project.latitude!;
    const lng = project.longitude!;
    const ring: [number, number][] = [
      [lng - half, lat - half],
      [lng + half, lat - half],
      [lng + half, lat + half],
      [lng - half, lat + half],
      [lng - half, lat - half],
    ];
    return {
      geometry: { type: 'Polygon', coordinates: [ring] },
      geometryType: 'POINT_BUFFER',
      analysisBufferM: bufferM,
    };
  }

  // ── Provider selection ──────────────────────────────────────────────────

  private selectProvider(): ChangeAnalysisProvider {
    if (geeProvider.isConfigured()) {
      logger.info('[change-analysis] Using GEE provider');
      return geeProvider;
    }
    logger.info('[change-analysis] GEE not configured — falling back to CDSE_PIXEL provider');
    return cdsePixelProvider;
  }

  // ── Confidence estimation ───────────────────────────────────────────────

  computeConfidenceFactors(
    raw: RawAnalysisResult,
    geometryType: 'POLYGON' | 'POINT_BUFFER',
    analysisBufferM: number,
    before: { observationDate: Date },
    after: { observationDate: Date }
  ): ConfidenceFactors {
    // Image quality
    const imageQuality: Confidence =
      raw.cloudPercentBefore < 20 && raw.cloudPercentAfter < 20 && raw.validPixelsPercent > 80
        ? 'HIGH'
        : raw.cloudPercentBefore < 50 && raw.cloudPercentAfter < 50
          ? 'MEDIUM'
          : 'LOW';

    // Geometry quality
    const geometryQuality: Confidence =
      geometryType === 'POLYGON'
        ? 'HIGH'
        : analysisBufferM <= 200
          ? 'MEDIUM'
          : 'LOW';

    // Spatial coherence
    const largestRegion = raw.changeRegions.reduce(
      (max, r) => Math.max(max, r.areaM2), 0
    );
    const spatialCoherence: Confidence =
      raw.changeRegions.length === 0
        ? 'LOW'
        : largestRegion >= 500
          ? 'HIGH'
          : largestRegion >= 100
            ? 'MEDIUM'
            : 'LOW';

    // Seasonality risk
    const seasonalityRisk = this.scoreSeasonalityRisk(before.observationDate, after.observationDate);

    // Resolution suitability
    const resolutionSuitability: Confidence = 'MEDIUM'; // 10m is fixed for Sentinel-2

    // Control area comparison
    const controlAreaComparison: Confidence =
      raw.deltaRatio === 0
        ? 'HIGH' // No project-specific change vs. control
        : raw.deltaRatio > 2
          ? 'HIGH'
          : raw.deltaRatio >= 1
            ? 'MEDIUM'
            : 'LOW';

    return {
      imageQuality,
      geometryQuality,
      spatialCoherence,
      seasonalityRisk,
      resolutionSuitability,
      controlAreaComparison,
    };
  }

  private scoreSeasonalityRisk(before: Date, after: Date): Confidence {
    const monthBefore = before.getMonth() + 1; // 1-12
    const monthAfter = after.getMonth() + 1;

    // Northern India vegetation: green = Jul-Oct (7-10), dry = Mar-May (3-5)
    const isGreen = (m: number) => m >= 7 && m <= 10;
    const isDry = (m: number) => m >= 3 && m <= 5;

    if ((isGreen(monthBefore) && isGreen(monthAfter)) || (isDry(monthBefore) && isDry(monthAfter))) {
      return 'HIGH'; // Same season
    }
    if ((isGreen(monthBefore) && isDry(monthAfter)) || (isDry(monthBefore) && isGreen(monthAfter))) {
      return 'MEDIUM'; // Cross-season
    }
    return 'HIGH'; // Transitional months — not a strong signal
  }

  scoreOverallConfidence(factors: ConfidenceFactors): Confidence {
    const scores: number[] = Object.values(factors).map((f) =>
      f === 'HIGH' ? 3 : f === 'MEDIUM' ? 2 : 1
    );
    const total = scores.reduce((s, v) => s + v, 0);
    // 6 factors × 3 = max 18
    if (total >= 15) return 'HIGH';
    if (total >= 11) return 'MEDIUM';
    return 'LOW';
  }

  // ── Classification ──────────────────────────────────────────────────────

  classifyChange(changePercent: number, confidence: Confidence): ChangeClassification {
    if (confidence === 'LOW') return 'INCONCLUSIVE';
    if (changePercent < 1) return 'NO_DETECTABLE_CHANGE';
    if (changePercent < 10) return 'LOW_CHANGE';
    if (changePercent < 30) return 'MODERATE_CHANGE';
    return 'HIGH_CHANGE';
  }

  // ── Reported progress comparison ────────────────────────────────────────

  compareWithReportedProgress(
    reportedProgress: number,
    classification: ChangeClassification,
    confidence: Confidence
  ): ConsistencyAssessment {
    if (confidence === 'LOW') return 'INSUFFICIENT_DATA';
    if (classification === 'INCONCLUSIVE' || classification === 'INVALID') return 'INCONCLUSIVE';

    const observableChange = classification !== 'NO_DETECTABLE_CHANGE';

    if (reportedProgress <= 20) {
      return !observableChange ? 'CONSISTENT' : 'POSSIBLY_INCONSISTENT';
    }
    if (reportedProgress > 60) {
      return observableChange ? 'CONSISTENT' : 'POSSIBLY_INCONSISTENT';
    }
    return 'INCONCLUSIVE';
  }

  // ── Change story (human-readable) ───────────────────────────────────────

  buildChangeStory(
    raw: RawAnalysisResult,
    classification: ChangeClassification,
    confidence: Confidence,
    before: { observationDate: Date },
    after: { observationDate: Date },
    sector: string
  ): string {
    const days = Math.round(
      (after.observationDate.getTime() - before.observationDate.getTime()) / 86400_000
    );
    const dateA = before.observationDate.toISOString().slice(0, 10);
    const dateB = after.observationDate.toISOString().slice(0, 10);

    const changePercent = raw.changePercent.toFixed(1);
    const regionCount = raw.changeRegions.length;

    let story = `Between ${dateA} and ${dateB} (${days} days apart), `;
    story += `the analysis area shows `;
    if (classification === 'NO_DETECTABLE_CHANGE') {
      story += `no detectable change in spectral signatures.`;
    } else if (classification === 'LOW_CHANGE') {
      story += `low observable change (${changePercent}% of the analysis area).`;
    } else if (classification === 'MODERATE_CHANGE') {
      story += `moderate observable change (${changePercent}% of the analysis area) with ${regionCount} change region(s) detected.`;
    } else if (classification === 'HIGH_CHANGE') {
      story += `high observable change (${changePercent}% of the analysis area) with ${regionCount} change region(s) detected.`;
    } else {
      story += `inconclusive evidence (${changePercent}% change, low confidence).`;
    }

    story += ` The dominant spectral signal is `;
    switch (raw.primarySignal) {
      case 'NDVI_CHANGE': story += 'vegetation index change (NDVI).'; break;
      case 'BUILT_SURFACE_CHANGE': story += 'built-surface change (NDBI).'; break;
      case 'VEGETATION_DISTURBANCE': story += 'potential vegetation disturbance.'; break;
      case 'BARE_SOIL': story += 'potential bare-soil appearance (BSI).'; break;
      case 'WATER_CHANGE': story += 'water extent change.'; break;
      default: story += 'general spectral change.';
    }

    if (classification === 'INCONCLUSIVE') {
      story += ' This analysis cannot reliably distinguish project-related change from broader environmental effects. Field verification is required.';
    } else if (raw.controlAreaChangePercent > 0 && raw.changePercent > 0) {
      const ratio = (raw.changePercent / raw.controlAreaChangePercent).toFixed(2);
      story += ` For context, the surrounding control area shows ${raw.controlAreaChangePercent.toFixed(1)}% change (ratio ${ratio}).`;
    }

    story += ' Satellite evidence alone cannot establish construction completion percentage.';

    return story;
  }

  // ── Evidence package ───────────────────────────────────────────────────

  buildEvidencePackage(
    before: { id: string; sceneId: string | null; observationDate: Date; cloudCover: number; satellite: string; sourceUrl: string | null },
    after: { id: string; sceneId: string | null; observationDate: Date; cloudCover: number; satellite: string; sourceUrl: string | null },
    raw: RawAnalysisResult,
    geometry: AnalysisGeometry,
    confidenceFactors: ConfidenceFactors,
    runParameters: RunParameters
  ): Record<string, unknown> {
    return {
      beforeRef: {
        observationId: before.id,
        sceneId: before.sceneId,
        observationDate: before.observationDate.toISOString(),
        cloudCover: before.cloudCover,
        satellite: before.satellite,
        sourceUrl: before.sourceUrl,
      },
      afterRef: {
        observationId: after.id,
        sceneId: after.sceneId,
        observationDate: after.observationDate.toISOString(),
        cloudCover: after.cloudCover,
        satellite: after.satellite,
        sourceUrl: after.sourceUrl,
      },
      geometry: {
        type: geometry.type,
        coordinates: geometry.coordinates,
      },
      metrics: {
        totalAreaM2: raw.totalAreaM2,
        validAreaM2: raw.validAreaM2,
        changedAreaM2: raw.changedAreaM2,
        changePercent: raw.changePercent,
        ndviBefore: raw.ndviBefore,
        ndviAfter: raw.ndviAfter,
        ndviDelta: raw.ndviDelta,
        ndbiBefore: raw.ndbiBefore,
        ndbiAfter: raw.ndbiAfter,
        ndbiDelta: raw.ndbiDelta,
        bsiBefore: raw.bsiBefore,
        bsiAfter: raw.bsiAfter,
        bsiDelta: raw.bsiDelta,
        controlAreaChangePercent: raw.controlAreaChangePercent,
        deltaRatio: raw.deltaRatio,
        validPixelsPercent: raw.validPixelsPercent,
        cloudPercentBefore: raw.cloudPercentBefore,
        cloudPercentAfter: raw.cloudPercentAfter,
      },
      changeRegions: raw.changeRegions,
      algorithm: {
        version: runParameters.algorithmVersion,
        primarySignal: raw.primarySignal,
        ndviThreshold: runParameters.ndviThreshold,
        ndbiThreshold: runParameters.ndbiThreshold,
        bsiThreshold: runParameters.bsiThreshold,
        minValidPixelsPercent: runParameters.minValidPixelsPercent,
        minRegionAreaM2: runParameters.minRegionAreaM2,
        controlAreaMultiplier: runParameters.controlAreaMultiplier,
      },
      confidenceFactors,
      sourceProvenance: {
        dataset: 'Sentinel-2 L2A',
        resolution: '10m',
        provider: raw.processingNotes.join('; '),
      },
    };
  }

  // ── Limitations ────────────────────────────────────────────────────────

  buildLimitations(
    raw: RawAnalysisResult,
    geometryType: 'POLYGON' | 'POINT_BUFFER',
    analysisBufferM: number,
    before: { observationDate: Date },
    after: { observationDate: Date },
    providerName: string
  ): string {
    const limits: string[] = [];

    if (providerName === 'CDSE_PIXEL') {
      limits.push(
        'Analysis run via CDSE_PIXEL provider (pure-JS spectral index computation). ' +
        'Pixel sampling on a 50×50 grid; results approximate full-raster values. ' +
        'For full raster precision, configure Google Earth Engine credentials.'
      );
    }

    if (geometryType === 'POINT_BUFFER') {
      limits.push(
        `Project footprint is unknown; analysis used a ${analysisBufferM}m analytical buffer ` +
        'centered on the project coordinates. This is NOT the official project boundary. ' +
        'A validated project polygon would yield a more precise result.'
      );
    }

    if (raw.cloudPercentBefore > 30 || raw.cloudPercentAfter > 30) {
      limits.push(
        `Cloud cover was elevated (before: ${raw.cloudPercentBefore.toFixed(0)}%, ` +
        `after: ${raw.cloudPercentAfter.toFixed(0)}%). Some pixels may be cloud-contaminated.`
      );
    }

    if (raw.validPixelsPercent < 80) {
      limits.push(
        `Valid pixel coverage was ${raw.validPixelsPercent.toFixed(0)}%; some areas could not be analyzed.`
      );
    }

    const days = Math.round(
      (after.observationDate.getTime() - before.observationDate.getTime()) / 86400_000
    );
    if (days < 30) {
      limits.push(
        `Temporal separation is only ${days} days — short gaps may not capture meaningful project change.`
      );
    }

    limits.push(
      'Satellite resolution is 10m — features smaller than 10m are not visible. ' +
      'Underground work, interior building work, and surface finishing are not observable. ' +
      'NDVI/NDBI/BSI changes do not necessarily indicate construction. ' +
      'Field verification is required for any conclusion about project progress.'
    );

    return limits.join(' ');
  }

  // ── Methodology ────────────────────────────────────────────────────────

  buildMethodology(
    input: RunAnalysisInput,
    sector: string,
    runParameters: RunParameters,
    providerName: string | null
  ): string {
    return [
      `Algorithm: ${runParameters.algorithmVersion}`,
      `Provider: ${providerName ?? 'none (failed before provider selection)'}`,
      `Sector: ${sector}`,
      `Analysis type: ${input.analysisType ?? 'CUSTOM'}`,
      `Primary signal: ${input.primarySignal ?? 'auto'}`,
      `NDVI threshold: ${runParameters.ndviThreshold}`,
      `NDBI threshold: ${runParameters.ndbiThreshold}`,
      `BSI threshold: ${runParameters.bsiThreshold}`,
      `Minimum valid pixels: ${runParameters.minValidPixelsPercent}%`,
      `Minimum region area: ${runParameters.minRegionAreaM2}m²`,
      `Buffer: ${runParameters.analysisBufferM ?? parseInt(process.env.ANALYSIS_BUFFER_METERS ?? '200')}m (point-only projects)`,
      `Dataset: Sentinel-2 L2A (10m)`,
    ].join(' | ');
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private hashParameters(p: RunParameters): string {
    return createHash('sha256')
      .update(JSON.stringify(p, Object.keys(p).sort()))
      .digest('hex')
      .slice(0, 16);
  }

  private async findCachedResult(
    projectId: string,
    beforeId: string,
    afterId: string,
    parametersHash: string
  ): Promise<import('@vojas/db').ChangeAnalysis | null> {
    return this.prisma.changeAnalysis.findFirst({
      where: {
        projectId,
        observationBeforeId: beforeId,
        observationAfterId: afterId,
        parametersHash,
        processingStatus: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async loadObservations(
    projectId: string,
    beforeId: string,
    afterId: string
  ): Promise<{
    project: { latitude: number | null; longitude: number | null; approvedAmount: number | null; spentAmount: number | null };
    before: import('@vojas/db').SatelliteObservation | null;
    after: import('@vojas/db').SatelliteObservation | null;
  }> {
    const [project, before, after] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { latitude: true, longitude: true, approvedAmount: true, spentAmount: true },
      }),
      this.prisma.satelliteObservation.findUnique({ where: { id: beforeId } }),
      this.prisma.satelliteObservation.findUnique({ where: { id: afterId } }),
    ]);

    if (!project) throw new Error(`Project ${projectId} not found`);
    if (!before || before.projectId !== projectId) return { project, before: null, after: null };
    if (!after || after.projectId !== projectId) return { project, before, after: null };

    return { project, before, after };
  }

  private toObsRef(obs: import('@vojas/db').SatelliteObservation): AnalysisParams['before'] {
    return {
      id: obs.id,
      sceneId: obs.sceneId,
      observationDate: obs.observationDate,
      cloudCover: obs.cloudCover,
      resolution: obs.resolution,
      centerLat: obs.centerLat,
      centerLng: obs.centerLng,
      provider: obs.provider,
      satellite: obs.satellite,
      sourceUrl: obs.sourceUrl,
    };
  }

  private async createFailedRecord(input: {
    projectId: string;
    observationBeforeId: string;
    observationAfterId: string;
    jobId: string;
    sector: string;
    runParameters: RunParameters;
    parametersHash: string;
    processingStatus: AnalysisStatus;
    errorMessage: string;
    methodology: string;
  }): Promise<AnalysisResult> {
    const created = await this.prisma.changeAnalysis.create({
      data: {
        projectId: input.projectId,
        observationBeforeId: input.observationBeforeId,
        observationAfterId: input.observationAfterId,
        analysisType: 'CUSTOM',
        primarySignal: 'SPECTRAL_CHANGE',
        sector: input.sector,
        geometryType: 'POINT_BUFFER',
        analysisBufferM: input.runParameters.analysisBufferM ?? 200,
        changeClassification: 'INVALID',
        confidence: 'LOW',
        methodology: input.methodology,
        processingStatus: input.processingStatus,
        algorithmVersion: input.runParameters.algorithmVersion,
        runParameters: input.runParameters as unknown as Prisma.InputJsonValue,
        parametersHash: input.parametersHash,
        jobId: input.jobId,
        errorMessage: input.errorMessage,
      },
    });
    logger.warn(`[change-analysis] Failed: id=${created.id} status=${input.processingStatus} reason=${input.errorMessage}`);
    return this.toAnalysisResult(created);
  }

  private toAnalysisResult(record: import('@vojas/db').ChangeAnalysis): AnalysisResult {
    return {
      id: record.id,
      projectId: record.projectId,
      observationBeforeId: record.observationBeforeId ?? '',
      observationAfterId: record.observationAfterId ?? '',
      analysisType: record.analysisType as AnalysisType,
      primarySignal: record.primarySignal as SignalType,
      sector: record.sector,
      geometryType: record.geometryType as 'POLYGON' | 'POINT_BUFFER',
      analysisBufferM: record.analysisBufferM,
      totalAreaM2: record.totalAreaM2,
      validAreaM2: record.validAreaM2,
      changedAreaM2: record.changedAreaM2,
      changePercent: record.changePercent,
      ndviBefore: record.ndviBefore,
      ndviAfter: record.ndviAfter,
      ndviDelta: record.ndviDelta,
      ndbiBefore: record.ndbiBefore,
      ndbiAfter: record.ndbiAfter,
      ndbiDelta: record.ndbiDelta,
      bsiBefore: record.bsiBefore,
      bsiAfter: record.bsiAfter,
      bsiDelta: record.bsiDelta,
      controlAreaChangePercent: record.controlAreaChangePercent,
      deltaRatio: record.deltaRatio,
      cloudPercentBefore: record.cloudPercentBefore,
      cloudPercentAfter: record.cloudPercentAfter,
      validPixelsPercent: record.validPixelsPercent,
      changeClassification: record.changeClassification as ChangeClassification,
      confidence: record.confidence as Confidence,
      confidenceFactors: record.confidenceFactors as unknown as ConfidenceFactors | null,
      changeRegions: (record.changeRegions as unknown as ChangeRegion[]) ?? [],
      changeStory: record.changeStory,
      reportedProgressComparison: record.reportedProgressComparison as ConsistencyAssessment | null,
      evidencePackage: record.evidencePackage as Record<string, unknown> | null,
      methodology: record.methodology,
      limitations: record.limitations,
      processingStatus: record.processingStatus as AnalysisStatus,
      provider: record.provider,
      algorithmVersion: record.algorithmVersion,
      runParameters: record.runParameters as unknown as RunParameters,
      parametersHash: record.parametersHash ?? '',
      jobId: record.jobId,
      errorMessage: record.errorMessage,
      analysisDate: record.analysisDate.toISOString(),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}

// ── Singleton helper ───────────────────────────────────────────────────────

let engineInstance: ChangeAnalysisEngine | null = null;

export function getChangeAnalysisEngine(prisma: PrismaClient): ChangeAnalysisEngine {
  if (!engineInstance) {
    engineInstance = new ChangeAnalysisEngine(prisma);
  }
  return engineInstance;
}
