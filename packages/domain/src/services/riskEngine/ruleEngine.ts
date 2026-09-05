/**
 * M8: Multi-Signal AI Risk & Anomaly Engine — Core Rule Engine
 *
 * This is the deterministic rule engine that:
 * 1. Loads rule definitions from the database
 * 2. Evaluates each rule against project data
 * 3. Produces RiskSignal records
 * 4. Correlates signals to detect multi-signal patterns
 * 5. Computes risk scores with documented methodology
 * 6. Generates explainable findings
 *
 * ARCHITECTURE:
 *   DATA SOURCES → SIGNAL GENERATION → RULE ENGINE → CORRELATION → RISK SCORE → FINDING
 *
 * ANTI-FABRICATION PRINCIPLES:
 *   - Every signal must have verifiable evidence references
 *   - Never invent numbers or evidence
 *   - Confidence reflects data quality, not model guesswork
 *   - Risk score is transparent: contributors must add up
 *   - Limitations section explains what could explain the anomaly
 */

import { PrismaClient } from '@vojas/db';
import type {
  RiskSignal,
  RiskRule,
  RuleEvaluationResult,
  CorrelatedFinding,
  EvidenceChain,
  DataQualityAssessment,
  ScoringWeights,
  SignalSeverity,
  SignalConfidence,
  FindingConfidence,
  SourceType,
  EvidenceNode,
  RiskLevel,
} from './types.js';
import { DEFAULT_SCORING_WEIGHTS } from './types.js';

// ── Rule Engine ────────────────────────────────────────────────────

export class RiskRuleEngine {
  private prisma: PrismaClient;
  private weights: ScoringWeights;

  constructor(prisma: PrismaClient, weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS) {
    this.prisma = prisma;
    this.weights = weights;
  }

  /**
   * Load all enabled rules from the database
   */
  async loadRules(): Promise<RiskRule[]> {
    const rules = await this.prisma.riskRule.findMany({
      where: { enabled: true },
      orderBy: { name: 'asc' },
    });
    return rules.map(this.toDomainRule);
  }

  /**
   * Load a specific rule by code
   */
  async loadRuleByCode(code: string): Promise<RiskRule | null> {
    const rule = await this.prisma.riskRule.findFirst({
      where: { category: code, enabled: true },
    });
    return rule ? this.toDomainRule(rule) : null;
  }

  /**
   * Evaluate a single rule against project data
   * Returns null if rule not triggered, or a RiskSignal if triggered
   */
  async evaluateRule(
    rule: RiskRule,
    projectId: string,
    projectData: ProjectDataSnapshot
  ): Promise<RuleEvaluationResult> {
    // This is the base implementation - specific rules will override
    const handler = this.getRuleHandler(rule.code);
    if (handler) {
      return handler.evaluate(projectData, projectId);
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleCode: rule.code,
      triggered: false,
      severity: 'LOW',
      confidence: 'LOW',
      signal: null,
      explanation: `Rule ${rule.code} not implemented or no matching handler`,
      evidenceReferences: [],
      matchCount: 0,
    };
  }

  /**
   * Get the rule-specific handler
   */
  private getRuleHandler(ruleCode: string): RuleHandler | null {
    const handlerClass = RULE_HANDLERS[ruleCode];
    if (!handlerClass) return null;
    return new handlerClass(this.prisma, this.weights);
  }

  private toDomainRule(r: {
    id: string;
    name: string;
    category: string;
    version: string;
    status: any;
    conditions: any;
    severityModifier: string;
    confidenceModifier: string;
    explanationTemplate: string;
    enabled: boolean;
    lastRun: Date | null;
    matchCount: number;
  }): RiskRule {
    return {
      id: r.id,
      name: r.name,
      code: r.category,
      category: r.category,
      version: r.version,
      status: r.status as 'ENABLED' | 'DISABLED',
      severityModifier: parseInt(r.severityModifier) || 0,
      confidenceModifier: r.confidenceModifier as any,
      explanationTemplate: r.explanationTemplate,
      enabled: r.enabled,
      lastRun: r.lastRun,
      matchCount: r.matchCount,
      conditions: r.conditions,
    };
  }
}

