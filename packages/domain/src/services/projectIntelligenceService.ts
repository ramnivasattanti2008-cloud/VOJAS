/**
 * Project Intelligence — Phase 3: Cross-Signal Intelligence
 *
 * Composes the outputs of already-existing systems into one explainable,
 * project-level view for authenticated government/investigator users:
 *   - RiskEngine (packages/domain/src/services/riskEngine) — signals,
 *     correlated findings, risk score
 *   - EvidenceService — unified, role-filtered evidence
 *   - Anomaly model — legacy anomaly detections
 *   - VerificationCase — open investigations for this project
 *
 * This module does NOT re-implement signal generation or scoring — it
 * reads what the risk engine has already persisted (via GET, not a
 * re-analysis) and adds the "signal card" / "why flagged" explainability
 * layer the risk engine's raw output doesn't provide on its own.
 *
 * ANTI-FABRICATION: every card either reports a real value or an explicit
 * UNAVAILABLE status. Missing data is never treated as a negative signal.
 */
import type { PrismaClient } from '@vojas/db';
import { EvidenceService } from './evidenceService.js';
import type { EvidenceItem, EvidenceViewerContext } from './evidenceService.js';

export type SignalCardStatus = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNAVAILABLE';
export type FreshnessStatus = 'FRESH' | 'STALE' | 'UNAVAILABLE';

export interface FreshnessInfo {
  status: FreshnessStatus;
  ageDays: number | null;
  referenceDate: string | null;
}

export interface SignalCard {
  key: 'FINANCIAL' | 'PROGRESS' | 'TIMELINE' | 'INSPECTION' | 'CONTRACTOR' | 'CITIZEN' | 'SATELLITE';
  label: string;
  status: SignalCardStatus;
  summary: string;
  freshness: FreshnessInfo;
}

export interface CrossSignalFindingSummary {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  riskScore: number;
  confidence: string;
  status: string;
  recommendedAction: string | null;
  limitations: string | null;
  contributingSignalCount: number;
  detectedAt: string;
}

export interface ProjectIntelligence {
  projectId: string;
  project: {
    name: string;
    sector: string;
    status: string;
    state: string | null;
    district: string | null;
    constituency: string | null;
    mp: { id: string; name: string } | null;
    approvedAmount: number;
    spentAmount: number;
  };
  overallStatus: SignalCardStatus;
  risk: {
    score: number;
    level: string;
    confidence: string;
    primaryDriver: string | null;
    computedAt: string | null;
  } | null;
  signalCards: SignalCard[];
  crossSignalFindings: CrossSignalFindingSummary[];
  activeAnomalies: Array<{ id: string; category: string; severity: string; status: string; description: string }>;
  evidenceSummary: {
    total: number;
    byType: Record<string, number>;
    recent: Array<Pick<EvidenceItem, 'id' | 'evidenceType' | 'title' | 'capturedAt' | 'verificationStatus'>>;
  };
  openInvestigation: { id: string; type: string; status: string; priority: string; assignedToId: string | null } | null;
  whyFlagged: string[];
  recommendedActions: string[];
  dataFreshness: {
    financial: FreshnessInfo;
    progress: FreshnessInfo;
    satellite: FreshnessInfo;
    inspection: FreshnessInfo;
  };
  computedAt: string;
}

const INSPECTION_INTERVAL_DAYS = 90;
const FINANCIAL_MISMATCH_THRESHOLD = 20; // percentage points
const FRESHNESS_THRESHOLD_DAYS = 90;

export function classifyFreshness(referenceDate: Date | null, thresholdDays: number, now: Date = new Date()): FreshnessInfo {
  if (!referenceDate) {
    return { status: 'UNAVAILABLE', ageDays: null, referenceDate: null };
  }
  const ageDays = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
  return {
    status: ageDays > thresholdDays ? 'STALE' : 'FRESH',
    ageDays,
    referenceDate: referenceDate.toISOString(),
  };
}

