/**
 * M8: Risk Scorer — Computes transparent, explainable risk scores
 *
 * DOCUMENTED SCORING METHODOLOGY:
 *
 * Risk Score = Base Score + Bonuses
 * Base Score = Σ (signal severity points × confidence multiplier)
 * Bonuses:
 *   - Source Diversity Bonus: +2 per distinct source type beyond first (max +10)
 *   - Correlation Bonus: +5 per independent signal pair (max +20)
 *   - Temporal Correlation Bonus: +3 per temporal cluster (max +10)
 *
 * Severity points:
 *   LOW: 5, MEDIUM: 15, HIGH: 30, CRITICAL: 50
 *
 * Confidence multipliers:
 *   LOW: 0.5, MEDIUM: 1.0, HIGH: 1.2
 *
 * Score is capped at 100.
 *
 * ANTI-FABRICATION:
 *   - Score must always be traceable to specific signals
 *   - Every contributor must be listed with its contribution
 *   - Limitations must be stated
 */

import type {
  RiskSignal,
  CorrelatedFinding,
  ScoringWeights,
  RiskLevel,
  FindingConfidence,
} from './types.js';

export class RiskScorer {
  private weights: ScoringWeights;

  constructor(weights: ScoringWeights) {
    this.weights = weights;
  }

  /**
   * Compute risk score for a project from signals and findings
   */
  computeProjectRiskScore(signals: RiskSignal[], findings: CorrelatedFinding[]): ProjectRiskResult {
    // 1. Calculate base score from all signals
    let baseScore = 0;
    const contributors: ScoreContributor[] = [];

    for (const signal of signals) {
      const points = this.weights.severityPoints[signal.severity];
      const multiplier = this.weights.confidenceMultiplier[signal.confidence];
      const contribution = points * multiplier;
      baseScore += contribution;

      contributors.push({
        sourceId: signal.id,
        sourceType: signal.signalType,
        severity: signal.severity,
        confidence: signal.confidence,
        basePoints: points,
        multiplier,
        contribution,
        label: `${signal.signalType} (${signal.sourceType})`,
      });
    }

    // 2. Calculate source diversity bonus
    const sourceTypes = new Set(signals.map(s => s.sourceType));
    const sourceDiversityBonus = Math.min(
      10,
      Math.max(0, sourceTypes.size - 1) * this.weights.sourceDiversityBonus
    );

    // 3. Calculate temporal correlation bonus (based on findings)
    const temporalBonus = Math.min(
      10,
      findings.length * this.weights.temporalCorrelationBonus
    );

    // 4. Calculate correlation bonus (multi-signal findings)
    const multiSignalFindings = findings.filter(f => f.signalIds.length > 1);
    const correlationBonus = Math.min(
      20,
      multiSignalFindings.length * this.weights.correlationBonus
    );

    // 5. Apply findings adjustments (findings can override individual signal scores)
    for (const finding of findings) {
      const findingContribution = finding.riskScore;
      baseScore = Math.max(baseScore, findingContribution);
    }

    // 6. Total score
    const totalScore = Math.min(
      100,
      Math.round(baseScore + sourceDiversityBonus + correlationBonus + temporalBonus)
    );

    // 7. Determine risk level
    const riskLevel = this.scoreToRiskLevel(totalScore);

    // 8. Determine confidence
    const confidence = this.computeOverallConfidence(signals, findings);

    return {
      score: totalScore,
      riskLevel,
      confidence,
      contributors,
      sourceDiversityBonus,
      correlationBonus,
      temporalBonus,
      sourceTypes: Array.from(sourceTypes),
      signalCount: signals.length,
      findingCount: findings.length,
      methodology: this.buildMethodologyText(
        totalScore, baseScore, sourceDiversityBonus, correlationBonus, temporalBonus, contributors
      ),
    };
  }

  /**
   * Compute risk score for a single finding
   */
  computeFindingRiskScore(finding: CorrelatedFinding): number {
    const baseScore = finding.contributors.reduce((sum, c) => sum + c.contribution, 0);
    const sourceTypes = new Set(finding.contributors.map(c => c.sourceType));
    const diversityBonus = Math.min(10, (sourceTypes.size - 1) * this.weights.sourceDiversityBonus);
    const correlationBonus = finding.signalIds.length > 1
      ? Math.min(20, (finding.signalIds.length - 1) * this.weights.correlationBonus)
      : 0;

    return Math.min(100, Math.round(baseScore + diversityBonus + correlationBonus));
  }

  /**
   * Score to risk level mapping (documented thresholds)
   */
  private scoreToRiskLevel(score: number): RiskLevel {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 35) return 'MEDIUM';
    if (score >= 15) return 'GUARDED';
    return 'LOW';
  }

  private computeOverallConfidence(
    signals: RiskSignal[],
    findings: CorrelatedFinding[]
  ): FindingConfidence {
    const highSignals = signals.filter(s => s.confidence === 'HIGH').length;
    const totalSignals = signals.length;
    const hasHighQualityFinding = findings.some(f => f.confidence === 'HIGH');

    if (highSignals >= 2 || (highSignals >= 1 && hasHighQualityFinding)) {
      return 'HIGH';
    }
    if (highSignals + signals.filter(s => s.confidence === 'MEDIUM').length >= 2) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  private buildMethodologyText(
    totalScore: number,
    baseScore: number,
    sourceDiversityBonus: number,
    correlationBonus: number,
    temporalBonus: number,
    contributors: ScoreContributor[]
  ): string {
    const lines: string[] = [];
    lines.push(`RISK SCORE: ${totalScore} / 100`);
    lines.push(`LEVEL: ${this.scoreToRiskLevel(totalScore)}`);
    lines.push('');
    lines.push('METHODOLOGY:');
    lines.push(`  Base score (from signals): ${Math.round(baseScore)}`);
    lines.push(`  Source diversity bonus: +${sourceDiversityBonus}`);
    lines.push(`  Correlation bonus: +${correlationBonus}`);
    lines.push(`  Temporal bonus: +${temporalBonus}`);
    lines.push(`  Total: ${Math.round(baseScore)} + ${sourceDiversityBonus} + ${correlationBonus} + ${temporalBonus} = ${totalScore}`);
    lines.push('');
    lines.push('CONTRIBUTORS:');
    for (const c of contributors) {
      lines.push(`  ${c.label}: +${Math.round(c.contribution)} (${c.severity} severity, ${c.confidence} confidence)`);
    }
    if (contributors.length === 0) {
      lines.push('  (no signals contributing to score)');
    }
    lines.push('');
    lines.push('IMPORTANT: This score represents the AI system\'s assessment of potential risk.');
    lines.push('It does NOT indicate fraud, corruption, or wrongdoing.');
    lines.push('Every finding requires human verification by authorized personnel.');
    return lines.join('\n');
  }
}

export interface ProjectRiskResult {
  score: number;
  riskLevel: RiskLevel;
  confidence: FindingConfidence;
  contributors: ScoreContributor[];
  sourceDiversityBonus: number;
  correlationBonus: number;
  temporalBonus: number;
  sourceTypes: string[];
  signalCount: number;
  findingCount: number;
  methodology: string;
}

export interface ScoreContributor {
  sourceId: string;
  sourceType: string;
  severity: string;
  confidence: string;
  basePoints: number;
  multiplier: number;
  contribution: number;
  label: string;
}