// ── Rule Data Snapshot ───────────────────────────────────────────

/**
 * Snapshot of project data needed for rule evaluation
 * Loaded at the start of analysis to ensure consistent evaluation
 */
export interface ProjectDataSnapshot {
  projectId: string;
  project: {
    id: string;
    name: string;
    approvedAmount: number | null;
    spentAmount: number | null;
    startDate: Date | null;
    expectedEndDate: Date | null;
    completedAt: Date | null;
    latitude: number | null;
    longitude: number | null;
    district: string;
    state: string;
    sector: string;
    status: string;
  };
  // Satellite observations (latest)
  latestSatelliteObs: {
    id: string;
    observationDate: Date;
    cloudCover: number;
    resolution: number;
    centerLat: number | null;
    centerLng: number | null;
    constructionScore: number | null;
    changeClassification: string | null;
  } | null;
  // Progress observations
  progressObservations: Array<{
    id: string;
    reportDate: Date;
    reportedProgress: number;
    reportSource: string;
    observedChange: number | null;
    verificationResult: string | null;
  }>;
  // Financial observations
  financialObservations: Array<{
    id: string;
    date: Date;
    type: string;
    amount: number;
    category: string | null;
    description: string;
  }>;
  // Documents
  documents: Array<{
    id: string;
    type: string;
    title: string;
    uploadedAt: Date;
    status: string;
  }>;
  // Citizen reports
  citizenReports: Array<{
    id: string;
    submittedAt: Date;
    category: string;
    severity: string;
    status: string;
  }>;
  // Contractor
  contractor: {
    id: string | null;
    name: string | null;
    totalPaid: number;
    projectCount: number;
  } | null;
  // M7 Change analyses (for progress/satellite correlation)
  changeAnalyses: Array<{
    id: string;
    analysisType: string;
    changeClassification: string;
    confidence: string;
    changePercent: number | null;
    reportedProgressComparison: string | null;
    methodology: string;
    limitations: string | null;
  }> | null;
  // Anomaly records
  anomalies: Array<{
    id: string;
    category: string;
    severity: string;
    status: string;
    description: string;
  }>;
}

// ── Rule Handler Interface ───────────────────────────────────────

interface RuleHandler {
  evaluate(data: ProjectDataSnapshot, projectId: string): Promise<RuleEvaluationResult>;
  computeEvidence(nodeId: string, projectData: ProjectDataSnapshot): Promise<EvidenceNode | null>;
}

/**
 * Base class for all rules providing common utilities
 */
export abstract class BaseRuleHandler implements RuleHandler {
  protected prisma: PrismaClient;
  protected weights: ScoringWeights;

  constructor(prisma: PrismaClient, weights: ScoringWeights) {
    this.prisma = prisma;
    this.weights = weights;
  }

  abstract code: string;

  abstract evaluate(data: ProjectDataSnapshot, projectId: string): Promise<RuleEvaluationResult>;

  async computeEvidence(nodeId: string, projectData: ProjectDataSnapshot): Promise<EvidenceNode | null> {
    // Override in specific rules
    return null;
  }

  protected buildExplanation(template: string, context: Record<string, unknown>): string {
    // Simple mustache-like template replacement
    let result = template;
    for (const [key, value] of Object.entries(context)) {
      result = result.replace(new RegExp(`\{\{${key}\}\}`, 'g'), String(value));
    }
    return result;
  }

  protected pickSeverity(score: number): SignalSeverity {
    if (score >= 70) return 'CRITICAL';
    if (score >= 40) return 'HIGH';
    if (score >= 15) return 'MEDIUM';
    return 'LOW';
  }