export function buildFinancialSignalCard(project: { approvedAmount: number; spentAmount: number }): SignalCard {
  if (!project.approvedAmount || project.approvedAmount <= 0) {
    return {
      key: 'FINANCIAL',
      label: 'Financial',
      status: 'UNAVAILABLE',
      summary: 'Insufficient financial data — no approved amount on record.',
      freshness: { status: 'UNAVAILABLE', ageDays: null, referenceDate: null },
    };
  }
  const utilization = (project.spentAmount / project.approvedAmount) * 100;
  return {
    key: 'FINANCIAL',
    label: 'Financial',
    status: utilization > 100 ? 'HIGH' : utilization > 85 ? 'MEDIUM' : 'LOW',
    summary: `Financial utilization: ${utilization.toFixed(1)}% (₹${project.spentAmount.toLocaleString('en-IN')} of ₹${project.approvedAmount.toLocaleString('en-IN')} approved).`,
    freshness: { status: 'FRESH', ageDays: 0, referenceDate: null },
  };
}

export function buildProgressSignalCard(
  latestProgress: { reportedProgress: number; reportDate: Date } | null,
  project: { approvedAmount: number; spentAmount: number },
  now: Date = new Date()
): SignalCard {
  if (!latestProgress) {
    return {
      key: 'PROGRESS',
      label: 'Progress',
      status: 'UNAVAILABLE',
      summary: 'No progress reports on record for this project.',
      freshness: { status: 'UNAVAILABLE', ageDays: null, referenceDate: null },
    };
  }
  const freshness = classifyFreshness(latestProgress.reportDate, FRESHNESS_THRESHOLD_DAYS, now);
  const utilization = project.approvedAmount > 0 ? (project.spentAmount / project.approvedAmount) * 100 : null;
  const mismatch = utilization !== null ? Math.abs(utilization - latestProgress.reportedProgress) : 0;

  return {
    key: 'PROGRESS',
    label: 'Progress',
    status: mismatch > FINANCIAL_MISMATCH_THRESHOLD ? 'HIGH' : mismatch > 10 ? 'MEDIUM' : 'LOW',
    summary:
      utilization !== null
        ? `Reported physical progress: ${latestProgress.reportedProgress.toFixed(1)}% vs financial utilization ${utilization.toFixed(1)}%.`
        : `Reported physical progress: ${latestProgress.reportedProgress.toFixed(1)}%.`,
    freshness,
  };
}

export function buildTimelineSignalCard(project: {
  status: string;
  expectedEndDate: Date | null;
}, now: Date = new Date()): SignalCard {
  if (!project.expectedEndDate) {
    return {
      key: 'TIMELINE',
      label: 'Timeline',
      status: 'UNAVAILABLE',
      summary: 'No expected end date on record.',
      freshness: { status: 'UNAVAILABLE', ageDays: null, referenceDate: null },
    };
  }
  if (project.status === 'COMPLETED') {
    return {
      key: 'TIMELINE',
      label: 'Timeline',
      status: 'LOW',
      summary: 'Project marked completed.',
      freshness: { status: 'FRESH', ageDays: 0, referenceDate: null },
    };
  }
  const overdueDays = Math.floor((now.getTime() - project.expectedEndDate.getTime()) / (1000 * 60 * 60 * 24));
  if (overdueDays <= 0) {
    return {
      key: 'TIMELINE',
      label: 'Timeline',
      status: 'LOW',
      summary: `On schedule — expected completion ${project.expectedEndDate.toISOString().slice(0, 10)}.`,
      freshness: { status: 'FRESH', ageDays: 0, referenceDate: null },
    };
  }
  return {
    key: 'TIMELINE',
    label: 'Timeline',
    status: overdueDays > 90 ? 'HIGH' : 'MEDIUM',
    summary: `${overdueDays} day(s) past the expected completion date (${project.expectedEndDate.toISOString().slice(0, 10)}).`,
    freshness: { status: 'FRESH', ageDays: 0, referenceDate: null },
  };
}

