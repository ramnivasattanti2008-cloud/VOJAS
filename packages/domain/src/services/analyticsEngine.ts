/**
 * M16: Analytics Engine
 *
 * Core analytics calculations for project, sector, district, state, and national levels.
 * All calculations are evidence-based, uncertainty-aware, and respect data quality.
 *
 * Prediction ≠ Proof. Every insight is probabilistic and requires human verification.
 */

import type { PrismaClient, ProjectStatus } from '@vojas/db';

// ── Types ────────────────────────────────────────────────────────────────────

export type EntityType = 'PROJECT' | 'DISTRICT' | 'STATE' | 'SECTOR' | 'NATIONAL' | 'CONTRACTOR' | 'CONSTITUENCY';
export type MetricType = 'RISK_SCORE' | 'FINANCIAL_UTILIZATION' | 'PROGRESS' | 'DELAY_DAYS' | 'ANOMALY_COUNT' | 'REPORT_COUNT' | 'SATELLITE_COVERAGE' | 'DOCUMENT_COMPLETENESS';
export type Period = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type TrendDirection = 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE' | 'INSUFFICIENT_DATA';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
export type DataQualityLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export interface ProjectAnalytics {
  projectId: string;
  projectName: string;
  sector: string;
  status: ProjectStatus;
  sanctionedAmount: number;
  spentAmount: number;
  utilizationPct: number;
  reportedProgressPct: number;
  riskScore: number;
  riskLevel: string;
  openFindingsCount: number;
  unresolvedFindingsCount: number;
  plannedEndDate: Date | null;
  elapsedDays: number;
  delayDays: number;
  observationCount: number;
  latestObservationDate: Date | null;
  latestChangeClassification: string | null;
  satelliteConsistent: boolean;
  citizenReportCount: number;
  openCitizenReports: number;
  documentCount: number;
  documentVerifiedCount: number;
  dataQuality: DataQualityLevel;
  coverage: Record<string, number>;
  computedAt: Date;
  /** After this timestamp the analytics should be treated as stale */
  staleAfter: Date;
  /** Days since the last data update that feeds this analysis */
  dataFreshnessDays: number;
  modelVersion: string;
}

export interface TrendResult {
  direction: TrendDirection;
  changePct: number | null;
  changeAbs: number | null;
  volatility: number | null;
  dataPoints: number;
  confidence: ConfidenceLevel;
  trend: 'RISING' | 'STABLE' | 'DECLINING' | 'VOLATILE' | 'INSUFFICIENT_DATA';
}

export interface AggregatedMetrics {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  delayedProjects: number;
  totalSanctioned: number;
  totalSpent: number;
  avgUtilization: number;
  avgRiskScore: number;
  highRiskCount: number;
  criticalRiskCount: number;
  openFindings: number;
  openAnomalyCount: number;
  anomalyDensity: number;
  citizenReportCount: number;
  riskTrend: TrendDirection;
  utilizationTrend: TrendDirection;
  delayTrend: TrendDirection;
  dataQuality: DataQualityLevel;
  satelliteCoverage: number;
  computedAt: Date;
  staleAfter: Date;
  dataFreshnessDays: number;
}

export interface BenchmarkComparison {
  projectId: string;
  metricType: MetricType;
  value: number;
  peerMedian: number;
  peerP10: number;
  peerP90: number;
  percentile: number;
  band: 'BELOW_PEER' | 'WITHIN_PEER' | 'ABOVE_PEER';
  confidence: ConfidenceLevel;
}

export interface CrossSignalCorrelation {
  signals: string[];
  description: string;
  correlation: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidence: string[];
}

// ── Data Quality ─────────────────────────────────────────────────────────────

