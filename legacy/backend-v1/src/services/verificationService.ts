/**
 * verificationService.ts
 * Rule-based project verification engine for VOJAS MPLADS accountability platform.
 *
 * Compares reported progress (official MPLADS records) against observable change
 * from satellite Earth observation to detect discrepancies.
 */

import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

export interface VerificationInput {
  projectId: string;
  reportedProgress?: number;
  reportedProgressDate?: Date;
  reportedProgressSource?: string;
  observedChange?: number;
  observedChangeType?: string;
  satelliteQuality?: string;
  cloudCover?: number;
  projectBoundaryQuality?: string;
  analysisConfidence?: string;
  observableArea?: number;
  reportedProgressAvailable: boolean;
  satelliteAvailable: boolean;
}

export interface QualityFactors {
  cloudCover: number | null;
  resolutionGap: number | null;
  boundaryQuality: string | null;
  observationAge: number | null;
  satelliteAvailable: boolean;
}

export interface VerificationOutput {
  result: 'CONSISTENT' | 'POTENTIAL_DISCREPANCY' | 'INSUFFICIENT_EVIDENCE' | 'REQUIRES_FIELD';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  recommendedAction: string;
  dataQuality: 'GOOD' | 'MODERATE' | 'POOR' | 'INSUFFICIENT';
  qualityFactors: QualityFactors;
  score: number;
  reportedProgress: number | null;
  observedProgress: number | null;
  discrepancy: number | null;
}

// Internal type helpers for Prisma-returned records (SQLite returns null, not undefined)
interface SatelliteRecord {
  id: string;
  projectId: string;
  observationDate: Date;
  cloudCover: number;
  constructionScore?: number | null;
  builtUpArea?: number | null;
  quality?: string | null;
  satellite?: string | null;
  sensor?: string | null;
}

interface ProgressRecord {
  id: string;
  projectId: string;
  reportedProgress: number;
  reportDate: Date;
  observationDate?: Date | null;
  reportSource?: string | null;
}

interface ProjectRecord {
  id: string;
  name?: string;
  district?: string;
  state?: string;
  sector?: string;
  expectedSize?: number;
  boundaryQuality?: string | null; // Prisma returns null, not undefined
}

export class VerificationService {
  // Sentinel-2 resolution: 10m. Ideal would be < 5m.
  private readonly SENTINEL_RESOLUTION = 10;
  private readonly IDEAL_RESOLUTION = 5;
  private readonly RESOLUTION_GAP = this.SENTINEL_RESOLUTION - this.IDEAL_RESOLUTION;

  // Thresholds
  private readonly DISCREPANCY_THRESHOLD = 20; // % points — flag as discrepancy above this
  private readonly UNDERREPORTING_THRESHOLD = 30; // % points — observed significantly ahead