export function buildInspectionSignalCard(
  latestFieldVerification: { completedDate: Date | null; scheduledDate: Date | null; result: string } | null,
  projectStatus: string,
  now: Date = new Date()
): SignalCard {
  if (!latestFieldVerification) {
    return {
      key: 'INSPECTION',
      label: 'Inspection',
      status: 'UNAVAILABLE',
      summary: 'No field verification on record for this project.',
      freshness: { status: 'UNAVAILABLE', ageDays: null, referenceDate: null },
    };
  }
  const referenceDate = latestFieldVerification.completedDate ?? latestFieldVerification.scheduledDate;
  const freshness = classifyFreshness(referenceDate, INSPECTION_INTERVAL_DAYS, now);
  const isStale = freshness.status === 'STALE' && projectStatus === 'IN_PROGRESS';

  return {
    key: 'INSPECTION',
    label: 'Inspection',
    status: isStale ? (freshness.ageDays! > 180 ? 'HIGH' : 'MEDIUM') : 'LOW',
    summary: latestFieldVerification.completedDate
      ? `Last field verification completed ${freshness.ageDays} day(s) ago — result: ${latestFieldVerification.result.replace(/_/g, ' ')}.`
      : `Last field verification was scheduled but never marked completed (${freshness.ageDays ?? 'unknown'} day(s) ago).`,
    freshness,
  };
}

export function buildContractorSignalCard(
  latestContractorUpdate: { status: string; submittedAt: Date } | null,
  now: Date = new Date()
): SignalCard {
  if (!latestContractorUpdate) {
    return {
      key: 'CONTRACTOR',
      label: 'Contractor',
      status: 'UNAVAILABLE',
      summary: 'No contractor submissions on record.',
      freshness: { status: 'UNAVAILABLE', ageDays: null, referenceDate: null },
    };
  }
  const freshness = classifyFreshness(latestContractorUpdate.submittedAt, FRESHNESS_THRESHOLD_DAYS, now);
  return {
    key: 'CONTRACTOR',
    label: 'Contractor',
    status: latestContractorUpdate.status === 'REJECTED' ? 'MEDIUM' : 'LOW',
    summary: `Latest contractor submission: ${latestContractorUpdate.status.replace(/_/g, ' ').toLowerCase()}.`,
    freshness,
  };
}

export function buildCitizenSignalCard(reportCount: number, latestReportDate: Date | null, now: Date = new Date()): SignalCard {
  if (reportCount === 0) {
    return {
      key: 'CITIZEN',
      label: 'Citizen Reports',
      status: 'LOW',
      summary: 'No citizen reports filed for this project.',
      freshness: { status: 'UNAVAILABLE', ageDays: null, referenceDate: null },
    };
  }
  const freshness = classifyFreshness(latestReportDate, FRESHNESS_THRESHOLD_DAYS, now);
  return {
    key: 'CITIZEN',
    label: 'Citizen Reports',
    status: reportCount >= 3 ? 'HIGH' : reportCount >= 1 ? 'MEDIUM' : 'LOW',
    summary: `${reportCount} citizen report(s) on record.`,
    freshness,
  };
}

export function buildSatelliteSignalCard(
  latestObs: { observationDate: Date; cloudCover: number } | null,
  changeClassification: string | null,
  now: Date = new Date()
): SignalCard {
  if (!latestObs) {
    return {
      key: 'SATELLITE',
      label: 'Satellite',
      status: 'UNAVAILABLE',
      summary: 'Satellite signal unavailable — no observation on record.',
      freshness: { status: 'UNAVAILABLE', ageDays: null, referenceDate: null },
    };
  }
  const freshness = classifyFreshness(latestObs.observationDate, FRESHNESS_THRESHOLD_DAYS, now);
  const lowChange = changeClassification ? ['NO_OBSERVABLE_CHANGE', 'LOW_OBSERVABLE_CHANGE'].includes(changeClassification) : false;
  return {
    key: 'SATELLITE',
    label: 'Satellite',
    status: lowChange ? 'MEDIUM' : 'LOW',
    summary: changeClassification
      ? `Latest observable change: ${changeClassification.replace(/_/g, ' ').toLowerCase()} (cloud cover ${latestObs.cloudCover.toFixed(0)}%).`
      : `Observation on record; no change analysis available yet.`,
    freshness,
  };
}

/**
 * Builds the "why flagged" narrative from real signal-card values only —
 * mirrors the exact style requested for officer review: concrete numbers,
 * explicit "requires verification, not proof" framing.
 */