export function assessDataQuality(coverage: Record<string, number>): DataQualityLevel {
  const entries = Object.entries(coverage);
  if (entries.length === 0) return 'UNKNOWN';
  const avg = entries.reduce((s, [, v]) => s + v, 0) / entries.length;
  if (avg >= 0.8) return 'HIGH';
  if (avg >= 0.5) return 'MEDIUM';
  if (avg >= 0.2) return 'LOW';
  return 'UNKNOWN';
}

// ── Trend Calculation ────────────────────────────────────────────────────────

export function calculateTrend(values: number[], dates: Date[]): TrendResult {
  if (values.length < 3) {
    return {
      direction: 'INSUFFICIENT_DATA',
      changePct: null,
      changeAbs: null,
      volatility: null,
      dataPoints: values.length,
      confidence: 'INSUFFICIENT',
      trend: 'INSUFFICIENT_DATA',
    };
  }

  const n = values.length;
  const xs = values.map((_, i) => i);
  const xMean = xs.reduce((s, x) => s + x, 0) / n;
  const yMean = values.reduce((s, y) => s + y, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xs[i] - xMean) * (values[i] - yMean);
    denominator += (xs[i] - xMean) ** 2;
  }
  const slope = denominator !== 0 ? numerator / denominator : 0;

  const diffs = [];
  for (let i = 1; i < n; i++) {
    diffs.push(Math.abs(values[i] - values[i - 1]));
  }
  const diffMean = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  const diffStd = Math.sqrt(diffs.reduce((s, d) => s + (d - diffMean) ** 2, 0) / diffs.length);
  const volatility = diffMean > 0 ? diffStd / diffMean : 0;

  const changeAbs = values[n - 1] - values[0];
  const changePct = values[0] !== 0 ? (changeAbs / Math.abs(values[0])) * 100 : null;

  let trend: TrendResult['trend'];
  let direction: TrendResult['direction'];

  const slopeSignificance = Math.abs(slope) / (diffStd / Math.sqrt(n) + 0.001);
  if (slopeSignificance < 1.5) {
    trend = 'STABLE';
    direction = 'STABLE';
  } else if (slope > 0) {
    trend = 'RISING';
    direction = 'INCREASING';
  } else {
    trend = 'DECLINING';
    direction = 'DECREASING';
  }

  if (volatility > 1.5) {
    trend = 'VOLATILE';
    direction = 'VOLATILE';
  }

  let confidence: ConfidenceLevel = 'LOW';
  if (n >= 10 && volatility < 0.5) confidence = 'HIGH';
  else if (n >= 5 && volatility < 1.0) confidence = 'MEDIUM';

  return { direction, changePct, changeAbs, volatility, dataPoints: n, confidence, trend };
}

// ── Rolling Averages ─────────────────────────────────────────────────────────

