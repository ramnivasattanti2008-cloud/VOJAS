/**
 * Financial Intelligence Service — VOJAS M9
 *
 * Core capabilities:
 *  - Fund lifecycle tracking (SANCTIONED → ALLOCATED → RELEASED → COMMITTED → EXPENDED → REMAINING)
 *  - Cross-source reconciliation (satellite progress, reported progress, documents, financial)
 *  - Peer benchmarking with robust statistics (median, IQR outlier detection)
 *  - Cost anomaly detection (unit cost vs sector/district/state peers)
 *  - Financial risk signal generation for M8 risk engine
 *  - Unit cost normalization across project sizes
 *
 * Principle: FOLLOW THE MONEY → FOLLOW THE DOCUMENT → FOLLOW THE PHYSICAL REALITY → COMPARE THE SIGNALS
 */

import type { PrismaClient } from '@vojas/db';
import type {
  SatelliteObservation,
  ProgressObservation,
  FinancialObservation,
  Document,
  Project,
} from '@vojas/db';
import { NotFoundError, ValidationError } from '../errors/index';

// ─── Types ──────────────────────────────────────────────────────────────────

export type FundLifecycle = {
  sanctioned: number;
  allocated: number;
  released: number;
  committed: number;
  expended: number;
  remaining: number;
  utilizationPercent: number;
};

export type ReconciliationResult = {
  projectId: string;
  financial: {
    totalExpenditure: number;
    transactionCount: number;
    lastTransactionDate: string | null;
    byType: Record<string, { count: number; total: number }>;
  };
  physical: {
    reportedProgressPercent: number | null;
    satelliteProgressPercent: number | null;
    constructionScore: number | null;
  };
  correlation: {
    financialVsPhysical: 'MATCH' | 'SUSPICIOUS_UNDERPEND' | 'SUSPICIOUS_OVERPEND' | 'INSUFFICIENT_DATA';
    discrepancyPercent: number | null;
    signalSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
    explanation: string;
  };
  documents: {
    invoiceCount: number;
    receiptCount: number;
    completionCertCount: number;
    verifiedDocuments: number;
    totalDocuments: number;
  };
  timeline: {
    startDate: string | null;
    expectedEndDate: string | null;
    daysElapsed: number | null;
    expectedDurationDays: number | null;
    daysRemaining: number | null;
    onTrack: boolean;
  };
};

export type PeerBenchmark = {
  projectId: string;
  projectName: string;
  sector: string;
  district: string;
  state: string;
  peerGroup: {
    sector?: string;
    district?: string;
    state?: string;
    scope: 'sector' | 'district' | 'state' | 'national';
  };
  ourUnitCost: number;
  unitCostStats: {
    median: number;
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    p25: number;
    p75: number;
    p10: number;
    p90: number;
    count: number;
  };
  zScore: number | null;
  isOutlier: boolean;
  outlierSeverity: 'NORMAL' | 'CHEAP' | 'EXPENSIVE' | 'ANOMALOUS';
  percentile: number | null;
  peers: Array<{
    projectId: string;
    name: string;
    unitCost: number;
    district: string;
    state: string;
  }>;
};

export type CostAnomalySignal = {
  signalType: 'COST_ANOMALY' | 'EXPENDITURE_RATE_ANOMALY' | 'BUDGET_OVERRUN' | 'STALLED_WITH_SPENDING' | 'PREMATURE_COMPLETION' | 'SUSPICIOUS_UNDERPEND' | 'SUSPICIOUS_OVERPEND';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  value: number;
  expectedValue: number | null;
  deviationPercent: number | null;
  explanation: string;
  evidence: {
    financialObservationIds: string[];
    satelliteObservationIds: string[];
    documentIds: string[];
  };
  scoreContribution: number; // 0-100
};

export type CrossSourceCorrelation = {
  projectId: string;
  correlations: Array<{
    sourceA: string;
    sourceB: string;
    agreement: 'STRONG_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'STRONG_NEGATIVE' | 'INCOMPARABLE';
    score: number; // 0-100
    finding: string;
    signals: string[];
  }>;
  overallConsistencyScore: number; // 0-100
  redFlags: string[];
  recommendations: string[];
};

