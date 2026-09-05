/**
 * M8: Multi-Signal AI Risk & Anomaly Engine — Core Types
 *
 * This module defines the normalized signal architecture and the
 * deterministic rule engine that produces risk findings.
 *
 * KEY PRINCIPLE: Risk ≠ Guilt. Every finding is framed as
 * "potential anomaly" or "requires verification" — never as confirmed fraud.
 */

// ── Signal Severity ─────────────────────────────────────────────
export type SignalSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SignalConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type RiskLevel = 'LOW' | 'GUARDED' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FindingConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type FindingStatus = 'NEW' | 'ACKNOWLEDGED' | 'UNDER_REVIEW' | 'VERIFICATION_REQUIRED' | 'RESOLVED' | 'DISMISSED' | 'ESCALATED';

// ── Signal Types ────────────────────────────────────────────────
export type SignalTypeEnum =
  | 'SATELLITE_CHANGE'
  | 'PROGRESS_FINANCIAL_MISMATCH'
  | 'PROJECT_DELAY'
  | 'COST_ANOMALY'
  | 'DUPLICATE_PROJECT'
  | 'GEOGRAPHIC_INCONSISTENCY'
  | 'DOCUMENT_INCONSISTENCY'
  | 'CITIZEN_OFFICIAL_DISCREPANCY'
  | 'CONTRACTOR_PATTERN'
  | 'ENVIRONMENTAL_RISK';

// ── Source Types ────────────────────────────────────────────────
export type SourceType =
  | 'satellite'
  | 'financial_record'
  | 'document'
  | 'citizen_report'
  | 'contractor'
  | 'field_verification'
  | 'government_record'
  | 'progress_report';

// ── Core Signal ─────────────────────────────────────────────────
export interface RiskSignal {
  id: string;
  projectId: string;
  signalType: SignalTypeEnum;
  sourceType: SourceType;
  sourceId: string | null;
  detectedAt: Date;
  observationDate: Date | null;
  severity: SignalSeverity;
  confidence: SignalConfidence;
  value: number | null;
  expectedValue: number | null;
  deviation: number | null;
  explanation: string;
  evidenceReferences: string[];
  metadata: Record<string, unknown> | null;
  algorithmVersion: string;
}

// ── Evidence Node (for evidence graph) ──────────────────────────
export interface EvidenceNode {
  id: string;
  type: 'progress_report' | 'satellite_observation' | 'financial_record' | 'document' | 'citizen_report' | 'contractor' | 'field_verification';
  label: string;
  value: string | number | null;
  source: string;
  date: Date | null;
  quality: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
}

// ── Evidence Chain ──────────────────────────────────────────────
export interface EvidenceChain {
  projectId: string;
  nodes: EvidenceNode[];
  edges: Array<{ from: string; to: string; relationship: string }>;
  sourceDiversity: number; // count of distinct source types
  independentSources: SourceType[];
}

// ── Risk Rule ───────────────────────────────────────────────────
export interface RiskRule {
  id: string;
  name: string;
  code: string;
  category: string;
  version: string;
  status: 'ENABLED' | 'DISABLED';
  severityModifier: number; // points added to base score
  confidenceModifier: 'LOW' | 'MEDIUM' | 'HIGH';
  explanationTemplate: string;
  enabled: boolean;
  lastRun: Date | null;
  matchCount: number;
  conditions: RuleConditions;
}

export interface RuleConditions {
  // Generic condition structure — each rule defines its own
  requiredSignals?: SignalTypeEnum[];
  minSeverity?: SignalSeverity;
  maxConfidence?: SignalConfidence;
  sourceDiversity?: number;
  temporalWindowDays?: number;
  custom?: Record<string, unknown>;
}

// ── Rule Evaluation Result ──────────────────────────────────────
export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  ruleCode: string;
  triggered: boolean;
  severity: SignalSeverity;
  confidence: SignalConfidence;
  signal: RiskSignal | null;
  explanation: string;
  evidenceReferences: string[];
  matchCount: number;
}

// ── Correlated Finding ──────────────────────────────────────────
export interface CorrelatedFinding {
  findingType: string;
  title: string;
  description: string;
  severity: SignalSeverity;
  riskScore: number; // 0-100
  confidence: FindingConfidence;
  signalIds: string[];
  evidenceChain: EvidenceChain;
  explanation: string;
  limitations: string;
  recommendedAction: string;
  contributors: Array<{
    signalId: string;
    signalType: SignalTypeEnum;
    sourceType: SourceType;
    contribution: number;
    explanation: string;
  }>;
}

// ── Risk Finding (M8) ───────────────────────────────────────────
export interface RiskFindingInput {
  projectId: string;
  type: string;
  title: string;
  description: string;
  severity: SignalSeverity;
  riskScore: number;
  confidence: FindingConfidence;
  status: FindingStatus;
  recommendedAction: string;
  limitations: string;
  signalIds: string[];
  evidence: Record<string, unknown>;
  algorithmVersion: string;
}

// ── Scoring Weights (documented methodology) ────────────────────
export interface ScoringWeights {
  // Base points per signal severity
  severityPoints: Record<SignalSeverity, number>;
  // Confidence multiplier
  confidenceMultiplier: Record<SignalConfidence, number>;
  // Source diversity bonus (max +10)
  sourceDiversityBonus: number;
  // Correlation bonus for independent multi-signal findings (max +20)
  correlationBonus: number;
  // Temporal correlation bonus (max +10)
  temporalCorrelationBonus: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  severityPoints: {
    LOW: 5,
    MEDIUM: 15,
    HIGH: 30,
    CRITICAL: 50,
  },
  confidenceMultiplier: {
    LOW: 0.5,
    MEDIUM: 1.0,
    HIGH: 1.2,
  },
  sourceDiversityBonus: 2, // per distinct source type beyond first
  correlationBonus: 5, // per independent signal pair
  temporalCorrelationBonus: 3, // per temporal correlation cluster
};

// ── Data Quality Gate ───────────────────────────────────────────
export interface DataQualityAssessment {
  projectId: string;
  sourcesAvailable: boolean;
  sourceCount: number;
  freshnessDays: number | null;
  completenessScore: number; // 0-100
  geometryValid: boolean;
  observationQuality: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  overallPass: boolean;
  reasons: string[];
}

// ── Job States ──────────────────────────────────────────────────
export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type JobType = 'SIGNAL_GENERATION' | 'RULE_EVALUATION' | 'CORRELATION' | 'RISK_CALCULATION' | 'FINDING_GENERATION';

export interface RiskAnalysisJob {
  id: string;
  projectId: string;
  type: JobType;
  status: JobStatus;
  progress: number; // 0-100
  results: string[] | null;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
  startedAt: Date | null;
}

// ── Aggregation Types ───────────────────────────────────────────
export interface NationalRiskSummary {
  totalProjects: number;
  totalFindings: number;
  riskDistribution: Record<RiskLevel, number>;
  highRiskProjects: number;
  delayedProjects: number;
  unresolvedFindings: number;
  averageRiskScore: number;
}

export interface DistrictRiskSummary {
  state: string;
  district: string;
  projectCount: number;
  activeFindings: number;
  highRiskCount: number;
  averageRiskScore: number;
}

export interface RiskTrend {
  date: string;
  newFindings: number;
  resolvedFindings: number;
  averageRiskScore: number;
  highRiskProjects: number;
}

export interface GeoHotspot {
  latitude: number;
  longitude: number;
  projectCount: number;
  findingsCount: number;
  averageRiskScore: number;
  district: string;
  state: string;
}