export function buildWhyFlaggedSummary(cards: SignalCard[]): string[] {
  const lines: string[] = [];
  const concerning = cards.filter((c) => c.status === 'HIGH' || c.status === 'MEDIUM');

  if (concerning.length === 0) {
    lines.push('No cross-signal concerns detected from currently available data.');
    return lines;
  }

  lines.push(`${concerning.length} signal(s) currently look inconsistent or overdue:`);
  concerning.forEach((c, i) => {
    lines.push(`${i + 1}. ${c.label}: ${c.summary}`);
  });
  lines.push('');
  lines.push('These signals do not prove wrongdoing. They indicate that the project deserves verification.');
  return lines;
}

export function buildRecommendedActions(cards: SignalCard[]): string[] {
  const actions: string[] = [];
  const byKey = Object.fromEntries(cards.map((c) => [c.key, c]));

  if (byKey.INSPECTION?.status === 'HIGH' || byKey.INSPECTION?.status === 'MEDIUM') {
    actions.push('Schedule a field verification — the last inspection is past the expected interval.');
  }
  if (byKey.PROGRESS?.status === 'HIGH' || byKey.FINANCIAL?.status === 'HIGH') {
    actions.push('Review the latest progress submission against financial records.');
  }
  if (byKey.CITIZEN?.status === 'HIGH' || byKey.CITIZEN?.status === 'MEDIUM') {
    actions.push('Review citizen reports filed against this project.');
  }
  if (byKey.TIMELINE?.status === 'HIGH' || byKey.TIMELINE?.status === 'MEDIUM') {
    actions.push('Verify current project status and revised timeline with the implementing authority.');
  }
  if (actions.length === 0) {
    actions.push('No specific action required at this time — continue routine monitoring.');
  }
  return actions;
}

export function computeOverallStatus(cards: SignalCard[]): SignalCardStatus {
  if (cards.some((c) => c.status === 'HIGH')) return 'HIGH';
  if (cards.some((c) => c.status === 'MEDIUM')) return 'MEDIUM';
  if (cards.every((c) => c.status === 'UNAVAILABLE')) return 'UNAVAILABLE';
  return 'LOW';
}

export class ProjectIntelligenceService {
  private evidenceService: EvidenceService;

  constructor(private readonly prisma: PrismaClient) {
    this.evidenceService = new EvidenceService(prisma);
  }