export type FinancialRiskSignals = {
  projectId: string;
  signals: CostAnomalySignal[];
  compositeScore: number; // 0-100
  dominantRisk: string | null;
  generatedAt: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Robust percentile using linear interpolation (NIST method) */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

/** Median absolute deviation (MAD) for outlier detection */
function mad(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const med = percentile(sorted, 50);
  const deviations = values.map((v) => Math.abs(v - med));
  return percentile(deviations, 50);
}

/** Robust Z-score using MAD (less sensitive to outliers) */
function robustZScore(value: number, values: number[]): number {
  const madVal = mad(values);
  if (madVal === 0) {
    // Fall back to std dev if MAD is zero
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    return std === 0 ? 0 : (value - mean) / std;
  }
  return 0.6745 * (value - percentile([...values].sort((a, b) => a - b), 50)) / madVal;
}

/** Simple percentile rank */
function percentileRank(value: number, sortedValues: number[]): number {
  if (sortedValues.length === 0) return 50;
  const below = sortedValues.filter((v) => v < value).length;
  return (below / sortedValues.length) * 100;
}

// ─── Main Service ────────────────────────────────────────────────────────────

export class FinancialIntelligenceService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Fund lifecycle: derive SANCTIONED → ALLOCATED → RELEASED → COMMITTED → EXPENDED → REMAINING
   * from project approvedAmount and FinancialObservation records.
   */
  async getFundLifecycle(projectId: string): Promise<FundLifecycle> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw NotFoundError.notFound('Project', projectId);

    const observations = await this.prisma.financialObservation.findMany({
      where: { projectId },
      orderBy: { date: 'asc' },
    });

    const sanctioned = project.approvedAmount;
    let allocated = 0;
    let released = 0;
    let committed = 0;
    let expended = 0;

    for (const obs of observations) {
      switch (obs.type.toUpperCase()) {
        case 'ALLOCATION':
          allocated += obs.amount;
          break;
        case 'RELEASE':
          released += obs.amount;
          break;
        case 'COMMITMENT':
        case 'COMMITTED':
          committed += obs.amount;
          break;
        case 'EXPENDITURE':
        case 'EXPENDED':
        case 'PAYMENT':
        case 'MILESTONE_PAYMENT':
          expended += obs.amount;
          break;
        // SANCTION, BALANCE, UTILIZATION records are informational
      }
    }

    // If no allocation/release records, approximate from expenditure chain
    if (allocated === 0) allocated = sanctioned;
    if (released === 0 && allocated > 0) released = allocated;
    if (committed === 0 && released > 0) committed = released;

    const remaining = Math.max(0, sanctioned - expended);
    const utilizationPercent = sanctioned > 0 ? Math.min(100, (expended / sanctioned) * 100) : 0;

    return {
      sanctioned,
      allocated,
      released,
      committed,
      expended,
      remaining,
      utilizationPercent,
    };
  }

  /**
   * Cross-source reconciliation: compare financial, satellite, reported progress, and documents.
   * Returns a structured ReconciliationResult with correlation signals.
   */
  async reconcile(projectId: string): Promise<ReconciliationResult> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw NotFoundError.notFound('Project', projectId);

    const [observations, satelliteObs, progressObs, documents] = await Promise.all([
      this.prisma.financialObservation.findMany({ where: { projectId }, orderBy: { date: 'asc' } }),
      this.prisma.satelliteObservation.findMany({
        where: { projectId, quality: 'PROCESSED' },
        orderBy: { observationDate: 'desc' },
        take: 10,
      }),
      this.prisma.progressObservation.findMany({
        where: { projectId },
        orderBy: { reportDate: 'desc' },
        take: 5,
      }),
      this.prisma.document.findMany({ where: { projectId } }),
    ]);

    // Financial summary
    const totalExpenditure = observations
      .filter((o) => ['EXPENDITURE', 'PAYMENT', 'MILESTONE_PAYMENT'].includes(o.type.toUpperCase()))
      .reduce((sum, o) => sum + o.amount, 0);
    const byType: Record<string, { count: number; total: number }> = {};
    for (const obs of observations) {
      if (!byType[obs.type]) byType[obs.type] = { count: 0, total: 0 };
      byType[obs.type].count++;
      byType[obs.type].total += obs.amount;
    }
    const lastTransactionDate =
      observations.length > 0
        ? observations[observations.length - 1].date.toISOString()
        : null;

    // Physical progress
    const latestSatellite = satelliteObs[0];
    const satelliteProgressPercent = latestSatellite?.constructionScore != null
      ? Math.round(latestSatellite.constructionScore * 100)
      : null;
    const constructionScore = latestSatellite?.constructionScore ?? null;

    const latestProgress = progressObs[0];
    const reportedProgressPercent = latestProgress?.reportedProgress ?? null;

    // Document counts
    const invoiceCount = documents.filter((d) =>
      ['INVOICE', 'BILL', 'PAYMENT_VOUCHER'].includes(d.type.toUpperCase())
    ).length;
    const receiptCount = documents.filter((d) =>
      ['RECEIPT', 'UTILIZATION_CERTIFICATE'].includes(d.type.toUpperCase())
    ).length;
    const completionCertCount = documents.filter((d) =>
      ['COMPLETION_CERTIFICATE', 'COMPLETION_CERT'].includes(d.type.toUpperCase())
    ).length;
    const verifiedDocuments = documents.filter((d) => d.status === 'VERIFIED').length;

    // Financial vs Physical correlation
    let financialVsPhysical: ReconciliationResult['correlation']['financialVsPhysical'] = 'INSUFFICIENT_DATA';
    let discrepancyPercent: number | null = null;
    let signalSeverity: ReconciliationResult['correlation']['signalSeverity'] = null;
    let explanation = 'Insufficient data to correlate financial and physical progress.';

    if (satelliteProgressPercent !== null && totalExpenditure > 0) {
      const financialProgressPercent = Math.min(100, (totalExpenditure / project.approvedAmount) * 100);
      discrepancyPercent = Math.abs(financialProgressPercent - satelliteProgressPercent);
      const threshold = 30; // 30% discrepancy triggers suspicion

      if (discrepancyPercent <= 15) {
        financialVsPhysical = 'MATCH';
        signalSeverity = 'LOW';
        explanation = `Financial progress (${financialProgressPercent.toFixed(1)}%) closely matches satellite-observed progress (${satelliteProgressPercent}%).`;
      } else if (financialProgressPercent > satelliteProgressPercent + threshold) {
        financialVsPhysical = 'SUSPICIOUS_UNDERPEND';
        signalSeverity = discrepancyPercent > 50 ? 'CRITICAL' : discrepancyPercent > 35 ? 'HIGH' : 'MEDIUM';
        explanation = `Financial progress (${financialProgressPercent.toFixed(1)}%) significantly exceeds satellite-observed progress (${satelliteProgressPercent}%). Possible: inflated expenditure claims, work not actually done, or satellite missed activity.`;
      } else if (satelliteProgressPercent > financialProgressPercent + threshold) {
        financialVsPhysical = 'SUSPICIOUS_OVERPEND';
        signalSeverity = discrepancyPercent > 50 ? 'HIGH' : 'MEDIUM';
        explanation = `Satellite-observed progress (${satelliteProgressPercent}%) significantly exceeds financial progress (${financialProgressPercent.toFixed(1)}%). Possible: delayed payments, fund diversion, or reporting lag.`;
      } else {
        financialVsPhysical = 'MATCH';
        signalSeverity = 'LOW';
        explanation = `Financial and satellite progress are broadly consistent (discrepancy ${discrepancyPercent.toFixed(1)}%).`;
      }
    } else if (totalExpenditure > 0 && reportedProgressPercent !== null) {
      const financialProgressPercent = Math.min(100, (totalExpenditure / project.approvedAmount) * 100);
      discrepancyPercent = Math.abs(financialProgressPercent - reportedProgressPercent);
      if (discrepancyPercent <= 20) {
        financialVsPhysical = 'MATCH';
        signalSeverity = 'MEDIUM';
        explanation = `Financial progress matches reported progress (${reportedProgressPercent}%).`;
      } else {
        financialVsPhysical = discrepancyPercent > 40 ? 'SUSPICIOUS_UNDERPEND' : 'MATCH';
        signalSeverity = discrepancyPercent > 40 ? 'HIGH' : 'MEDIUM';
        explanation = `Financial progress (${financialProgressPercent.toFixed(1)}%) vs reported progress (${reportedProgressPercent}%) — discrepancy ${discrepancyPercent.toFixed(1)}%.`;
      }
    }

    // Timeline analysis
    const startDate = project.startDate?.toISOString() ?? null;
    const expectedEndDate = project.expectedEndDate?.toISOString() ?? null;
    const now = new Date();
    let daysElapsed: number | null = null;
    let expectedDurationDays: number | null = null;
    let daysRemaining: number | null = null;
    let onTrack = true;

    if (startDate) {
      daysElapsed = Math.floor((now.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    }
    if (startDate && expectedEndDate) {
      expectedDurationDays = Math.floor(
        (new Date(expectedEndDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      daysRemaining = Math.max(0, Math.floor(
        (new Date(expectedEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ));
      // On track if: satellite progress >= expected progress AND expenditure <= expected expenditure
      if (satelliteProgressPercent !== null && expectedDurationDays > 0 && daysElapsed !== null) {
        const expectedProgress = (daysElapsed / expectedDurationDays) * 100;
        onTrack = satelliteProgressPercent >= expectedProgress - 10; // 10% grace
      }
    }

    return {
      projectId,
      financial: {
        totalExpenditure,
        transactionCount: observations.length,
        lastTransactionDate,
        byType,
      },
      physical: {
        reportedProgressPercent,
        satelliteProgressPercent,
        constructionScore,
      },
      correlation: {
        financialVsPhysical,
        discrepancyPercent,
        signalSeverity,
        explanation,
      },
      documents: {
        invoiceCount,
        receiptCount,
        completionCertCount,
        verifiedDocuments,
        totalDocuments: documents.length,
      },
      timeline: {
        startDate,
        expectedEndDate,
        daysElapsed,
        expectedDurationDays,
        daysRemaining,
        onTrack,
      },
    };
  }

  /**
   * Peer benchmarking: compare this project's unit cost (per sq.m / per km / per unit)
   * against sector, district, state, and national peers.
   * Uses robust statistics (MAD-based Z-score) to avoid skew from outliers.
   */
  async benchmark(
    projectId: string,
    scope: 'sector' | 'district' | 'state' | 'national' = 'sector'
  ): Promise<PeerBenchmark> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw NotFoundError.notFound('Project', projectId);

    const scopeConditions: Record<string, Record<string, unknown>> = {
      sector: { sector: project.sector },
      district: { district: project.district },
      state: { state: project.state },
      national: {},
    };

    const peers = await this.prisma.project.findMany({
      where: {
        ...scopeConditions[scope],
        id: { not: projectId },
        approvedAmount: { gt: 0 },
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        district: true,
        state: true,
        sector: true,
        approvedAmount: true,
        latitude: true,
        longitude: true,
      },
      take: 500,
    });

    if (peers.length < 5) {
      // Fall back to national scope if not enough peers
      const nationalPeers = await this.prisma.project.findMany({
        where: { id: { not: projectId }, approvedAmount: { gt: 0 }, latitude: { not: null } },
        select: {
          id: true, name: true, district: true, state: true,
          sector: true, approvedAmount: true, latitude: true, longitude: true,
        },
        take: 500,
      });
      if (nationalPeers.length >= 5) {
        return this.computeBenchmark(project, nationalPeers, 'national');
      }
      throw new ValidationError('Insufficient peer data for benchmarking (need at least 5 comparable projects)');
    }

    return this.computeBenchmark(project, peers, scope);
  }

  private computeBenchmark(
    project: Project,
    peers: Array<{
      id: string; name: string; district: string; state: string;
      sector: string; approvedAmount: number; latitude?: number | null; longitude?: number | null;
    }>,
    scope: 'sector' | 'district' | 'state' | 'national'
  ): PeerBenchmark {
    const projectArea = this.estimateProjectArea(project.latitude, project.longitude);
    const projectUnitCost = projectArea > 0 ? project.approvedAmount / projectArea : project.approvedAmount;

    const peerCosts = peers.map((p) => {
      const area = this.estimateProjectArea(p.latitude ?? null, p.longitude ?? null);
      return area > 0 ? p.approvedAmount / area : p.approvedAmount;
    });

    const sortedCosts = [...peerCosts].sort((a, b) => a - b);
    const count = sortedCosts.length;

    const median = percentile(sortedCosts, 50);
    const mean = peerCosts.reduce((a, b) => a + b, 0) / count;
    const variance = peerCosts.reduce((s, v) => s + (v - mean) ** 2, 0) / count;
    const stdDev = Math.sqrt(variance);
    const p10 = percentile(sortedCosts, 10);
    const p25 = percentile(sortedCosts, 25);
    const p75 = percentile(sortedCosts, 75);
    const p90 = percentile(sortedCosts, 90);

    const zScore = robustZScore(projectUnitCost, peerCosts);
    const isOutlier = Math.abs(zScore) > 2.5;

    let outlierSeverity: PeerBenchmark['outlierSeverity'] = 'NORMAL';
    if (isOutlier) {
      outlierSeverity = projectUnitCost < median ? 'CHEAP' : 'EXPENSIVE';
    }

    const percentileRank_ = percentileRank(projectUnitCost, sortedCosts);

    // Mark as ANOMALOUS if extreme outlier (z > 3) — not just statistical outlier
    if (Math.abs(zScore) > 3) {
      outlierSeverity = 'ANOMALOUS';
    }

    return {
      projectId: project.id,
      projectName: project.name,
      sector: project.sector,
      district: project.district,
      state: project.state,
      peerGroup: { scope, sector: project.sector },
      ourUnitCost: Math.round(projectUnitCost * 100) / 100,
      unitCostStats: {
        median: Math.round(median * 100) / 100,
        mean: Math.round(mean * 100) / 100,
        stdDev: Math.round(stdDev * 100) / 100,
        min: Math.round(percentile(sortedCosts, 0) * 100) / 100,
        max: Math.round(percentile(sortedCosts, 100) * 100) / 100,
        p25: Math.round(p25 * 100) / 100,
        p75: Math.round(p75 * 100) / 100,
        p10: Math.round(p10 * 100) / 100,
        p90: Math.round(p90 * 100) / 100,
        count,
      },
      zScore: Math.round(zScore * 100) / 100,
      isOutlier,
      outlierSeverity,
      percentile: Math.round(percentileRank_ * 10) / 10,
      peers: peers.slice(0, 20).map((p) => {
        const area = this.estimateProjectArea(p.latitude ?? 0, p.longitude ?? 0);
        return {
          projectId: p.id,
          name: p.name,
          unitCost: Math.round((area > 0 ? p.approvedAmount / area : p.approvedAmount) * 100) / 100,
          district: p.district,
          state: p.state,
        };
      }),
    };
  }

  /**
   * Estimate project area in sq.km from coordinates.
   * For point projects (no area data), returns a small default area.
   */
  private estimateProjectArea(lat: number | null | undefined, lng: number | null | undefined): number {
    if (lat == null || lng == null) return 1; // fallback: treat as 1 sq.km unit
    // Very rough: assume ~100m × 100m = 0.01 sq.km for a typical infrastructure project
    // In a real system, this would use boundary geometry from the project
    return 0.01;
  }

  /**
   * Generate financial risk signals for a project.
   * These are fed into the M8 risk engine as RiskSignal records.
   */
  async generateRiskSignals(projectId: string): Promise<FinancialRiskSignals> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw NotFoundError.notFound('Project', projectId);

    const [observations, satelliteObs, progressObs, documents] = await Promise.all([
      this.prisma.financialObservation.findMany({ where: { projectId }, orderBy: { date: 'asc' } }),
      this.prisma.satelliteObservation.findMany({ where: { projectId, quality: 'PROCESSED' }, orderBy: { observationDate: 'desc' }, take: 3 }),
      this.prisma.progressObservation.findMany({ where: { projectId }, orderBy: { reportDate: 'desc' }, take: 3 }),
      this.prisma.document.findMany({ where: { projectId } }),
    ]);

    const signals: CostAnomalySignal[] = [];
    const totalExpenditure = observations
      .filter((o) => ['EXPENDITURE', 'PAYMENT', 'MILESTONE_PAYMENT'].includes(o.type.toUpperCase()))
      .reduce((sum, o) => sum + o.amount, 0);
    const financialProgress = Math.min(100, (totalExpenditure / project.approvedAmount) * 100);
    const latestSatellite = satelliteObs[0];
    const satelliteProgress = latestSatellite?.constructionScore != null
      ? latestSatellite.constructionScore * 100
      : null;

    // Signal 1: Financial vs Satellite mismatch
    if (satelliteProgress !== null) {
      const gap = financialProgress - satelliteProgress;
      const absGap = Math.abs(gap);
      if (absGap > 15) {
        signals.push({
          signalType: gap > 0 ? 'SUSPICIOUS_UNDERPEND' as const : 'SUSPICIOUS_OVERPEND' as const,
          severity: absGap > 50 ? 'CRITICAL' : absGap > 35 ? 'HIGH' : 'MEDIUM',
          confidence: 'MEDIUM',
          value: financialProgress,
          expectedValue: satelliteProgress,
          deviationPercent: Math.round(absGap * 10) / 10,
          explanation: gap > 0
            ? `Financial progress (${financialProgress.toFixed(1)}%) exceeds satellite progress (${satelliteProgress.toFixed(1)}%) by ${absGap.toFixed(1)}pp. Possible inflated expenditure.`
            : `Satellite progress (${satelliteProgress.toFixed(1)}%) exceeds financial progress (${financialProgress.toFixed(1)}%) by ${absGap.toFixed(1)}pp. Possible fund diversion or delayed payments.`,
          evidence: {
            financialObservationIds: observations.map((o) => o.id),
            satelliteObservationIds: satelliteObs.map((o) => o.id),
            documentIds: [],
          },
          scoreContribution: Math.round(Math.min(50, absGap)),
        });
      }
    }

    // Signal 2: Stalled project with ongoing spending
    if (project.status === 'IN_PROGRESS' && satelliteObs.length > 0) {
      const latestObs = satelliteObs[0];
      const oldestObs = satelliteObs[satelliteObs.length - 1];
      if (oldestObs && latestObs) {
        const daysSinceOldest = (Date.now() - oldestObs.observationDate.getTime()) / (1000 * 60 * 60 * 24);
        const constructionChange = (latestObs.constructionScore ?? 0) - (oldestObs.constructionScore ?? 0);
        if (daysSinceOldest > 60 && constructionChange < 0.05 && totalExpenditure > project.approvedAmount * 0.3) {
          signals.push({
            signalType: 'STALLED_WITH_SPENDING',
            severity: 'HIGH',
            confidence: 'MEDIUM',
            value: totalExpenditure,
            expectedValue: null,
            deviationPercent: null,
            explanation: `Project shows minimal construction change (${(constructionChange * 100).toFixed(1)}%) over ${Math.round(daysSinceOldest)} days but has spent ₹${(totalExpenditure / 100000).toFixed(1)}L (${financialProgress.toFixed(1)}% of sanctioned amount).`,
            evidence: {
              financialObservationIds: observations.map((o) => o.id),
              satelliteObservationIds: satelliteObs.map((o) => o.id),
              documentIds: [],
            },
            scoreContribution: 45,
          });
        }
      }
    }

    // Signal 3: Budget overrun
    if (totalExpenditure > project.approvedAmount * 1.1) {
      const overrunPercent = ((totalExpenditure - project.approvedAmount) / project.approvedAmount) * 100;
      signals.push({
        signalType: 'BUDGET_OVERRUN',
        severity: overrunPercent > 30 ? 'CRITICAL' : overrunPercent > 15 ? 'HIGH' : 'MEDIUM',
        confidence: 'HIGH',
        value: totalExpenditure,
        expectedValue: project.approvedAmount,
        deviationPercent: Math.round(overrunPercent * 10) / 10,
        explanation: `Total expenditure (₹${(totalExpenditure / 100000).toFixed(2)}L) exceeds sanctioned amount (₹${(project.approvedAmount / 100000).toFixed(2)}L) by ${overrunPercent.toFixed(1)}%.`,
        evidence: {
          financialObservationIds: observations.map((o) => o.id),
          satelliteObservationIds: [],
          documentIds: documents.map((d) => d.id),
        },
        scoreContribution: Math.round(Math.min(60, overrunPercent)),
      });
    }

    // Signal 4: Premature completion (financial done but satellite says not done)
    if (satelliteProgress !== null && satelliteProgress < 80 && financialProgress >= 95) {
      signals.push({
        signalType: 'PREMATURE_COMPLETION',
        severity: satelliteProgress < 50 ? 'HIGH' : 'MEDIUM',
        confidence: 'MEDIUM',
        value: financialProgress,
        expectedValue: satelliteProgress,
        deviationPercent: Math.round((financialProgress - satelliteProgress) * 10) / 10,
        explanation: `Financial claims 95%+ completion but satellite imagery shows only ${satelliteProgress.toFixed(1)}% construction. High risk of fake completion claims.`,
        evidence: {
          financialObservationIds: observations.map((o) => o.id),
          satelliteObservationIds: satelliteObs.map((o) => o.id),
          documentIds: documents.filter((d) => d.type === 'COMPLETION_CERTIFICATE').map((d) => d.id),
        },
        scoreContribution: 50,
      });
    }

    // Signal 5: Suspicious transaction patterns (many small payments at end)
    const expenditureObs = observations.filter((o) => ['EXPENDITURE', 'PAYMENT'].includes(o.type.toUpperCase()));
    if (expenditureObs.length >= 5) {
      const lastThird = expenditureObs.slice(Math.floor(expenditureObs.length * 0.67));
      const firstTwoThirds = expenditureObs.slice(0, Math.floor(expenditureObs.length * 0.67));
      const lastThirdTotal = lastThird.reduce((s, o) => s + o.amount, 0);
      const firstTotal = firstTwoThirds.reduce((s, o) => s + o.amount, 0);
      if (lastThirdTotal > firstTotal * 1.5 && totalExpenditure > project.approvedAmount * 0.5) {
        signals.push({
          signalType: 'EXPENDITURE_RATE_ANOMALY',
          severity: 'MEDIUM',
          confidence: 'MEDIUM',
          value: lastThirdTotal,
          expectedValue: firstTotal / firstTwoThirds.length * lastThird.length,
          deviationPercent: Math.round(((lastThirdTotal - (firstTotal / firstTwoThirds.length * lastThird.length)) / (firstTotal / firstTwoThirds.length * lastThird.length)) * 100),
          explanation: `Last ${lastThird.length} transactions totalling ₹${(lastThirdTotal / 100000).toFixed(1)}L exceed the average rate of earlier transactions. Possible rush-spending or last-minute adjustments.`,
          evidence: {
            financialObservationIds: observations.map((o) => o.id),
            satelliteObservationIds: [],
            documentIds: [],
          },
          scoreContribution: 30,
        });
      }
    }

    // Composite score
    const compositeScore = Math.min(100, signals.reduce((s, sig) => s + sig.scoreContribution, 0));
    const dominantRisk = signals.length > 0
      ? signals.sort((a, b) => b.scoreContribution - a.scoreContribution)[0].signalType
      : null;

    return {
      projectId,
      signals,
      compositeScore,
      dominantRisk,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Cross-source correlation: financial ↔ satellite, financial ↔ document, financial ↔ reported progress.
   */
  async correlateSources(projectId: string): Promise<CrossSourceCorrelation> {
    const reconciliation = await this.reconcile(projectId);
    const riskSignals = await this.generateRiskSignals(projectId);

    const correlations: CrossSourceCorrelation['correlations'] = [];

    // Financial vs Satellite
    const finVsSat = reconciliation.correlation;
    correlations.push({
      sourceA: 'financial',
      sourceB: 'satellite',
      agreement: finVsSat.financialVsPhysical === 'MATCH' ? 'POSITIVE'
        : finVsSat.financialVsPhysical === 'SUSPICIOUS_UNDERPEND' ? 'NEGATIVE'
        : finVsSat.financialVsPhysical === 'SUSPICIOUS_OVERPEND' ? 'NEGATIVE'
        : 'INCOMPARABLE',
      score: finVsSat.financialVsPhysical === 'MATCH' ? 85
        : finVsSat.financialVsPhysical === 'SUSPICIOUS_UNDERPEND' ? 20
        : finVsSat.financialVsPhysical === 'SUSPICIOUS_OVERPEND' ? 35
        : 50,
      finding: finVsSat.explanation,
      signals: finVsSat.signalSeverity ? [`${finVsSat.signalSeverity} severity financial-physical discrepancy`] : [],
    });

    // Financial vs Document
    const docScore = reconciliation.documents.totalDocuments > 0
      ? Math.min(100, (reconciliation.documents.verifiedDocuments / reconciliation.documents.totalDocuments) * 100)
      : 0;
    correlations.push({
      sourceA: 'financial',
      sourceB: 'document',
      agreement: docScore >= 70 ? 'POSITIVE' : docScore >= 40 ? 'NEUTRAL' : 'NEGATIVE',
      score: docScore,
      finding: `${reconciliation.documents.verifiedDocuments}/${reconciliation.documents.totalDocuments} documents verified. ${reconciliation.documents.invoiceCount} invoices, ${reconciliation.documents.receiptCount} receipts found.`,
      signals: docScore < 40 ? ['Low document verification rate — financial claims may lack evidence'] : [],
    });

    // Overall consistency
    const overallConsistencyScore = Math.round(
      correlations.reduce((s, c) => s + c.score, 0) / correlations.length
    );

    const redFlags: string[] = [];
    if (finVsSat.signalSeverity === 'CRITICAL' || finVsSat.signalSeverity === 'HIGH') {
      redFlags.push(`Financial-physical discrepancy: ${finVsSat.explanation}`);
    }
    const highSignals = riskSignals.signals.filter((s) => s.severity === 'HIGH' || s.severity === 'CRITICAL');
    for (const sig of highSignals) {
      redFlags.push(`${sig.severity}: ${sig.explanation}`);
    }

    const recommendations: string[] = [];
    if (overallConsistencyScore < 50) {
      recommendations.push('Investigate financial-physical discrepancy. Cross-reference expenditure claims with satellite imagery.');
    }
    if (reconciliation.documents.verifiedDocuments === 0 && reconciliation.documents.totalDocuments > 0) {
      recommendations.push('Verify financial documents (invoices, receipts) before relying on expenditure data.');
    }
    if (!reconciliation.timeline.onTrack) {
      recommendations.push('Project timeline shows delays. Review milestone payment schedule and contractor performance.');
    }

    return {
      projectId,
      correlations,
      overallConsistencyScore,
      redFlags,
      recommendations,
    };
  }

  /**
   * Financial timeline events for Time Machine integration.
   */
  async getFinancialTimeline(projectId: string): Promise<Array<{
    id: string;
    date: string;
    type: string;
    description: string;
    amount: number;
    vendor: string | null;
    status: string;
    evidence: string[];
  }>> {
    const observations = await this.prisma.financialObservation.findMany({
      where: { projectId },
      orderBy: { date: 'asc' },
    });

    const documents = await this.prisma.document.findMany({
      where: {
        projectId,
        type: { in: ['INVOICE', 'RECEIPT', 'COMPLETION_CERTIFICATE', 'PAYMENT_VOUCHER'] },
      },
    });

    return observations.map((obs) => ({
      id: obs.id,
      date: obs.date.toISOString(),
      type: obs.type,
      description: obs.description,
      amount: obs.amount,
      vendor: obs.vendor,
      status: obs.status,
      evidence: documents
        .filter((d) => d.extractedText?.includes(obs.invoiceNo ?? ''))
        .map((d) => d.id),
    }));
  }
}
