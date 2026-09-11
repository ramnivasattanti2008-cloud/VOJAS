/**
 * Project Reality Check.
 *
 * Six independent sources are asked the same question — *how far along is this
 * project, really?* — and their answers are placed side by side:
 *
 *   Government reported status · Contractor status · Financial status ·
 *   Citizen evidence · Geospatial evidence · Environmental evidence
 *
 * The value is not in any single number. It is in whether the sources AGREE.
 * A project reported 100% complete, with 95% of funds spent, no visible change
 * on satellite imagery and three citizen complaints is not proof of anything —
 * but it is exactly the pattern a human should look at next.
 *
 * DESIGN RULES, which follow from this being an anti-corruption tool:
 *
 * 1. A source that has no data reports `available: false` and takes no part in
 *    the comparison. It is never defaulted to zero, and never interpolated.
 *    "We don't know" and "nothing happened" are different answers and are
 *    presented differently.
 * 2. Every contradiction cites the two sources it came from and the figures
 *    that disagree, so a reviewer can check the arithmetic themselves.
 * 3. Staleness is part of the answer. A source that agrees but was last
 *    updated fourteen months ago is not corroboration.
 * 4. The output is a VERIFICATION PRIORITY, never an accusation. Nothing here
 *    concludes fraud; it decides what a human should inspect first.
 */

import type { PrismaClient } from '@vojas/db';
import { classifyFreshness } from './projectIntelligenceService.js';
import type { FreshnessInfo } from './projectIntelligenceService.js';

/** The six accounts compared, in the order the specification lists them. */
export type RealitySourceKey =
  | 'GOVERNMENT'
  | 'CONTRACTOR'
  | 'FINANCIAL'
  | 'CITIZEN'
  | 'GEOSPATIAL'
  | 'ENVIRONMENTAL';

/**
 * Why a source has nothing to say. Distinguishing these matters: a project with
 * no coordinates can never have satellite evidence, which is a different
 * problem from imagery existing but being too cloudy to use.
 */
export type UnavailableReason =
  | 'NO_DATA'
  | 'NOT_APPLICABLE'
  | 'NO_USABLE_OBSERVATION'
  | 'INSUFFICIENT_DATA';

export interface RealitySourceAccount {
  key: RealitySourceKey;
  label: string;
  available: boolean;
  /** Why there is nothing to report. Present only when `available` is false. */
  unavailableReason?: UnavailableReason;
  /**
   * This source's estimate of completion, 0–100, where it can honestly express
   * one. null means the source has data but that data does not translate into a
   * completion figure — citizen reports, for instance, evidence concern rather
   * than progress.
   */
  completionEstimate: number | null;
  /** What this source actually says, in plain language, for display. */
  statement: string;
  /** The record this account was derived from, so a reviewer can go and read it. */
  basis: string;
  freshness: FreshnessInfo;
}

export type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RealityConflict {
  between: [RealitySourceKey, RealitySourceKey];
  severity: ConflictSeverity;
  /** The observable discrepancy, with both figures named. */
  description: string;
  /** Percentage-point gap, where the conflict is numeric. */
  gap: number | null;
}

export type RealityVerdict =
  | 'CONSISTENT'
  | 'MINOR_DISCREPANCY'
  | 'CONFLICTING'
  | 'INSUFFICIENT_EVIDENCE';

/**
 * The problem → evidence → confidence → impact → action structure the product
 * spec asks for on every major alert.
 */