  async getProjectIntelligence(projectId: string, viewer: EvidenceViewerContext): Promise<ProjectIntelligence | null> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { mp: { select: { id: true, name: true } } },
    });
    if (!project) return null;

    const [
      risk,
      activeFindings,
      activeAnomalies,
      latestFieldVerification,
      latestProgress,
      latestSatelliteObs,
      latestChangeAnalysis,
      latestContractorUpdate,
      citizenReportCount,
      latestCitizenReport,
      openCase,
      allEvidence,
    ] = await Promise.all([
      this.prisma.projectRisk.findUnique({ where: { projectId } }),
      this.prisma.riskFinding.findMany({
        where: { projectId, status: { notIn: ['RESOLVED', 'DISMISSED'] } },
        orderBy: { detectedAt: 'desc' },
        take: 10,
      }),
      this.prisma.anomaly.findMany({
        where: { projectId, status: { notIn: ['RESOLVED', 'DISMISSED'] } },
        take: 10,
      }),
      this.prisma.fieldVerification.findFirst({
        where: { projectId },
        orderBy: [{ completedDate: 'desc' }, { scheduledDate: 'desc' }],
      }),
      this.prisma.progressObservation.findFirst({ where: { projectId }, orderBy: { reportDate: 'desc' } }),
      this.prisma.satelliteObservation.findFirst({ where: { projectId }, orderBy: { observationDate: 'desc' } }),
      this.prisma.changeAnalysis.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.contractorUpdate.findFirst({ where: { projectId }, orderBy: { submittedAt: 'desc' } }),
      this.prisma.report.count({ where: { projectId } }),
      this.prisma.report.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      this.prisma.verificationCase.findFirst({
        where: { projectId, status: { in: ['OPEN', 'ASSIGNED', 'UNDER_REVIEW', 'REOPENED'] } },
        orderBy: { createdAt: 'desc' },
      }),
      this.evidenceService.getProjectEvidence(projectId),
    ]);

    const now = new Date();

    const cards: SignalCard[] = [
      buildFinancialSignalCard(project),
      buildProgressSignalCard(
        latestProgress ? { reportedProgress: latestProgress.reportedProgress, reportDate: latestProgress.reportDate } : null,
        project,
        now
      ),
      buildTimelineSignalCard(project, now),
      buildInspectionSignalCard(
        latestFieldVerification
          ? {
              completedDate: latestFieldVerification.completedDate,
              scheduledDate: latestFieldVerification.scheduledDate,
              result: latestFieldVerification.result,
            }
          : null,
        project.status,
        now
      ),
      buildContractorSignalCard(
        latestContractorUpdate ? { status: latestContractorUpdate.status, submittedAt: latestContractorUpdate.submittedAt } : null,
        now
      ),
      buildCitizenSignalCard(citizenReportCount, latestCitizenReport?.createdAt ?? null, now),
      buildSatelliteSignalCard(
        latestSatelliteObs ? { observationDate: latestSatelliteObs.observationDate, cloudCover: latestSatelliteObs.cloudCover } : null,
        latestChangeAnalysis?.changeClassification ?? null,
        now
      ),
    ];

    const visibleEvidence = this.evidenceService.filterForViewer(allEvidence, viewer);
    const evidenceByType: Record<string, number> = {};
    for (const item of visibleEvidence) {
      evidenceByType[item.evidenceType] = (evidenceByType[item.evidenceType] ?? 0) + 1;
    }

    return {
      projectId,
      project: {
        name: project.name,
        sector: project.sector,
        status: project.status,
        state: project.state,
        district: project.district,
        constituency: project.constituency,
        mp: project.mp ? { id: project.mp.id, name: project.mp.name } : null,
        approvedAmount: project.approvedAmount,
        spentAmount: project.spentAmount,
      },
      overallStatus: computeOverallStatus(cards),
      risk: risk
        ? {
            score: risk.riskScore,
            level: risk.riskLevel,
            confidence: risk.confidence,
            primaryDriver: risk.primaryDriver,
            computedAt: risk.computedAt.toISOString(),
          }
        : null,
      signalCards: cards,
      crossSignalFindings: activeFindings.map((f) => ({
        id: f.id,
        type: f.type,
        title: f.title,
        description: f.description,
        severity: f.severity,
        riskScore: f.riskScore,
        confidence: f.confidence,
        status: f.status,
        recommendedAction: f.recommendedAction,
        limitations: f.limitations,
        contributingSignalCount: f.signalIds.length,
        detectedAt: f.detectedAt.toISOString(),
      })),
      activeAnomalies: activeAnomalies.map((a) => ({
        id: a.id,
        category: a.category,
        severity: a.severity,
        status: a.status,
        description: a.description,
      })),
      evidenceSummary: {
        total: visibleEvidence.length,
        byType: evidenceByType,
        recent: visibleEvidence.slice(0, 5).map((e) => ({
          id: e.id,
          evidenceType: e.evidenceType,
          title: e.title,
          capturedAt: e.capturedAt,
          verificationStatus: e.verificationStatus,
        })),
      },
      openInvestigation: openCase
        ? { id: openCase.id, type: openCase.type, status: openCase.status, priority: openCase.priority, assignedToId: openCase.assignedToId }
        : null,
      whyFlagged: buildWhyFlaggedSummary(cards),
      recommendedActions: buildRecommendedActions(cards),
      dataFreshness: {
        financial: cards.find((c) => c.key === 'FINANCIAL')!.freshness,
        progress: cards.find((c) => c.key === 'PROGRESS')!.freshness,
        satellite: cards.find((c) => c.key === 'SATELLITE')!.freshness,
        inspection: cards.find((c) => c.key === 'INSPECTION')!.freshness,
      },
      computedAt: now.toISOString(),
    };
  }
}