  /**
   * Main entry: verify a project at a given date.
   */
  async verify(params: VerificationInput): Promise<VerificationOutput> {
    const {
      projectId,
      reportedProgress,
      reportedProgressDate,
      observedChange,
      cloudCover,
      projectBoundaryQuality,
      analysisConfidence,
      reportedProgressAvailable,
      satelliteAvailable,
    } = params;

    // Compute data quality
    const observationAge = this.computeObservationAge(params);
    const dataQuality = this.computeDataQuality({
      cloudCover,
      projectBoundaryQuality,
      observationAge,
      satelliteAvailable,
    });

    const qualityFactors: QualityFactors = {
      cloudCover: cloudCover ?? null,
      resolutionGap: satelliteAvailable ? this.RESOLUTION_GAP : null,
      boundaryQuality: projectBoundaryQuality ?? null,
      observationAge: observationAge,
      satelliteAvailable,
    };

    // --- Rule 1: No satellite data ---
    if (!satelliteAvailable) {
      return this.buildOutput({
        result: 'INSUFFICIENT_EVIDENCE',
        confidence: 'LOW',
        dataQuality: 'INSUFFICIENT',
        explanation:
          'No satellite observation is available for this project location. ' +
          'Verification cannot proceed without remote sensing data. ' +
          'Recommended action: acquire satellite imagery from available sources (Sentinel-2, Landsat) or arrange a field inspection.',
        recommendedAction: 'Acquire satellite imagery or conduct field inspection',
        qualityFactors,
        reportedProgress: reportedProgress ?? null,
        observedProgress: null,
        discrepancy: null,
      });
    }

    // --- Rule 2: High cloud cover ---
    if (cloudCover !== undefined && cloudCover > 70) {
      return this.buildOutput({
        result: 'INSUFFICIENT_EVIDENCE',
        confidence: 'LOW',
        dataQuality: 'POOR',
        explanation:
          `The latest satellite observation for this project has ${cloudCover}% cloud cover — well above the 70% threshold for reliable analysis. ` +
          'Visual interpretation and area measurements are unreliable under such cloud conditions. ' +
          'Recommended action: wait for a clearer sky (typically within 1-2 weeks during non-monsoon periods) or proceed with field inspection.',
        recommendedAction: 'Wait for clearer sky or use field inspection',
        qualityFactors,
        reportedProgress: reportedProgress ?? null,
        observedProgress: null,
        discrepancy: null,
      });
    }

    // --- Rule 3: No project boundary (centroid only) ---
    if (projectBoundaryQuality === 'CENTROID_ONLY') {
      return this.buildOutput({
        result: 'INSUFFICIENT_EVIDENCE',
        confidence: 'LOW',
        dataQuality: 'POOR',
        explanation:
          'Project boundary is defined only by a centroid point (approximate center coordinates) rather than a verified polygon. ' +
          'Area-based calculations — including change detection, built-up area measurement, and construction progress estimation — are therefore unreliable. ' +
          'Recommended action: verify the exact project boundary from MPLADS portal documents before proceeding with satellite analysis.',
        recommendedAction: 'Verify exact project boundary before satellite analysis',
        qualityFactors,
        reportedProgress: reportedProgress ?? null,
        observedProgress: null,
        discrepancy: null,
      });
    }

    // At this point we have satellite data and can compute observable progress
    const observedProgress = observedChange ?? this.inferObservableProgress(params);

    // --- Rule 4: Reported significantly BELOW observable (possible under-reporting) ---
    if (
      reportedProgressAvailable &&
      reportedProgress !== undefined &&
      observedProgress !== undefined
    ) {
      const discrepancy = reportedProgress - observedProgress;

      if (discrepancy < -this.UNDERREPORTING_THRESHOLD) {
        // observed > reported by more than threshold
        const gap = Math.abs(discrepancy);
        return this.buildOutput({
          result: 'REQUIRES_FIELD',
          confidence: 'MEDIUM',
          dataQuality,
          explanation:
            `Observable satellite evidence suggests progress may be ahead of the officially reported status. ` +
            `Reported progress stands at ${reportedProgress}%, while satellite-observable change indicates approximately ${observedProgress}%. ` +
            `This gap of ~${gap}% points suggests possible under-reporting, which could indicate: ` +
            `(a) work completed but not yet updated in the MPLADS portal, ` +
            `(b) work progressing faster than recorded, or ` +
            `(c) unauthorized deviations from sanctioned work. ` +
            `Field verification is required to confirm the actual status.`,
          recommendedAction: 'Verify with field inspection — possible under-reporting detected',
          qualityFactors,
          reportedProgress,
          observedProgress,
          discrepancy,
        });
      }

      // --- Rule 5: Reported ABOVE observable (potential discrepancy) ---
      if (discrepancy > this.DISCREPANCY_THRESHOLD) {
        const severity = discrepancy > 40 ? 'HIGH' : 'MEDIUM';
        return this.buildOutput({
          result: 'POTENTIAL_DISCREPANCY',
          confidence: 'MEDIUM',
          dataQuality,
          explanation:
            `Reported progress (${reportedProgress}%) exceeds observable satellite evidence (~${observedProgress}%). ` +
            `The discrepancy of approximately ${discrepancy.toFixed(1)} percentage points is significant. ` +
            `Satellite imagery does not show sufficient physical construction or land change to support the reported status. ` +
            `Possible explanations include: ` +
            `(a) work not yet visible at current satellite resolution (10m Sentinel-2), ` +
            `(b) progress recorded prematurely in the portal, ` +
            `(c) work stalled or reversed after the satellite image was captured, ` +
            `(d) incorrect project boundary alignment. ` +
            `This ${severity}-priority flag requires officer review and field inspection.`,
          recommendedAction:
            severity === 'HIGH'
              ? 'Flag for urgent officer review — high discrepancy detected — field inspection required'
              : 'Flag for officer review + field inspection',
          qualityFactors,
          reportedProgress,
          observedProgress,
          discrepancy,
        });
      }

      // --- Rule 6: Consistent ---
      const confidenceFromQuality = this.confidenceFromDataQuality(dataQuality);
      return this.buildOutput({
        result: 'CONSISTENT',
        confidence: confidenceFromQuality,
        dataQuality,
        explanation:
          `Reported progress (${reportedProgress}%) is consistent with observable satellite evidence (~${observedProgress}%). ` +
          `The difference of ${Math.abs(discrepancy).toFixed(1)} percentage points is within the acceptable threshold of ${this.DISCREPANCY_THRESHOLD} points. ` +
          `Physical construction observable from space aligns with the officially recorded progress. ` +
          `Continue routine monitoring as per schedule.`,
        recommendedAction: 'Continue monitoring — no action required',
        qualityFactors,
        reportedProgress,
        observedProgress,
        discrepancy,
      });
    }

    // No reported progress available — partial analysis based on satellite only
    if (observedProgress !== undefined) {
      return this.buildOutput({
        result: 'INSUFFICIENT_EVIDENCE',
        confidence: 'LOW',
        dataQuality,
        explanation:
          `Observable satellite change of approximately ${observedProgress}% was detected, but no official reported progress data is available for comparison. ` +
          `Verification requires both reported progress (from MPLADS portal) and satellite observation. ` +
          `Please update the official progress record before a full verification can be completed.`,
        recommendedAction: 'Update official progress record in MPLADS portal to enable verification',
        qualityFactors,
        reportedProgress: null,
        observedProgress,
        discrepancy: null,
      });
    }

    // Nothing usable
    return this.buildOutput({
      result: 'INSUFFICIENT_EVIDENCE',
      confidence: 'LOW',
      dataQuality: 'INSUFFICIENT',
      explanation:
        'Insufficient data for verification. Neither reported progress nor observable satellite change data is available for this project.',
      recommendedAction: 'Provide both official progress data and satellite observation for verification',
      qualityFactors,
      reportedProgress: null,
      observedProgress: null,
      discrepancy: null,
    });
  }