export interface RealityCheckAssessment {
  problem: string;
  evidence: string[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: string;
  recommendedAction: string;
  /** Restated on every assessment. This is a legal and ethical requirement. */
  disclaimer: string;
}

export interface ProjectRealityCheck {
  projectId: string;
  projectName: string;
  verdict: RealityVerdict;
  sources: RealitySourceAccount[];
  conflicts: RealityConflict[];
  /** Sources with nothing to say — surfaced, because gaps are themselves a finding. */
  missingSources: RealitySourceKey[];
  /** Sources whose most recent data is older than the freshness threshold. */
  staleSources: RealitySourceKey[];
  assessment: RealityCheckAssessment;
  computedAt: string;
}

const FRESHNESS_THRESHOLD_DAYS = 90;

/** Below this percentage-point gap two sources are treated as agreeing. */
const AGREEMENT_TOLERANCE = 15;
/** At or above this gap, the discrepancy is material. */
const HIGH_CONFLICT_THRESHOLD = 40;

const DISCLAIMER =
  'A reality check compares what different records say. It is a verification priority indicator, not proof of fraud or wrongdoing. Only a human reviewer can establish what actually happened.';

const SOURCE_LABELS: Record<RealitySourceKey, string> = {
  GOVERNMENT: 'Government reported status',
  CONTRACTOR: 'Contractor status',
  FINANCIAL: 'Financial status',
  CITIZEN: 'Citizen evidence',
  GEOSPATIAL: 'Geospatial evidence',
  ENVIRONMENTAL: 'Environmental evidence',
};

const UNAVAILABLE: FreshnessInfo = { status: 'UNAVAILABLE', ageDays: null, referenceDate: null };

/**
 * Maps a project status to the completion it implies. Only the terminal states
 * carry an unambiguous figure; the rest are deliberately null, because
 * "IN_PROGRESS" does not mean 50% and inventing that number would be exactly
 * the kind of fabrication this codebase forbids.
 */
function completionFromStatus(status: string): number | null {
  switch (status) {
    case 'COMPLETED':
    case 'VERIFIED':
      return 100;
    case 'PROPOSED':
    case 'APPROVED':
    case 'SANCTIONED':
      return 0;
    default:
      return null;
  }
}

export class RealityCheckService {
  constructor(private readonly prisma: PrismaClient) {}