  protected pickConfidence(hasSufficientData: boolean, hasMultipleSources: boolean): SignalConfidence {
    if (!hasSufficientData) return 'LOW';
    if (hasMultipleSources) return 'HIGH';
    return 'MEDIUM';
  }
}

// ── Rule Registry ───────────────────────────────────────────────

// Registry mapping rule codes to handler classes
const RULE_HANDLERS: Record<string, new (prisma: PrismaClient, weights: ScoringWeights) => RuleHandler> = {};

export function registerRule(handlerClass: new (prisma: PrismaClient, weights: ScoringWeights) => RuleHandler) {
  RULE_HANDLERS[handlerClass.prototype.code] = handlerClass;
}

// ── Rule Implementations ─────────────────────────────────────────

/**
 * Rule 1: PROGRESS / SATELLITE MISMATCH
 * If reported progress is high AND observable satellite change is minimal/low
 * AND satellite evidence quality is sufficient → potential inconsistency signal
 */
export class ProgressSatelliteMismatchRule extends BaseRuleHandler {
  code = 'RULE_PROGRESS_SATELLITE_MISMATCH';

  async evaluate(data: ProjectDataSnapshot, projectId: string): Promise<RuleEvaluationResult> {
    const { project, latestSatelliteObs, progressObservations } = data;

    // 1. Check if we have enough progress data
    const latestProgress = progressObservations
      .sort((a, b) => b.reportDate.getTime() - a.reportDate.getTime())[0];

    if (!latestProgress || !latestSatelliteObs) {
      return this.noTrigger('Insufficient data for progress-satellite comparison');
    }

    // 2. Calculate reported progress ratio
    const reportedProgress = project.spentAmount && project.approvedAmount
      ? (project.spentAmount / project.approvedAmount) * 100
      : latestProgress.reportedProgress;

    const reportedProgressPercent = reportedProgress;

    // 3. Check satellite change
    const changeVal = latestSatelliteObs.changeClassification;
    const satelliteChangePercent = typeof changeVal === 'number' ? changeVal : (parseFloat(String(changeVal)) || 0);
    const hasObservableChange = satelliteChangePercent > 1;

    // 4. Check evidence quality
    const cloudCoverOk = latestSatelliteObs.cloudCover < 50;
    const resolutionOk = latestSatelliteObs.resolution <= 10;
    const qualityOk = cloudCoverOk && resolutionOk;

    // 5. Determine if mismatched
    const isHighProgress = reportedProgressPercent > 50;
    const isLowChange = !hasObservableChange || satelliteChangePercent < 5;

    if (isHighProgress && isLowChange && qualityOk) {
      const deviation = reportedProgressPercent - (satelliteChangePercent * 10);
      const points = Math.min(30, Math.abs(deviation));

      return {
        ruleId: '',
        ruleName: 'Progress / Satellite Mismatch',
        ruleCode: this.code,
        triggered: true,
        severity: this.pickSeverity(points),
        confidence: this.pickConfidence(qualityOk, true),
        signal: {
          id: `signal-${projectId}-${Date.now()}`,
          projectId,
          signalType: 'PROGRESS_FINANCIAL_MISMATCH',
          sourceType: 'satellite',
          sourceId: latestSatelliteObs.id,
          detectedAt: new Date(),
          observationDate: latestSatelliteObs.observationDate,
          severity: this.pickSeverity(points),
          confidence: this.pickConfidence(qualityOk, true),
          value: reportedProgressPercent,
          expectedValue: satelliteChangePercent * 10,
          deviation,
          explanation: `Reported progress (${reportedProgressPercent.toFixed(1)}%) does not match observable satellite change (${satelliteChangePercent}%).`,
          evidenceReferences: [latestSatelliteObs.id, latestProgress.id],
          metadata: {
            cloudCover: latestSatelliteObs.cloudCover,
            resolution: latestSatelliteObs.resolution,
            constructionScore: latestSatelliteObs.constructionScore,
          },
          algorithmVersion: 'rule-engine-v1.0',
        },
        explanation: `Rule triggered: Project reports ${reportedProgressPercent.toFixed(1)}% completion but satellite shows minimal observable change. This may indicate progress reporting discrepancy.`,
        evidenceReferences: [latestSatelliteObs.id, latestProgress.id],
        matchCount: 1,
      };
    }

    return this.noTrigger('Progress-satellite alignment detected or insufficient data');
  }