export function rollingAverage(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    const slice = values.slice(i - window + 1, i + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

// ── Percentile ───────────────────────────────────────────────────────────────

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

export function benchmarkPercentile(value: number, sorted: number[]): number {
  if (sorted.length === 0) return 50;
  const countBelow = sorted.filter(v => v < value).length;
  return (countBelow / sorted.length) * 100;
}

// ── Risk Score Color ─────────────────────────────────────────────────────────

export function riskScoreColor(score: number): string {
  if (score >= 70) return '#ef4444';
  if (score >= 50) return '#f97316';
  if (score >= 30) return '#eab308';
  return '#22c55e';
}

// ── NOT_AVAILABLE ────────────────────────────────────────────────────────────

export function notAvailable<T>(reason: string): T {
  return { _notAvailable: true, reason } as unknown as T;
}

export function isNotAvailable(value: unknown): { available: false; reason: string } | { available: true; value: unknown } {
  if (value && typeof value === 'object' && '_notAvailable' in (value as Record<string, unknown>)) {
    return { available: false, reason: (value as Record<string, string>).reason };
  }
  return { available: true, value };
}

// ── Analytics Engine ─────────────────────────────────────────────────────────

export class AnalyticsEngine {
  constructor(private readonly prisma: PrismaClient) {}

  async calculateProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectRisk: true,
        riskFindings: { where: { status: { not: 'RESOLVED' } } },
        satelliteObservations: {
          orderBy: { observationDate: 'desc' },
          take: 10,
        },
        changeAnalyses: {
          orderBy: { analysisDate: 'desc' },
          take: 5,
        },
        progressObservations: {
          orderBy: { reportDate: 'desc' },
          take: 10,
        },
        reports: { where: { status: { not: 'RESOLVED' } } },
        documents: true,
      },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const now = new Date();
    const plannedEnd = project.expectedEndDate;
    const startDate = project.startDate ?? project.createdAt;
    const elapsedDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const delayDays = plannedEnd
      ? Math.max(0, Math.floor((now.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const latestProgress = project.progressObservations[0];
    const reportedProgressPct = latestProgress?.reportedProgress ?? 0;

    const latestObs = project.satelliteObservations[0];
    const latestChangeClass = project.changeAnalyses[0]?.changeClassification ?? null;

    const satelliteConsistent = latestChangeClass !== null && (
      (reportedProgressPct >= 80 && ['HIGH_OBSERVABLE_CHANGE', 'MODERATE_OBSERVABLE_CHANGE'].includes(latestChangeClass)) ||
      (reportedProgressPct < 20 && latestChangeClass === 'NO_OBSERVABLE_CHANGE') ||
      reportedProgressPct === 0
    );

    const coverage: Record<string, number> = {
      financial: project.approvedAmount > 0 ? 1 : 0,
      satellite: project.satelliteObservations.length > 0 ? Math.min(1, project.satelliteObservations.length / 5) : 0,
      progress: project.progressObservations.length > 0 ? Math.min(1, project.progressObservations.length / 3) : 0,
      documents: project.documents.length > 0 ? Math.min(1, project.documents.length / 5) : 0,
      risk: project.projectRisk ? 1 : 0,
    };

    const dataQuality = assessDataQuality(coverage);

    // Staleness: analytics become stale after 24h for active projects, 7d for completed
    const staleHours = ['COMPLETED', 'VERIFIED'].includes(project.status) ? 168 : 24;
    const computedAt = new Date();
    const staleAfter = new Date(computedAt.getTime() + staleHours * 60 * 60 * 1000);

    // Data freshness: how old is the latest contributing data?
    const latestDate = latestObs?.observationDate ?? latestProgress?.reportDate ?? project.updatedAt;
    const dataFreshnessDays = Math.floor((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      projectId: project.id,
      projectName: project.name,
      sector: project.sector,
      status: project.status,
      sanctionedAmount: project.approvedAmount,
      spentAmount: project.spentAmount,
      utilizationPct: project.approvedAmount > 0 ? Math.round((project.spentAmount / project.approvedAmount) * 100) : 0,
      reportedProgressPct,
      riskScore: project.projectRisk?.riskScore ?? 0,
      riskLevel: project.projectRisk?.riskLevel ?? 'LOW',
      openFindingsCount: project.riskFindings.length,
      unresolvedFindingsCount: project.riskFindings.filter(f => f.status !== 'RESOLVED').length,
      plannedEndDate: plannedEnd,
      elapsedDays,
      delayDays,
      observationCount: project.satelliteObservations.length,
      latestObservationDate: latestObs?.observationDate ?? null,
      latestChangeClassification: latestChangeClass,
      satelliteConsistent,
      citizenReportCount: project.reports.length,
      openCitizenReports: project.reports.length,
      documentCount: project.documents.length,
      documentVerifiedCount: project.documents.filter(d => d.status === 'VERIFIED').length,
      dataQuality,
      coverage,
      computedAt,
      staleAfter,
      dataFreshnessDays,
      modelVersion: 'analytics-v1.0',
    };
  }

  async calculateAggregatedMetrics(
    entityType: EntityType,
    entityId: string,
    options?: { state?: string; sector?: string; districtId?: string }
  ): Promise<AggregatedMetrics> {
    const where: Record<string, unknown> = {};
    if (entityType === 'STATE' && entityId) where.state = entityId;
    if (entityType === 'DISTRICT' && entityId) where.districtId = entityId;
    if (entityType === 'SECTOR' && entityId) where.sector = entityId;
    if (options?.state) where.state = options.state;
    if (options?.sector) where.sector = options.sector;
    if (options?.districtId) where.districtId = options.districtId;

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        projectRisk: true,
        riskFindings: { where: { status: { notIn: ['RESOLVED', 'DISMISSED'] } } },
        reports: { where: { status: { notIn: ['RESOLVED', 'DISMISSED'] } } },
        satelliteObservations: { select: { id: true, observationDate: true } },
      },
    });

    if (projects.length === 0) {
      const computedAt = new Date();
      return {
        entityType,
        entityId,
        entityName: entityId,
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        delayedProjects: 0,
        totalSanctioned: 0,
        totalSpent: 0,
        avgUtilization: 0,
        avgRiskScore: 0,
        highRiskCount: 0,
        criticalRiskCount: 0,
        openFindings: 0,
        openAnomalyCount: 0,
        anomalyDensity: 0,
        citizenReportCount: 0,
        riskTrend: 'INSUFFICIENT_DATA',
        utilizationTrend: 'INSUFFICIENT_DATA',
        delayTrend: 'INSUFFICIENT_DATA',
        dataQuality: 'UNKNOWN',
        satelliteCoverage: 0,
        computedAt,
        staleAfter: new Date(computedAt.getTime() + 24 * 60 * 60 * 1000),
        dataFreshnessDays: 0,
      };
    }

    const totalSanctioned = projects.reduce((s, p) => s + p.approvedAmount, 0);
    const totalSpent = projects.reduce((s, p) => s + p.spentAmount, 0);
    const avgUtilization = totalSanctioned > 0 ? Math.round((totalSpent / totalSanctioned) * 100) : 0;

    const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS').length;
    const completedProjects = projects.filter(p => ['COMPLETED', 'VERIFIED'].includes(p.status)).length;
    const delayedProjects = projects.filter(p => {
      const plannedEnd = p.expectedEndDate;
      if (!plannedEnd) return false;
      return plannedEnd < new Date() && p.status === 'IN_PROGRESS';
    }).length;

    const riskScores = projects.map(p => p.projectRisk?.riskScore ?? 0);
    const avgRiskScore = riskScores.length > 0 ? Math.round(riskScores.reduce((s, r) => s + r, 0) / riskScores.length) : 0;
    const highRiskCount = riskScores.filter(r => r >= 50 && r < 70).length;
    const criticalRiskCount = riskScores.filter(r => r >= 70).length;

    const totalFindings = projects.reduce((s, p) => s + p.riskFindings.length, 0);
    const totalReports = projects.reduce((s, p) => s + p.reports.length, 0);

    const projectsWithSatellite = projects.filter(p => p.satelliteObservations.length > 0).length;
    const satelliteCoverage = projects.length > 0 ? Math.round((projectsWithSatellite / projects.length) * 100) : 0;

    const coverage: Record<string, number> = {
      satellite: satelliteCoverage / 100,
      risk: avgRiskScore > 0 ? 1 : 0,
    };
    const dataQuality = assessDataQuality(coverage);

    // Staleness: aggregated metrics are computed fresh on each request, so 24h window is fine
    const computedAt = new Date();
    const staleAfter = new Date(computedAt.getTime() + 24 * 60 * 60 * 1000);

    // Freshness: max(updatedAt) across all projects
    const dataFreshnessDays = projects.length > 0
      ? Math.floor((computedAt.getTime() - Math.max(...projects.map(p => p.updatedAt.getTime()))) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      entityType,
      entityId,
      entityName: entityId,
      totalProjects: projects.length,
      activeProjects,
      completedProjects,
      delayedProjects,
      totalSanctioned,
      totalSpent,
      avgUtilization,
      avgRiskScore,
      highRiskCount,
      criticalRiskCount,
      openFindings: totalFindings,
      openAnomalyCount: totalFindings,
      anomalyDensity: projects.length > 0 ? Math.round((totalFindings / projects.length) * 100) / 100 : 0,
      citizenReportCount: totalReports,
      riskTrend: 'STABLE',
      utilizationTrend: 'STABLE',
      delayTrend: 'STABLE',
      dataQuality,
      satelliteCoverage,
      computedAt,
      staleAfter,
      dataFreshnessDays,
    };
  }

  async calculateBenchmark(
    metricType: MetricType,
    peerCriteria: Record<string, unknown>
  ): Promise<{ min: number; p10: number; median: number; p90: number; max: number; mean: number; count: number } | null> {
    const projects = await this.prisma.project.findMany({
      where: peerCriteria,
      include: { projectRisk: true },
    });

    const values: number[] = [];
    for (const p of projects) {
      switch (metricType) {
        case 'RISK_SCORE':
          if (p.projectRisk) values.push(p.projectRisk.riskScore);
          break;
        case 'FINANCIAL_UTILIZATION':
          if (p.approvedAmount > 0) values.push(Math.round((p.spentAmount / p.approvedAmount) * 100));
          break;
        case 'DELAY_DAYS': {
          const plannedEnd = p.expectedEndDate;
          if (plannedEnd && p.status === 'IN_PROGRESS') {
            const delay = Math.max(0, Math.floor((new Date().getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24)));
            values.push(delay);
          }
          break;
        }
        case 'ANOMALY_COUNT': {
          const count = await this.prisma.riskFinding.count({
            where: { projectId: p.id, status: { notIn: ['RESOLVED', 'DISMISSED'] } },
          });
          values.push(count);
          break;
        }
      }
    }

    if (values.length < 3) return null;

    return {
      min: percentile(values, 0),
      p10: percentile(values, 10),
      median: percentile(values, 50),
      p90: percentile(values, 90),
      max: percentile(values, 100),
      mean: values.reduce((s, v) => s + v, 0) / values.length,
      count: values.length,
    };
  }

  async detectCrossProjectPatterns(options: {
    minProjects?: number;
    state?: string;
    sector?: string;
  }): Promise<Array<{
    patternType: string;
    description: string;
    affectedProjects: number;
    severity: string;
    evidence: string[];
    confidence: ConfidenceLevel;
  }>> {
    const patterns: Array<{
      patternType: string;
      description: string;
      affectedProjects: number;
      severity: string;
      evidence: string[];
      confidence: ConfidenceLevel;
    }> = [];

    const where: Record<string, unknown> = {};
    if (options?.state) where.state = options.state;
    if (options?.sector) where.sector = options.sector;

    const minProjects = options?.minProjects ?? 3;

    const delayedProjects = await this.prisma.project.count({
      where: {
        ...where,
        status: 'IN_PROGRESS',
        expectedEndDate: { lt: new Date() },
      },
    });
    if (delayedProjects >= minProjects) {
      patterns.push({
        patternType: 'RECURRING_DELAY',
        description: `${delayedProjects} projects are past their planned completion date`,
        affectedProjects: delayedProjects,
        severity: delayedProjects >= 10 ? 'HIGH' : 'MEDIUM',
        evidence: ['Projects past expected completion date'],
        confidence: 'HIGH',
      });
    }

    const projects = await this.prisma.project.findMany({
      where: { ...where, status: 'IN_PROGRESS' },
      include: {
        progressObservations: { orderBy: { reportDate: 'desc' }, take: 1 },
        changeAnalyses: { orderBy: { analysisDate: 'desc' }, take: 1 },
      },
    });

    const mismatchProjects = projects.filter(p => {
      const prog = p.progressObservations[0];
      const change = p.changeAnalyses[0];
      if (!prog || !change) return false;
      return prog.reportedProgress > 60 && ['NO_OBSERVABLE_CHANGE', 'LOW_OBSERVABLE_CHANGE'].includes(change.changeClassification);
    });

    if (mismatchProjects.length >= minProjects) {
      patterns.push({
        patternType: 'PROGRESS_SATELLITE_MISMATCH',
        description: `${mismatchProjects.length} projects show high reported progress with limited observable satellite change`,
        affectedProjects: mismatchProjects.length,
        severity: 'HIGH',
        evidence: mismatchProjects.slice(0, 3).map(p => `Project ${p.name}: ${p.progressObservations[0].reportedProgress}% reported, ${p.changeAnalyses[0].changeClassification}`),
        confidence: 'MEDIUM',
      });
    }

    const financialAnomalies = await this.prisma.riskFinding.groupBy({
      by: ['type'],
      where: {
        project: where,
        type: 'COST_ANOMALY',
        status: { notIn: ['RESOLVED', 'DISMISSED'] },
      },
      _count: true,
    });

    if (financialAnomalies.length > 0 && financialAnomalies[0]._count >= minProjects) {
      patterns.push({
        patternType: 'FINANCIAL_ANOMALY_PATTERN',
        description: `Multiple projects show financial anomalies (${financialAnomalies[0]._count} open findings)`,
        affectedProjects: financialAnomalies[0]._count,
        severity: 'HIGH',
        evidence: ['Cost anomaly findings across projects'],
        confidence: 'MEDIUM',
      });
    }

    return patterns;
  }

  async calculateHotspot(
    locationType: string,
    locationId: string,
    locationName: string,
    metric: string
  ): Promise<{ intensity: number; severity: string; projectCount: number; avgRiskScore: number; confidence: ConfidenceLevel }> {
    const where: Record<string, unknown> = {};
    if (locationType === 'DISTRICT') where.districtId = locationId;
    if (locationType === 'STATE') where.state = locationId;
    if (locationType === 'CONSTITUENCY') where.constituencyId = locationId;

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        projectRisk: true,
        riskFindings: { where: { status: { notIn: ['RESOLVED', 'DISMISSED'] } } },
      },
    });

    if (projects.length === 0) {
      return { intensity: 0, severity: 'LOW', projectCount: 0, avgRiskScore: 0, confidence: 'INSUFFICIENT' };
    }

    let intensity = 0;
    switch (metric) {
      case 'RISK': {
        const avgRisk = projects.reduce((s, p) => s + (p.projectRisk?.riskScore ?? 0), 0) / projects.length;
        const highRisk = projects.filter(p => (p.projectRisk?.riskScore ?? 0) >= 50).length;
        intensity = Math.round(avgRisk + highRisk * 10);
        break;
      }
      case 'DELAY': {
        const delayed = projects.filter(p => p.expectedEndDate && p.expectedEndDate < new Date() && p.status === 'IN_PROGRESS').length;
        intensity = Math.round((delayed / projects.length) * 100);
        break;
      }
      case 'ANOMALY': {
        const totalFindings = projects.reduce((s, p) => s + p.riskFindings.length, 0);
        intensity = Math.min(100, totalFindings * 5);
        break;
      }
      default:
        intensity = 0;
    }

    const avgRiskScore = projects.reduce((s, p) => s + (p.projectRisk?.riskScore ?? 0), 0) / projects.length;
    const severity = intensity >= 70 ? 'CRITICAL' : intensity >= 50 ? 'HIGH' : intensity >= 30 ? 'MEDIUM' : 'LOW';
    const confidence: ConfidenceLevel = projects.length >= 10 ? 'HIGH' : projects.length >= 5 ? 'MEDIUM' : 'LOW';

    return { intensity: Math.min(100, intensity), severity, projectCount: projects.length, avgRiskScore: Math.round(avgRiskScore), confidence };
  }
}
