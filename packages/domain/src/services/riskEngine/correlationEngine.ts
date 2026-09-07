/**
 * M8: Correlation Engine — Correlates independent signals to detect multi-signal patterns
 *
 * The correlation engine implements the key M8 differentiator:
 * - Detect when multiple independent signals point to the same underlying anomaly
 * - Avoid double-counting signals that share the same evidence
 * - Increase confidence through source diversity
 * - Generate correlated findings when multi-signal pattern detected
 *
 * KEY ANTI-PATTERN: "Satellite mismatch" + "progress mismatch" caused by the same
 * underlying incomplete observation should NOT count as two independent signals.
 */

import { PrismaClient } from '@vojas/db';
import type {
  RiskSignal,
  CorrelatedFinding,
  EvidenceChain,
  EvidenceNode,
  SourceType,
  SignalTypeEnum,
  SignalSeverity,
  FindingConfidence,
  ScoringWeights,
} from './types.js';

export class CorrelationEngine {
  private prisma: PrismaClient;
  private weights: ScoringWeights;

  constructor(prisma: PrismaClient, weights: ScoringWeights) {
    this.prisma = prisma;
    this.weights = weights;
  }

  /**
   * Correlate signals and produce findings
   * Groups signals by type and detects multi-signal patterns
   */
  async correlate(signals: RiskSignal[]): Promise<CorrelatedFinding[]> {
    if (signals.length === 0) return [];

    const findings: CorrelatedFinding[] = [];

    // 1. Group signals by their underlying evidence (to detect double-counting)
    const evidenceGroups = this.groupByEvidence(signals);

    // 2. Detect multi-signal patterns
    const multiSignalPatterns = this.detectMultiSignalPatterns(evidenceGroups);

    for (const pattern of multiSignalPatterns) {
      const finding = await this.buildCorrelatedFinding(pattern);
      if (finding) findings.push(finding);
    }

    // 3. For signals not part of multi-signal patterns, create individual findings
    for (const group of evidenceGroups) {
      if (group.isPartOfMultiSignalPattern) continue;

      // Single-signal finding
      for (const signal of group.signals) {
        const finding = this.buildSingleSignalFinding(signal);
        if (finding) findings.push(finding);
      }
    }

    return findings;
  }

  /**
   * Build the evidence graph for a set of signals
   */
  buildEvidenceGraph(signals: RiskSignal[]): EvidenceChain {
    const nodes: EvidenceNode[] = [];
    const edges: Array<{ from: string; to: string; relationship: string }> = [];
    const sources: Set<SourceType> = new Set();

    for (const signal of signals) {
      sources.add(signal.sourceType);
      for (const ref of signal.evidenceReferences) {
        nodes.push({
          id: ref,
          type: this.mapSourceToNodeType(signal.sourceType),
          label: this.buildNodeLabel(signal),
          value: signal.value,
          source: signal.sourceType,
          date: signal.observationDate,
          quality: signal.confidence === 'HIGH' ? 'HIGH' : signal.confidence === 'MEDIUM' ? 'MEDIUM' : 'LOW',
        });
      }
    }

    return {
      projectId: signals[0]?.projectId || '',
      nodes,
      edges,
      sourceDiversity: sources.size,
      independentSources: Array.from(sources),
    };
  }