  async getRealityCheck(projectId: string, now: Date = new Date()): Promise<ProjectRealityCheck | null> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        status: true,
        approvedAmount: true,
        spentAmount: true,
        latitude: true,
        longitude: true,
        startDate: true,
        expectedEndDate: true,
        completedAt: true,
        updatedAt: true,
      },
    });
    if (!project) return null;

    const [latestProgress, latestContractorUpdate, citizenReports, latestObservation, latestChange] =
      await Promise.all([
        this.prisma.progressObservation.findFirst({
          where: { projectId },
          orderBy: { reportDate: 'desc' },
        }),
        this.prisma.contractorUpdate.findFirst({
          where: { projectId },
          orderBy: { submittedAt: 'desc' },
        }),
        this.prisma.report.findMany({
          where: { projectId },
          select: { id: true, severity: true, status: true, submittedAt: true },
          orderBy: { submittedAt: 'desc' },
          take: 50,
        }),
        this.prisma.satelliteObservation.findFirst({
          where: { projectId },
          orderBy: { observationDate: 'desc' },
        }),
        this.prisma.changeAnalysis.findFirst({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const sources: RealitySourceAccount[] = [
      this.governmentAccount(project, latestProgress, now),
      this.contractorAccount(latestContractorUpdate, now),
      this.financialAccount(project, now),
      this.citizenAccount(citizenReports, now),
      this.geospatialAccount(project, latestObservation, latestChange, now),
      this.environmentalAccount(latestChange, now),
    ];

    const conflicts = this.findConflicts(sources);
    const missingSources = sources.filter((s) => !s.available).map((s) => s.key);
    const staleSources = sources
      .filter((s) => s.available && s.freshness.status === 'STALE')
      .map((s) => s.key);

    const verdict = this.deriveVerdict(sources, conflicts);
    const assessment = this.buildAssessment(verdict, sources, conflicts, missingSources, staleSources);

    return {
      projectId: project.id,
      projectName: project.name,
      verdict,
      sources,
      conflicts,
      missingSources,
      staleSources,
      assessment,
      computedAt: now.toISOString(),
    };
  }

  // ── The six accounts ──────────────────────────────────────────────────────

  private governmentAccount(
    project: { status: string; expectedEndDate: Date | null; completedAt: Date | null; updatedAt: Date },
    progress: { reportedProgress: number; reportDate: Date; reportSource: string } | null,
    now: Date
  ): RealitySourceAccount {
    // A dated progress report is a better answer than a status enum, so prefer it.
    if (progress) {
      return {
        key: 'GOVERNMENT',
        label: SOURCE_LABELS.GOVERNMENT,
        available: true,
        completionEstimate: progress.reportedProgress,
        statement: `Officially reported ${progress.reportedProgress.toFixed(0)}% complete; project status is ${project.status}.`,
        basis: `Progress report from ${progress.reportSource}`,
        freshness: classifyFreshness(progress.reportDate, FRESHNESS_THRESHOLD_DAYS, now),
      };
    }

    const implied = completionFromStatus(project.status);
    const referenceDate = project.completedAt ?? project.updatedAt;
    return {
      key: 'GOVERNMENT',
      label: SOURCE_LABELS.GOVERNMENT,
      available: true,
      completionEstimate: implied,
      statement:
        implied === null
          ? `Project status is ${project.status}. No percentage of completion has been reported.`
          : `Project status is ${project.status}, which implies ${implied}% complete. No separate progress report has been filed.`,
      basis: 'Project record status field',
      freshness: classifyFreshness(referenceDate, FRESHNESS_THRESHOLD_DAYS, now),
    };
  }

  private contractorAccount(
    update: { title: string; description: string; updateType: string; status: string; submittedAt: Date } | null,
    now: Date
  ): RealitySourceAccount {
    if (!update) {
      return {
        key: 'CONTRACTOR',
        label: SOURCE_LABELS.CONTRACTOR,
        available: false,
        unavailableReason: 'NO_DATA',
        completionEstimate: null,
        statement: 'The contractor has not filed any update for this project.',
        basis: 'No contractor update records',
        freshness: UNAVAILABLE,
      };
    }

    return {
      key: 'CONTRACTOR',
      label: SOURCE_LABELS.CONTRACTOR,
      available: true,
      // Contractor updates are narrative; they carry no verified percentage, and
      // reading one out of free text would be a fabricated figure.
      completionEstimate: null,
      statement: `Most recent contractor update (${update.updateType}, ${update.status}): ${update.title}`,
      basis: 'Contractor update record',
      freshness: classifyFreshness(update.submittedAt, FRESHNESS_THRESHOLD_DAYS, now),
    };
  }

  private financialAccount(
    project: { approvedAmount: number; spentAmount: number; updatedAt: Date },
    now: Date
  ): RealitySourceAccount {
    if (!project.approvedAmount || project.approvedAmount <= 0) {
      return {
        key: 'FINANCIAL',
        label: SOURCE_LABELS.FINANCIAL,
        available: false,
        unavailableReason: 'INSUFFICIENT_DATA',
        completionEstimate: null,
        statement: 'No sanctioned amount is recorded, so fund utilisation cannot be calculated.',
        basis: 'Project financial fields',
        freshness: UNAVAILABLE,
      };
    }

    const utilization = (project.spentAmount / project.approvedAmount) * 100;
    return {
      key: 'FINANCIAL',
      label: SOURCE_LABELS.FINANCIAL,
      available: true,
      completionEstimate: utilization,
      statement: `${utilization.toFixed(1)}% of sanctioned funds recorded as spent.`,
      basis: 'Project sanctioned and spent amounts',
      freshness: classifyFreshness(project.updatedAt, FRESHNESS_THRESHOLD_DAYS, now),
    };
  }

  private citizenAccount(
    reports: Array<{ severity: string; status: string; submittedAt: Date }>,
    now: Date
  ): RealitySourceAccount {
    if (reports.length === 0) {
      return {
        key: 'CITIZEN',
        label: SOURCE_LABELS.CITIZEN,
        available: false,
        unavailableReason: 'NO_DATA',
        completionEstimate: null,
        statement: 'No citizen reports have been filed about this project.',
        basis: 'No citizen report records',
        freshness: UNAVAILABLE,
      };
    }

    const open = reports.filter((r) => r.status !== 'RESOLVED' && r.status !== 'REJECTED').length;
    const severe = reports.filter((r) => r.severity === 'HIGH' || r.severity === 'CRITICAL').length;
    const mostRecent = reports[0]!.submittedAt;

    return {
      key: 'CITIZEN',
      label: SOURCE_LABELS.CITIZEN,
      available: true,
      // Citizen reports evidence concern, not progress. Converting a complaint
      // count into a completion percentage would invent a measurement.
      completionEstimate: null,
      statement: `${reports.length} citizen report${reports.length === 1 ? '' : 's'} filed (${open} still open${severe > 0 ? `, ${severe} of high or critical severity` : ''}).`,
      basis: 'Citizen report records',
      freshness: classifyFreshness(mostRecent, FRESHNESS_THRESHOLD_DAYS, now),
    };
  }

  private geospatialAccount(
    project: { latitude: number | null; longitude: number | null },
    observation: { observationDate: Date; cloudCover: number; quality: string } | null,
    change: { changePercent: number | null; primarySignal: string; createdAt: Date } | null,
    now: Date
  ): RealitySourceAccount {
    // No coordinates means satellite verification was never possible here — a
    // different and more actionable problem than imagery being unusable.
    if (project.latitude === null || project.longitude === null) {
      return {
        key: 'GEOSPATIAL',
        label: SOURCE_LABELS.GEOSPATIAL,
        available: false,
        unavailableReason: 'NOT_APPLICABLE',
        completionEstimate: null,
        statement:
          'No coordinates are recorded for this project, so satellite imagery cannot be matched to a location.',
        basis: 'Project location fields',
        freshness: UNAVAILABLE,
      };
    }

    if (!observation) {
      return {
        key: 'GEOSPATIAL',
        label: SOURCE_LABELS.GEOSPATIAL,
        available: false,
        unavailableReason: 'NO_USABLE_OBSERVATION',
        completionEstimate: null,
        statement: 'No suitable satellite observation is available for this location yet.',
        basis: 'No satellite observation records',
        freshness: UNAVAILABLE,
      };
    }

    if (!change || change.changePercent === null) {
      return {
        key: 'GEOSPATIAL',
        label: SOURCE_LABELS.GEOSPATIAL,
        available: false,
        unavailableReason: 'INSUFFICIENT_DATA',
        completionEstimate: null,
        statement: `Imagery captured on ${observation.observationDate.toISOString().slice(0, 10)} (${observation.cloudCover.toFixed(0)}% cloud), but no change analysis has been completed against it.`,
        basis: 'Satellite observation without change analysis',
        freshness: classifyFreshness(observation.observationDate, FRESHNESS_THRESHOLD_DAYS, now),
      };
    }

    // Observed physical change is a proxy for construction progress, not a
    // measurement of it — the statement says so rather than implying precision.
    return {
      key: 'GEOSPATIAL',
      label: SOURCE_LABELS.GEOSPATIAL,
      available: true,
      completionEstimate: change.changePercent,
      statement: `${change.changePercent.toFixed(1)}% of the project area shows physical change (${change.primarySignal}) between the compared observations.`,
      basis: 'Sentinel-2 change analysis',
      freshness: classifyFreshness(change.createdAt, FRESHNESS_THRESHOLD_DAYS, now),
    };
  }

  private environmentalAccount(
    change: { primarySignal: string; changePercent: number | null; createdAt: Date } | null,
    now: Date
  ): RealitySourceAccount {
    const ENVIRONMENTAL_SIGNALS = ['NDVI_CHANGE', 'VEGETATION_DISTURBANCE', 'WATER_CHANGE', 'BARE_SOIL'];

    if (!change || !ENVIRONMENTAL_SIGNALS.includes(change.primarySignal) || change.changePercent === null) {
      return {
        key: 'ENVIRONMENTAL',
        label: SOURCE_LABELS.ENVIRONMENTAL,
        available: false,
        unavailableReason: 'NO_DATA',
        completionEstimate: null,
        statement:
          'No environmental change analysis (vegetation, water or bare-soil signal) has been run for this project.',
        basis: 'No environmental change analysis records',
        freshness: UNAVAILABLE,
      };
    }

    return {
      key: 'ENVIRONMENTAL',
      label: SOURCE_LABELS.ENVIRONMENTAL,
      available: true,
      // An environmental signal describes ecological change, which is not a
      // measure of how complete the works are — so it never votes on completion.
      completionEstimate: null,
      statement: `${change.primarySignal.replace(/_/g, ' ').toLowerCase()} detected across ${change.changePercent.toFixed(1)}% of the analysed area.`,
      basis: 'Sentinel-2 environmental change analysis',
      freshness: classifyFreshness(change.createdAt, FRESHNESS_THRESHOLD_DAYS, now),
    };
  }

  // ── Comparison ────────────────────────────────────────────────────────────

  /**
   * Compares every pair of sources that can express a completion figure. Only
   * sources that genuinely quantify progress take part — a contractor narrative
   * or a complaint count has no number to disagree with, by design.
   */
  private findConflicts(sources: RealitySourceAccount[]): RealityConflict[] {
    const quantified = sources.filter(
      (s): s is RealitySourceAccount & { completionEstimate: number } =>
        s.available && s.completionEstimate !== null
    );

    const conflicts: RealityConflict[] = [];

    for (let i = 0; i < quantified.length; i += 1) {
      for (let j = i + 1; j < quantified.length; j += 1) {
        const a = quantified[i]!;
        const b = quantified[j]!;
        const gap = Math.abs(a.completionEstimate - b.completionEstimate);
        if (gap < AGREEMENT_TOLERANCE) continue;

        conflicts.push({
          between: [a.key, b.key],
          severity: gap >= HIGH_CONFLICT_THRESHOLD ? 'HIGH' : gap >= AGREEMENT_TOLERANCE * 2 ? 'MEDIUM' : 'LOW',
          description: `${a.label} indicates ${a.completionEstimate.toFixed(1)}% while ${b.label.toLowerCase()} indicates ${b.completionEstimate.toFixed(1)}% — a gap of ${gap.toFixed(1)} percentage points.`,
          gap,
        });
      }
    }

    // The pattern that matters most in this domain: money spent well ahead of
    // physical evidence of the work. Called out explicitly because it is the
    // signature of the fraud this platform exists to prioritise for review.
    const financial = quantified.find((s) => s.key === 'FINANCIAL');
    const geospatial = quantified.find((s) => s.key === 'GEOSPATIAL');
    if (financial && geospatial && financial.completionEstimate - geospatial.completionEstimate >= HIGH_CONFLICT_THRESHOLD) {
      conflicts.push({
        between: ['FINANCIAL', 'GEOSPATIAL'],
        severity: 'HIGH',
        description: `Expenditure has reached ${financial.completionEstimate.toFixed(1)}% of the sanctioned amount, but only ${geospatial.completionEstimate.toFixed(1)}% of the site shows physical change. Funds appear to have been drawn well ahead of visible work.`,
        gap: financial.completionEstimate - geospatial.completionEstimate,
      });
    }

    return conflicts.sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));
  }

  private deriveVerdict(sources: RealitySourceAccount[], conflicts: RealityConflict[]): RealityVerdict {
    const quantifiedCount = sources.filter((s) => s.available && s.completionEstimate !== null).length;

    // One source cannot corroborate itself. Saying "consistent" here would
    // dress up an absence of evidence as agreement.
    if (quantifiedCount < 2) return 'INSUFFICIENT_EVIDENCE';
    if (conflicts.some((c) => c.severity === 'HIGH')) return 'CONFLICTING';
    if (conflicts.length > 0) return 'MINOR_DISCREPANCY';
    return 'CONSISTENT';
  }

  // ── Problem → evidence → confidence → impact → action ─────────────────────

  private buildAssessment(
    verdict: RealityVerdict,
    sources: RealitySourceAccount[],
    conflicts: RealityConflict[],
    missing: RealitySourceKey[],
    stale: RealitySourceKey[]
  ): RealityCheckAssessment {
    const evidence = sources
      .filter((s) => s.available)
      .map((s) => {
        const age =
          s.freshness.status === 'STALE' && s.freshness.ageDays !== null
            ? ` (last updated ${s.freshness.ageDays} days ago)`
            : '';
        return `${s.label}: ${s.statement}${age}`;
      });

    if (missing.length > 0) {
      evidence.push(
        `No data from: ${missing.map((k) => SOURCE_LABELS[k].toLowerCase()).join(', ')}.`
      );
    }

    // Confidence is about how much corroboration exists, not how alarming the
    // result is. Few sources, or stale ones, mean low confidence either way.
    const availableCount = sources.filter((s) => s.available).length;
    let confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    if (availableCount >= 4 && stale.length === 0) confidence = 'HIGH';
    else if (availableCount >= 3) confidence = 'MEDIUM';
    else confidence = 'LOW';

    switch (verdict) {
      case 'CONFLICTING': {
        const worst = conflicts[0]!;
        return {
          problem: `Records from different sources materially disagree about this project. ${worst.description}`,
          evidence,
          confidence,
          impact:
            'A discrepancy of this size means at least one official record is wrong. Until it is resolved, the project’s reported status cannot be relied on for payment, closure or public reporting.',
          recommendedAction:
            'Assign a field verification to establish the actual physical state of the works, and request the supporting documentation behind the expenditure figures.',
          disclaimer: DISCLAIMER,
        };
      }
      case 'MINOR_DISCREPANCY':
        return {
          problem: `Sources broadly agree but differ by more than the ${AGREEMENT_TOLERANCE}-point tolerance. ${conflicts[0]!.description}`,
          evidence,
          confidence,
          impact:
            'A gap this size is often ordinary reporting lag rather than a problem, but it should be reconciled before the project is closed.',
          recommendedAction:
            'Request an updated progress report from the implementing agency and re-check once it is filed.',
          disclaimer: DISCLAIMER,
        };
      case 'INSUFFICIENT_EVIDENCE':
        return {
          problem:
            'There is not enough independent data to cross-check this project. Fewer than two sources can express a completion figure.',
          evidence,
          confidence: 'LOW',
          impact:
            'This project currently cannot be verified either way. An absence of contradictory evidence is not the same as evidence that the works are sound.',
          recommendedAction:
            missing.includes('GEOSPATIAL')
              ? 'Record project coordinates so satellite verification becomes possible, and request a progress report from the implementing agency.'
              : 'Request a progress report from the implementing agency so an independent comparison becomes possible.',
          disclaimer: DISCLAIMER,
        };
      case 'CONSISTENT':
      default:
        return {
          problem: 'No contradictions were found between the available sources.',
          evidence,
          confidence,
          impact:
            stale.length > 0
              ? 'The sources agree, but some of them are stale, so this agreement reflects the position as last recorded rather than the position today.'
              : 'The available records corroborate one another. No verification priority is raised by this check.',
          recommendedAction:
            stale.length > 0
              ? 'Refresh the stale sources listed above, then re-run the check to confirm the agreement still holds.'
              : 'No action required from this check. Continue routine monitoring.',
          disclaimer: DISCLAIMER,
        };
    }
  }
}
