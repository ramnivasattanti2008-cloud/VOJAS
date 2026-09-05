/**
 * M8: Data Quality Gate — Validates data quality before producing findings
 *
 * The data quality gate ensures that findings are only generated when
 * there is sufficient, reliable data. If data quality is insufficient,
 * the system returns INSUFFICIENT_DATA rather than forcing a conclusion.
 *
 * ANTI-FABRICATION:
 *   - Never produce a finding when evidence is insufficient
 *   - Always report data quality limitations
 *   - Honor "no evidence" labels honestly
 */

import { PrismaClient } from '@vojas/db';
import type { DataQualityAssessment } from './types.js';
import { ProjectDataSnapshot } from './ruleEngine.js';

export class DataQualityGate {
  private prisma: PrismaClient;

  // Thresholds for data quality
  private readonly MIN_SOURCES = 1;
  private readonly MAX_FRESHNESS_DAYS = 90;
  private readonly MIN_COMPLETENESS_SCORE = 30;
  private readonly MIN_OBSERVATION_QUALITY_SCORE = 40;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Assess data quality for a project
   */
  async assess(projectData: ProjectDataSnapshot): Promise<DataQualityAssessment> {
    const { project, latestSatelliteObs, progressObservations, financialObservations, documents } = projectData;
    const reasons: string[] = [];
    let completenessScore = 0;
    let sourceCount = 0;

    // 1. Check sources available
    if (latestSatelliteObs) sourceCount++;
    if (progressObservations.length > 0) sourceCount++;
    if (financialObservations.length > 0) sourceCount++;
    if (documents.length > 0) sourceCount++;

    const sourcesAvailable = sourceCount >= this.MIN_SOURCES;

    // 2. Check freshness
    const latestDate = this.getLatestDataDate(projectData);
    const freshnessDays = latestDate
      ? Math.floor((Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const isFresh = freshnessDays !== null && freshnessDays <= this.MAX_FRESHNESS_DAYS;

    // 3. Calculate completeness score (0-100)
    completenessScore += project.approvedAmount ? 20 : 0;
    completenessScore += project.spentAmount !== undefined ? 15 : 0;
    completenessScore += project.startDate ? 10 : 0;
    completenessScore += project.expectedEndDate ? 10 : 0;
    completenessScore += project.latitude && project.longitude ? 15 : 0;
    completenessScore += latestSatelliteObs ? 15 : 0;
    completenessScore += progressObservations.length > 0 ? 10 : 0;
    completenessScore += financialObservations.length > 0 ? 5 : 0;

    // 4. Check geometry validity
    const geometryValid = !!(project.latitude && project.longitude &&
      project.latitude >= -90 && project.latitude <= 90 &&
      project.longitude >= -180 && project.longitude <= 180);

    // 5. Assess observation quality
    let observationQuality: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT' = 'INSUFFICIENT';
    let observationQualityScore = 0;

    if (latestSatelliteObs) {
      const cloudOk = latestSatelliteObs.cloudCover < 20;
      const resolutionOk = latestSatelliteObs.resolution <= 10;

      if (cloudOk && resolutionOk) {
        observationQuality = 'HIGH';
        observationQualityScore = 100;
      } else if (latestSatelliteObs.cloudCover < 50 && latestSatelliteObs.resolution <= 20) {
        observationQuality = 'MEDIUM';
        observationQualityScore = 60;
      } else if (latestSatelliteObs.cloudCover < 80) {
        observationQuality = 'LOW';
        observationQualityScore = 30;
      } else {
        observationQuality = 'INSUFFICIENT';
        observationQualityScore = 10;
      }
    }

    // 6. Determine overall pass
    const completenessOk = completenessScore >= this.MIN_COMPLETENESS_SCORE;
    const observationOk = observationQualityScore >= this.MIN_OBSERVATION_QUALITY_SCORE;
    const overallPass = sourcesAvailable && completenessOk && (latestSatelliteObs ? observationOk : true);

    // 7. Build reasons
    if (!sourcesAvailable) {
      reasons.push(`Only ${sourceCount} data source(s) available (minimum: ${this.MIN_SOURCES})`);
    }
    if (!isFresh && freshnessDays !== null) {
      reasons.push(`Data is ${freshnessDays} days old (threshold: ${this.MAX_FRESHNESS_DAYS} days)`);
    }
    if (!completenessOk) {
      reasons.push(`Completeness score: ${completenessScore}% (minimum: ${this.MIN_COMPLETENESS_SCORE}%)`);
    }
    if (latestSatelliteObs && !observationOk) {
      reasons.push(`Observation quality: ${observationQuality} (score: ${observationQualityScore}%)`);
    }
    if (!geometryValid) {
      reasons.push('Project coordinates are missing or invalid');
    }

    return {
      projectId: project.id,
      sourcesAvailable,
      sourceCount,
      freshnessDays,
      completenessScore,
      geometryValid,
      observationQuality,
      overallPass,
      reasons,
    };
  }

  /**
   * Gate check — returns true if analysis should proceed
   */
  async shouldProceed(assessment: DataQualityAssessment): Promise<boolean> {
    return assessment.overallPass;
  }

  /**
   * Get quality-adjusted confidence
   * Even if data is available, quality affects confidence
   */
  adjustConfidenceForQuality(
    baseConfidence: 'LOW' | 'MEDIUM' | 'HIGH',
    assessment: DataQualityAssessment
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (assessment.observationQuality === 'INSUFFICIENT') return 'LOW';
    if (assessment.observationQuality === 'LOW') {
      return baseConfidence === 'HIGH' ? 'MEDIUM' : 'LOW';
    }
    if (assessment.observationQuality === 'MEDIUM') {
      return baseConfidence;
    }
    return baseConfidence;
  }

  private getLatestDataDate(data: ProjectDataSnapshot): Date | null {
    const dates: Date[] = [];

    if (data.latestSatelliteObs) {
      dates.push(data.latestSatelliteObs.observationDate);
    }

    for (const obs of data.progressObservations) {
      dates.push(obs.reportDate);
    }

    for (const fin of data.financialObservations) {
      dates.push(fin.date);
    }

    if (dates.length === 0) return null;

    return dates.sort((a, b) => b.getTime() - a.getTime())[0];
  }
}