  /**
   * Group signals by shared evidence references
   * Signals sharing the same evidence source are NOT independent
   */
  private groupByEvidence(signals: RiskSignal[]): EvidenceGroup[] {
    const groups: EvidenceGroup[] = [];
    const assigned = new Set<string>();

    for (const signal of signals) {
      if (assigned.has(signal.id)) continue;

      const group: EvidenceGroup = {
        groupId: `group-${signal.id}`,
        signals: [signal],
        sharedEvidence: new Set(signal.evidenceReferences),
        isPartOfMultiSignalPattern: false,
      };
      assigned.add(signal.id);

      // Find other signals that share evidence with this one
      for (const other of signals) {
        if (assigned.has(other.id)) continue;
        if (other.id === signal.id) continue;

        const hasSharedEvidence = other.evidenceReferences.some(ref =>
          group.sharedEvidence.has(ref)
        );

        if (hasSharedEvidence) {
          group.signals.push(other);
          other.evidenceReferences.forEach(ref => group.sharedEvidence.add(ref));
          assigned.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Detect multi-signal patterns:
   * - Multiple independent signals pointing to same concern
   * - Pattern: (financial_mismatch) + (satellite_mismatch) + (citizen_report)
   *   All on same project with high progress → potential multi-signal finding
   */
  private detectMultiSignalPatterns(groups: EvidenceGroup[]): EvidenceGroup[] {
    const patterns: EvidenceGroup[] = [];

    for (const group of groups) {
      const signalTypes = new Set(group.signals.map(s => s.signalType));
      const sourceTypes = new Set(group.signals.map(s => s.sourceType));

      // Multi-signal pattern criteria:
      // 1. At least 2 different signal types
      // 2. At least 2 different source types (independent)
      if (signalTypes.size >= 2 && sourceTypes.size >= 2) {
        group.isPartOfMultiSignalPattern = true;
        patterns.push(group);
      }
    }

    return patterns;
  }

  private async buildCorrelatedFinding(group: EvidenceGroup): Promise<CorrelatedFinding | null> {
    if (group.signals.length < 2) return null;

    const projectId = group.signals[0].projectId;
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    // Build contributors
    const contributors = group.signals.map(signal => ({
      signalId: signal.id,
      signalType: signal.signalType,
      sourceType: signal.sourceType,
      contribution: this.weights.severityPoints[signal.severity] * this.weights.confidenceMultiplier[signal.confidence],
      explanation: signal.explanation,
    }));

    // Calculate risk score: base + diversity bonus + correlation bonus
    const baseScore = contributors.reduce((sum, c) => sum + c.contribution, 0);
    const sourceTypes = new Set(group.signals.map(s => s.sourceType));
    const diversityBonus = Math.min(10, (sourceTypes.size - 1) * this.weights.sourceDiversityBonus);
    const correlationBonus = Math.min(20, (group.signals.length - 1) * this.weights.correlationBonus);

    const totalScore = Math.min(100, baseScore + diversityBonus + correlationBonus);
    const riskScore = Math.round(totalScore);

    // Determine severity and confidence
    const severity = this.scoreToSeverity(riskScore);
    const confidence = this.computeGroupConfidence(group);

    // Build evidence graph
    const evidenceChain = this.buildEvidenceGraph(group.signals);

    // Detect the pattern type
    const patternType = this.detectPatternType(group.signals);

    return {
      findingType: patternType,
      title: `Multi-signal ${this.formatPatternName(patternType)}: ${project?.name || 'Project'}`,
      description: this.buildCorrelatedDescription(group, project?.name || 'Project'),
      severity,
      riskScore,
      confidence,
      signalIds: group.signals.map(s => s.id),
      evidenceChain,
      explanation: this.buildCorrelatedExplanation(group, patternType),
      limitations: this.buildCorrelatedLimitations(group),
      recommendedAction: this.recommendActionForPattern(patternType, severity),
      contributors,
    };
  }

  private buildSingleSignalFinding(signal: RiskSignal): CorrelatedFinding | null {
    if (signal.severity === 'LOW') return null;

    const baseScore = this.weights.severityPoints[signal.severity] * this.weights.confidenceMultiplier[signal.confidence];
    const riskScore = Math.min(100, Math.round(baseScore));
    const patternType = this.mapSignalToPattern(signal.signalType);

    return {
      findingType: patternType,
      title: `${this.formatPatternName(patternType)}: ${signal.signalType}`,
      description: signal.explanation,
      severity: signal.severity,
      riskScore,
      confidence: signal.confidence === 'HIGH' ? 'HIGH' : signal.confidence === 'MEDIUM' ? 'MEDIUM' : 'LOW',
      signalIds: [signal.id],
      evidenceChain: this.buildEvidenceGraph([signal]),
      explanation: signal.explanation,
      limitations: this.buildSingleSignalLimitations(signal),
      recommendedAction: this.recommendActionForPattern(patternType, signal.severity),
      contributors: [
        {
          signalId: signal.id,
          signalType: signal.signalType,
          sourceType: signal.sourceType,
          contribution: baseScore,
          explanation: signal.explanation,
        },
      ],
    };
  }

  private detectPatternType(signals: RiskSignal[]): string {
    const types = new Set(signals.map(s => s.signalType));

    if (types.has('PROGRESS_FINANCIAL_MISMATCH') && (types.has('SATELLITE_CHANGE') || types.has('PROGRESS_FINANCIAL_MISMATCH'))) {
      return 'PROGRESS_INCONSISTENCY';
    }
    if (types.has('PROJECT_DELAY') && types.has('CITIZEN_OFFICIAL_DISCREPANCY')) {
      return 'EXECUTION_CONCERN';
    }
    if (types.has('COST_ANOMALY') && types.has('PROGRESS_FINANCIAL_MISMATCH')) {
      return 'FINANCIAL_CONCERN';
    }
    if (types.has('GEOGRAPHIC_INCONSISTENCY') && types.has('SATELLITE_CHANGE')) {
      return 'LOCATION_CONCERN';
    }

    return 'MULTI_SIGNAL_PATTERN';
  }

  private mapSignalToPattern(signalType: SignalTypeEnum): string {
    const map: Record<SignalTypeEnum, string> = {
      'SATELLITE_CHANGE': 'SATELLITE_INCONSISTENCY',
      'PROGRESS_FINANCIAL_MISMATCH': 'PROGRESS_INCONSISTENCY',
      'PROJECT_DELAY': 'DELAY',
      'COST_ANOMALY': 'COST_CONCERN',
      'DUPLICATE_PROJECT': 'POSSIBLE_DUPLICATE',
      'GEOGRAPHIC_INCONSISTENCY': 'LOCATION_CONCERN',
      'DOCUMENT_INCONSISTENCY': 'DOCUMENT_CONCERN',
      'CITIZEN_OFFICIAL_DISCREPANCY': 'CITIZEN_DISCREPANCY',
      'CONTRACTOR_PATTERN': 'CONTRACTOR_PATTERN',
      'ENVIRONMENTAL_RISK': 'ENVIRONMENTAL_CONCERN',
    };
    return map[signalType] || 'GENERAL';
  }

  private formatPatternName(type: string): string {
    return type.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private buildCorrelatedDescription(group: EvidenceGroup, projectName: string): string {
    const signalCount = group.signals.length;
    const sourceCount = new Set(group.signals.map(s => s.sourceType)).size;
    return `Project "${projectName}" shows ${signalCount} independent signals from ${sourceCount} source types. This correlated finding is stronger evidence than any individual signal alone.`;
  }

  private buildCorrelatedExplanation(group: EvidenceGroup, patternType: string): string {
    const lines: string[] = [];
    lines.push(`Multiple independent signals have been detected for this project:`);
    lines.push('');

    for (const signal of group.signals) {
      lines.push(`• [${signal.sourceType}] ${signal.signalType}: ${signal.explanation}`);
    }

    lines.push('');
    lines.push(`The presence of ${group.signals.length} independent signals from ${new Set(group.signals.map(s => s.sourceType)).size} different source types increases the weight of this finding. However, this does NOT mean wrongdoing has occurred — it means the project deserves human verification.`);
    lines.push('');
    lines.push(`VOJAS does not determine guilt. This finding requires human review and verification.`);

    return lines.join('\n');
  }

  private buildCorrelatedLimitations(group: EvidenceGroup): string {
    const lines: string[] = [
      'Multi-signal findings are stronger than individual signals, but limitations remain:',
      '• Signals may share underlying causes that are not yet identified.',
      '• Source quality varies — citizen reports carry less weight than official records.',
      '• Satellite observations have resolution limits (typically 10m).',
      '• Financial data may be incomplete or pending verification.',
      '• This finding does not imply fraud, corruption, or wrongdoing. It is a signal that deserves human review.',
      '',
      'This finding must NOT be used to make accusations. It is intended for authorized reviewers to investigate.',
    ];
    return lines.join('\n');
  }

  private buildSingleSignalLimitations(signal: RiskSignal): string {
    return [
      'Single-source signal carries limited evidence weight.',
      `Source type: ${signal.sourceType} has known reliability characteristics.`,
      'Satellite resolution is 10m — features smaller than 10m are not visible.',
      'This finding represents a potential anomaly, not a confirmed issue.',
      'Requires human verification before action is taken.',
    ].join('\n');
  }

  private recommendActionForPattern(patternType: string, severity: SignalSeverity): string {
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      return 'REQUEST_FIELD_VERIFICATION: Conduct physical site inspection and review supporting documents.';
    }
    if (patternType === 'POSSIBLE_DUPLICATE') {
      return 'REQUEST_DOCUMENT_REVIEW: Review project records to confirm or rule out duplication.';
    }
    if (patternType === 'COST_CONCERN') {
      return 'REQUEST_FINANCIAL_REVIEW: Examine project budgets, cost estimates, and contractor agreements.';
    }
    if (patternType === 'DELAY') {
      return 'REQUEST_PROGRESS_REVIEW: Verify current project status and timeline.';
    }
    return 'REQUEST_VERIFICATION: Schedule human review of the flagged concern.';
  }

  private scoreToSeverity(score: number): SignalSeverity {
    if (score >= 70) return 'CRITICAL';
    if (score >= 40) return 'HIGH';
    if (score >= 15) return 'MEDIUM';
    return 'LOW';
  }

  private computeGroupConfidence(group: EvidenceGroup): FindingConfidence {
    const confidences = group.signals.map(s => s.confidence);
    const highCount = confidences.filter(c => c === 'HIGH').length;
    const mediumCount = confidences.filter(c => c === 'MEDIUM').length;
    const sourceTypes = new Set(group.signals.map(s => s.sourceType));

    if (highCount >= 2 || (highCount >= 1 && sourceTypes.size >= 3)) return 'HIGH';
    if (highCount + mediumCount >= 2 && sourceTypes.size >= 2) return 'MEDIUM';
    return 'LOW';
  }

  private buildNodeLabel(signal: RiskSignal): string {
    return `${signal.signalType} (${signal.sourceType})`;
  }

  private mapSourceToNodeType(source: SourceType): EvidenceNode['type'] {
    const map: Record<SourceType, EvidenceNode['type']> = {
      satellite: 'satellite_observation',
      financial_record: 'financial_record',
      document: 'document',
      citizen_report: 'citizen_report',
      contractor: 'contractor',
      field_verification: 'field_verification',
      government_record: 'document',
      progress_report: 'progress_report',
    };
    return map[source] || 'document';
  }
}

interface EvidenceGroup {
  groupId: string;
  signals: RiskSignal[];
  sharedEvidence: Set<string>;
  isPartOfMultiSignalPattern: boolean;
}