  /**
   * Run verification and store the result in the database.
   */
  async runAndStore(params: {
    projectId: string;
    observationId?: string;
    existingProgressId?: string;
  }): Promise<{ output: VerificationOutput; resultId: string }> {
    const { projectId, observationId, existingProgressId } = params;

    logger.info(`[VerificationService] Running and storing verification for project ${projectId}`);

    // Gather inputs
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    }).catch((err) => {
      logger.error(`[VerificationService] Failed to fetch project ${projectId}: ${err.message}`);
      return null;
    });

    let satelliteObs: SatelliteRecord | null = null;
    let progressRecord: ProgressRecord | null = null;

    if (observationId) {
      satelliteObs = await prisma.satelliteObservation.findUnique({
        where: { id: observationId },
      }).catch((err) => {
        logger.error(`[VerificationService] Failed to fetch satellite observation ${observationId}: ${err.message}`);
        return null;
      });
    } else {
      const latest = await prisma.satelliteObservation.findFirst({
        where: { projectId },
        orderBy: { observationDate: 'desc' },
      }).catch((err) => {
        logger.error(`[VerificationService] Failed to fetch latest satellite observation for project ${projectId}: ${err.message}`);
        return null;
      });
      satelliteObs = latest;
    }

    if (existingProgressId) {
      progressRecord = await prisma.progressObservation.findUnique({
        where: { id: existingProgressId },
      }).catch((err) => {
        logger.error(`[VerificationService] Failed to fetch progress record ${existingProgressId}: ${err.message}`);
        return null;
      });
    } else {
      const latest = await prisma.progressObservation.findFirst({
        where: { projectId },
        orderBy: { observationDate: 'desc' },
      }).catch((err) => {
        logger.error(`[VerificationService] Failed to fetch latest progress for project ${projectId}: ${err.message}`);
        return null;
      });
      progressRecord = latest;
    }

    const input: VerificationInput = {
      projectId,
      reportedProgress: progressRecord?.reportedProgress,
      reportedProgressDate: progressRecord?.reportDate,
      reportedProgressSource: progressRecord?.reportSource ?? undefined,
      observedChange: satelliteObs?.constructionScore ?? undefined,
      observedChangeType: satelliteObs?.satellite ? `${satelliteObs.satellite} L2A` : undefined,
      satelliteQuality: satelliteObs?.quality ?? undefined,
      cloudCover: satelliteObs?.cloudCover ?? undefined,
      projectBoundaryQuality: project?.boundaryQuality ?? undefined,
      analysisConfidence: satelliteObs?.quality === "GOOD" ? "HIGH" : satelliteObs?.quality === "MODERATE" ? "MEDIUM" : "LOW",
      observableArea: satelliteObs?.builtUpArea ?? undefined,
      reportedProgressAvailable: progressRecord !== null,
      satelliteAvailable: satelliteObs !== null,
    };

    const output = await this.verify(input);

    // Store result in ProgressObservation (verification records live here)
    let progressId: string;
    try {
      const created = await prisma.progressObservation.create({
        data: {
          projectId,
          observationId: satelliteObs?.id ?? undefined,
          reportDate: new Date(),
          observationDate: satelliteObs?.observationDate ?? undefined,
          reportedProgress: output.reportedProgress ?? 0,
          reportSource: "VOJAS_VERIFICATION",
          observedChange: output.observedProgress ?? undefined,
          observableArea: output.discrepancy !== null ? Math.abs(output.discrepancy) : undefined,
          verificationResult: output.result,
          confidenceLevel: output.confidence,
          explanation: output.explanation,
          dataQuality: output.dataQuality,
          qualityFactors: JSON.stringify(output.qualityFactors),
          recommendedAction: output.recommendedAction,
        },
      });
      progressId = created.id;
      logger.info(`[VerificationService] Stored verification as ProgressObservation ${progressId} for project ${projectId}`);
    } catch (err) {
      logger.error(`[VerificationService] Failed to store verification: ${(err as Error).message}`);
      throw err;
    }

    // Store a separate AnalysisResult for the satellite analysis (if satellite was used)
    if (satelliteObs) {
      try {
        await prisma.analysisResult.create({
          data: {
            projectId,
            observationId: satelliteObs.id,
            progressId: progressId,
            analysisType: "VERIFICATION",
            result: JSON.stringify({
              verification: output.result,
              discrepancy: output.discrepancy,
            }),
            score: output.score,
            explanation: output.explanation,
            confidence: output.confidence,
            limitations: "Satellite-based verification cannot determine exact construction percentage. NDVI/NDBI analysis has inherent uncertainty at 10m resolution.",
            modelUsed: "vojas-rule-engine",
            processingTimeMs: 0,
          },
        });
      } catch (err) {
        logger.error(`[VerificationService] Failed to store analysis result: ${(err as Error).message}`);
      }
    }

    // If POTENTIAL_DISCREPANCY, create an anomaly
    if (output.result === 'POTENTIAL_DISCREPANCY' && output.discrepancy !== null) {
      await this.createDiscrepancyAnomaly(projectId, output, project);
    }

    return { output, resultId: progressId };
  }

  /**
   * Auto-verify a project: fetch latest progress + satellite observation, run verification.
   */
  async autoVerifyProject(projectId: string): Promise<VerificationOutput> {
    logger.info(`[VerificationService] Auto-verifying project ${projectId}`);
    const { output } = await this.runAndStore({ projectId });
    return output;
  }

  /**
   * Get verification history for a project.
   */
  async getVerificationHistory(projectId: string): Promise<VerificationOutput[]> {
    try {
      const results = await prisma.progressObservation.findMany({
        where: {
          projectId,
          reportSource: "VOJAS_VERIFICATION",
        },
        orderBy: { createdAt: 'desc' },
      });

      return results.map((r) => ({
        result: (r.verificationResult ?? "INSUFFICIENT_EVIDENCE") as VerificationOutput['result'],
        confidence: (r.confidenceLevel ?? "LOW") as VerificationOutput['confidence'],
        explanation: r.explanation ?? "No explanation available",
        recommendedAction: r.recommendedAction ?? "No action recommended",
        dataQuality: (r.dataQuality ?? "INSUFFICIENT") as VerificationOutput['dataQuality'],
        qualityFactors: this.parseQualityFactors(r.qualityFactors),
        score: 0,
        reportedProgress: r.reportedProgress,
        observedProgress: r.observedChange,
        discrepancy: r.reportedProgress && r.observedChange != null
          ? r.reportedProgress - r.observedChange
          : null,
      }));
    } catch (err) {
      logger.error(`[VerificationService] Failed to fetch verification history for project ${projectId}: ${(err as Error).message}`);
      return [];
    }
  }

  // --- Private helpers ---

  private buildOutput(opts: {
    result: VerificationOutput['result'];
    confidence: VerificationOutput['confidence'];
    dataQuality: VerificationOutput['dataQuality'];
    explanation: string;
    recommendedAction: string;
    qualityFactors: QualityFactors;
    reportedProgress: number | null;
    observedProgress: number | null;
    discrepancy: number | null;
  }): VerificationOutput {
    return {
      result: opts.result,
      confidence: opts.confidence,
      explanation: opts.explanation,
      recommendedAction: opts.recommendedAction,
      dataQuality: opts.dataQuality,
      qualityFactors: opts.qualityFactors,
      score: this.computeScore(opts),
      reportedProgress: opts.reportedProgress,
      observedProgress: opts.observedProgress,
      discrepancy: opts.discrepancy,
    };
  }

  private computeScore(opts: {
    result: VerificationOutput['result'];
    confidence: VerificationOutput['confidence'];
    dataQuality: VerificationOutput['dataQuality'];
    discrepancy: number | null;
    qualityFactors: QualityFactors;
  }): number {
    let score = 50;

    switch (opts.result) {
      case 'CONSISTENT':
        score = 80;
        break;
      case 'POTENTIAL_DISCREPANCY':
        score = opts.discrepancy && opts.discrepancy > 40 ? 20 : 40;
        break;
      case 'REQUIRES_FIELD':
        score = 30;
        break;
      case 'INSUFFICIENT_EVIDENCE':
        score = 10;
        break;
    }

    switch (opts.confidence) {
      case 'HIGH':
        score = Math.min(100, score + 10);
        break;
      case 'LOW':
        score = Math.max(0, score - 10);
        break;
    }

    switch (opts.dataQuality) {
      case 'GOOD':
        score = Math.min(100, score + 5);
        break;
      case 'POOR':
      case 'INSUFFICIENT':
        score = Math.max(0, score - 10);
        break;
    }

    return Math.round(score);
  }

  private computeDataQuality(params: {
    cloudCover?: number;
    projectBoundaryQuality?: string;
    observationAge?: number | null;
    satelliteAvailable: boolean;
  }): VerificationOutput['dataQuality'] {
    if (!params.satelliteAvailable) return 'INSUFFICIENT';

    const { cloudCover, projectBoundaryQuality, observationAge } = params;

    if (cloudCover !== undefined && cloudCover > 70) return 'INSUFFICIENT';
    if (!projectBoundaryQuality) return 'INSUFFICIENT';
    if (projectBoundaryQuality === 'CENTROID_ONLY') return 'POOR';

    const age = observationAge ?? 0;

    if (
      (cloudCover === undefined || cloudCover <= 10) &&
      projectBoundaryQuality === 'VERIFIED' &&
      age <= 7
    ) {
      return 'GOOD';
    }

    if (
      (cloudCover === undefined || cloudCover <= 30) &&
      ['VERIFIED', 'APPROXIMATE'].includes(projectBoundaryQuality)
    ) {
      return 'MODERATE';
    }

    if (cloudCover === undefined || cloudCover <= 70) return 'POOR';

    return 'INSUFFICIENT';
  }

  private computeObservationAge(params: VerificationInput): number | null {
    if (!params.reportedProgressDate || !params.reportedProgressAvailable) return null;
    // observationDate is the satellite observation date; we use the report date for age calculation
    // If the satellite observation is more recent than the report, age is negative (future)
    const now = new Date();
    const diffMs = now.getTime() - params.reportedProgressDate.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  private inferObservableProgress(params: VerificationInput): number | undefined {
    const { observedChange, satelliteQuality, observableArea } = params;

    // If a direct construction score is available, use it
    if (observedChange !== undefined) {
      return Math.min(100, Math.max(0, observedChange));
    }

    // If built-up area is available, normalize it
    if (observableArea !== undefined && observableArea > 0) {
      // Assume a typical MPLADS project is around 500–2000 sq m
      // This can be refined by sector-specific expected sizes
      const assumedProjectSize = 1000; // sq m
      const progress = (observableArea / assumedProjectSize) * 100;
      return Math.min(100, Math.max(0, Math.round(progress)));
    }

    return undefined;
  }

  private confidenceFromDataQuality(
    dataQuality: VerificationOutput['dataQuality'],
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    switch (dataQuality) {
      case 'GOOD':
        return 'HIGH';
      case 'MODERATE':
        return 'MEDIUM';
      case 'POOR':
        return 'LOW';
      default:
        return 'LOW';
    }
  }

  private parseQualityFactors(json: string | null): QualityFactors {
    if (!json) {
      return {
        cloudCover: null,
        resolutionGap: null,
        boundaryQuality: null,
        observationAge: null,
        satelliteAvailable: false,
      };
    }
    try {
      return JSON.parse(json) as QualityFactors;
    } catch {
      return {
        cloudCover: null,
        resolutionGap: null,
        boundaryQuality: null,
        observationAge: null,
        satelliteAvailable: false,
      };
    }
  }

  private async createDiscrepancyAnomaly(
    projectId: string,
    output: VerificationOutput,
    project: ProjectRecord | null,
  ): Promise<void> {
    if (output.discrepancy === null) return;

    const discrepancy = output.discrepancy;
    const severity = discrepancy > 40 ? 'HIGH' : 'MEDIUM';
    const district = project?.district ?? 'Unknown';
    const state = project?.state ?? 'Unknown';

    try {
      await prisma.anomaly.create({
        data: {
          projectId,
          category: 'PROGRESS_DISCREPANCY',
          title: `Progress Discrepancy — Reported vs Satellite Evidence`,
          description: output.explanation,
          severity,
          status: 'OPEN',
          evidence: JSON.stringify({
            district,
            state,
            verificationScore: output.score,
            reportedProgress: output.reportedProgress,
            observedProgress: output.observedProgress,
            discrepancy: discrepancy.toFixed(2),
            dataQuality: output.dataQuality,
            recommendedAction: output.recommendedAction,
          }),
        },
      });
      logger.info(
        `[VerificationService] Created PROGRESS_DISCREPANCY anomaly for project ${projectId} — severity: ${severity}`,
      );
    } catch (err) {
      logger.error(`[VerificationService] Failed to create anomaly for project ${projectId}: ${(err as Error).message}`);
    }
  }
}

export const verificationService = new VerificationService();
export default verificationService;