  private noTrigger(reason: string): RuleEvaluationResult {
    return {
      ruleId: '',
      ruleName: 'Progress / Satellite Mismatch',
      ruleCode: this.code,
      triggered: false,
      severity: 'LOW',
      confidence: 'LOW',
      signal: null,
      explanation: reason,
      evidenceReferences: [],
      matchCount: 0,
    };
  }
}

/**
 * Rule 2: FINANCIAL / PHYSICAL MISMATCH
 * If financial expenditure is disproportionately high AND reported physical progress is low
 * → potential financial-progress inconsistency
 */
export class FinancialPhysicalMismatchRule extends BaseRuleHandler {
  code = 'RULE_FINANCIAL_PHYSICAL_MISMATCH';

  async evaluate(data: ProjectDataSnapshot, projectId: string): Promise<RuleEvaluationResult> {
    const { project, progressObservations, financialObservations } = data;

    // 1. Calculate financial utilization ratio
    if (!project.approvedAmount || project.approvedAmount === 0) {
      return this.noTrigger('No approved amount for financial comparison');
    }

    const spentAmount = project.spentAmount || 0;
    const utilizationPercent = (spentAmount / project.approvedAmount) * 100;

    // 2. Get latest progress
    const latestProgress = progressObservations
      .sort((a, b) => b.reportDate.getTime() - a.reportDate.getTime())[0];

    if (!latestProgress) {
      return this.noTrigger('No progress observations available');
    }

    const reportedProgress = latestProgress.reportedProgress;

    // 3. Check for mismatch
    const highSpending = utilizationPercent > 70;
    const lowProgress = reportedProgress < 50;

    if (highSpending && lowProgress) {
      const deviation = utilizationPercent - reportedProgress;
      const points = Math.min(25, Math.abs(deviation));

      return {
        ruleId: '',
        ruleName: 'Financial / Physical Mismatch',
        ruleCode: 'RULE_FINANCIAL_PHYSICAL_MISMATCH',
        triggered: true,
        severity: this.pickSeverity(points),
        confidence: this.pickConfidence(true, true),
        signal: {
          id: `signal-${projectId}-${Date.now()}`,
          projectId,
          signalType: 'PROGRESS_FINANCIAL_MISMATCH',
          sourceType: 'financial_record',
          sourceId: financialObservations[0]?.id || '',
          detectedAt: new Date(),
          observationDate: financialObservations[0]?.date || null,
          severity: this.pickSeverity(points),
          confidence: 'MEDIUM',
          value: utilizationPercent,
          expectedValue: reportedProgress,
          deviation,
          explanation: `Financial utilization (${utilizationPercent.toFixed(1)}%) suggests higher progress than reported (${reportedProgress}%).`,
          evidenceReferences: [latestProgress.id, ...financialObservations.map(f => f.id)],
          metadata: {
            spentAmount,
            approvedAmount: project.approvedAmount,
          },
          algorithmVersion: 'rule-engine-v1.0',
        },
        explanation: `Financial analysis shows ${utilizationPercent.toFixed(1)}% utilization vs ${reportedProgress}% reported progress.`,
        evidenceReferences: [latestProgress.id],
        matchCount: 1,
      };
    }

    return this.noTrigger('Financial and physical progress are aligned');
  }

  private noTrigger(reason: string): RuleEvaluationResult {
    return {
      ruleId: '',
      ruleName: 'Financial / Physical Mismatch',
      ruleCode: 'RULE_FINANCIAL_PHYSICAL_MISMATCH',
      triggered: false,
      severity: 'LOW',
      confidence: 'LOW',
      signal: null,
      explanation: reason,
      evidenceReferences: [],
      matchCount: 0,
    };
  }
}

/**
 * Rule 3: DELAY
 * If expected milestone date passed AND reported progress remains below milestone expectation
 * → project delay signal
 */
export class ProjectDelayRule extends BaseRuleHandler {
  code = 'RULE_PROJECT_DELAY';

  async evaluate(data: ProjectDataSnapshot, projectId: string): Promise<RuleEvaluationResult> {
    const { project, progressObservations } = data;
    const now = new Date();

    // 1. Check if project has an end date
    if (!project.expectedEndDate) {
      return this.noTrigger('No expected end date');
    }

    // 2. Check if deadline has passed
    if (project.expectedEndDate > now) {
      return this.noTrigger('Project deadline not yet reached');
    }

    // 3. Check current progress vs expected
    const daysElapsed = (now.getTime() - new Date(project.startDate || now).getTime()) / (1000 * 60 * 60 * 24);
    const expectedProgress = Math.min(100, (daysElapsed / 365) * 100); // roughly annual timeline

    const latestProgress = progressObservations
      .sort((a, b) => b.reportDate.getTime() - a.reportDate.getTime())[0];

    if (!latestProgress) {
      return this.noTrigger('No progress data to compare against timeline');
    }

    const currentProgress = latestProgress.reportedProgress;
    const isBehind = currentProgress < expectedProgress - 10; // 10% tolerance

    if (isBehind) {
      const delayPercent = expectedProgress - currentProgress;
      const points = Math.min(20, Math.abs(delayPercent));

      return {
        ruleId: '',
        ruleName: 'Project Delay',
        ruleCode: 'RULE_PROJECT_DELAY',
        triggered: true,
        severity: this.pickSeverity(points),
        confidence: 'MEDIUM',
        signal: {
          id: `signal-${projectId}-${Date.now()}`,
          projectId,
          signalType: 'PROJECT_DELAY',
          sourceType: 'progress_report',
          sourceId: latestProgress.id,
          detectedAt: now,
          observationDate: latestProgress.reportDate,
          severity: this.pickSeverity(points),
          confidence: 'MEDIUM',
          value: currentProgress,
          expectedValue: expectedProgress,
          deviation: delayPercent,
          explanation: `Project is ${delayPercent.toFixed(1)}% behind expected timeline progress.`,
          evidenceReferences: [latestProgress.id],
          metadata: {
            expectedEndDate: project.expectedEndDate.toISOString(),
            daysOverdue: Math.floor(daysElapsed - 365),
          },
          algorithmVersion: 'rule-engine-v1.0',
        },
        explanation: `Project deadline ${project.expectedEndDate.toISOString().split('T')[0]} passed with only ${currentProgress.toFixed(1)}% progress recorded.`,
        evidenceReferences: [latestProgress.id],
        matchCount: 1,
      };
    }

    return this.noTrigger('Project is on schedule');
  }

  private noTrigger(reason: string): RuleEvaluationResult {
    return {
      ruleId: '',
      ruleName: 'Project Delay',
      ruleCode: 'RULE_PROJECT_DELAY',
      triggered: false,
      severity: 'LOW',
      confidence: 'LOW',
      signal: null,
      explanation: reason,
      evidenceReferences: [],
      matchCount: 0,
    };
  }
}

// ── Register Core Rules ─────────────────────────────────────────

export function registerCoreRules() {
  registerRule(ProgressSatelliteMismatchRule);
  registerRule(FinancialPhysicalMismatchRule);
  registerRule(ProjectDelayRule);
  // Additional rules (CostAnomaly, DuplicateProject, etc.) would be registered here
}

// ── Export Types ──────────────────────────────────────────────────

export type {
  RiskSignal,
  RiskRule,
  RuleEvaluationResult,
  CorrelatedFinding,
  EvidenceChain,
  DataQualityAssessment,
  ScoringWeights,
  EvidenceNode,
}