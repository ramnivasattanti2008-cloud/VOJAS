/**
 * M8: AI Explainer — LLM-safe explanation generator for findings
 *
 * The AI Explainer uses an LLM ONLY to summarize and explain pre-computed
 * structured findings. It does NOT generate risk scores independently.
 *
 * SAFETY PRINCIPLES:
 *   - Never invent evidence, numbers, or sources
 *   - Always work from structured evidence (signal IDs, evidence references)
 *   - Force JSON schema output and validate
 *   - Distinguish facts from inference
 *   - State uncertainty
 *   - Avoid accusations
 *   - Cite evidence IDs
 *   - Explain limitations
 *
 * The deterministic engine produces the structured facts. The LLM explains them.
 */

import type { CorrelatedFinding, RiskSignal, RiskFindingInput } from './types.js';

export interface AIExplanationInput {
  finding: CorrelatedFinding;
  signals: RiskSignal[];
  projectName: string;
  projectContext?: {
    approvedAmount?: number;
    sector?: string;
    status?: string;
  };
}

export interface AIExplanationOutput {
  summary: string;
  evidence: string[]; // Evidence IDs
  uncertainties: string[];
  recommendedVerification: string[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  limitations: string;
  naturalLanguageExplanation: string;
}

const EXPLAINER_SYSTEM_PROMPT = `You are a careful, conservative risk-analysis assistant for VOJAS — a public accountability platform.

Your role is to EXPLAIN pre-computed risk findings to human reviewers. You do NOT generate new scores, invent evidence, or make accusations.

STRICT RULES:
1. ONLY use evidence provided in the input. Never invent numbers, names, or sources.
2. Use cautious language: "potential", "may indicate", "suggests", "requires verification".
3. NEVER say "fraud", "corruption", "guilty", "criminal", or any accusatory language.
4. ALWAYS cite evidence IDs you were given.
5. ALWAYS state what could explain the anomaly alternatively.
6. ALWAYS recommend human verification actions.
7. ALWAYS state confidence and limitations.
8. Format output as JSON with the exact schema below.

JSON SCHEMA:
{
  "summary": "One-paragraph neutral summary of the finding",
  "evidence": ["id1", "id2"],
  "uncertainties": ["What could be wrong with this analysis"],
  "recommendedVerification": ["Specific verification action"],
  "confidence": "LOW | MEDIUM | HIGH",
  "limitations": "What this finding cannot establish",
  "naturalLanguageExplanation": "2-3 sentence human-readable explanation"
}`;

export class AIExplainer {
  private modelVersion: string;
  private promptVersion: string;

  constructor(modelVersion = 'mock', promptVersion = 'explain-v1.0') {
    this.modelVersion = modelVersion;
    this.promptVersion = promptVersion;
  }

  /**
   * Generate an explanation for a finding
   * In production, this would call an LLM API
   * For now, we generate a deterministic, structured explanation
   */
  async explain(input: AIExplanationInput): Promise<AIExplanationOutput> {
    const { finding, signals, projectName } = input;
    const evidenceIds = finding.evidenceChain.nodes.map(n => n.id);

    // Build summary
    const summary = this.buildSummary(finding, projectName);

    // Identify uncertainties
    const uncertainties = this.identifyUncertainties(finding, signals);

    // Recommend verification actions
    const recommendedVerification = this.recommendVerification(finding);

    // Build natural language explanation
    const naturalLanguageExplanation = this.buildNaturalLanguage(finding, signals, projectName);

    return {
      summary,
      evidence: evidenceIds,
      uncertainties,
      recommendedVerification,
      confidence: finding.confidence,
      limitations: finding.limitations,
      naturalLanguageExplanation,
    };
  }

  /**
   * Validate that the explanation doesn't contain prohibited language
   */
  validateExplanation(output: AIExplanationOutput): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const prohibitedWords = [
      'fraud', 'fraudulent',
      'corruption', 'corrupt',
      'guilty', 'guilt',
      'criminal',
      'stole', 'theft',
      'bribe', 'bribery',
      'embezzle', 'embezzlement',
      'scam',
    ];

    const allText = [
      output.summary,
      output.naturalLanguageExplanation,
      output.limitations,
      ...output.uncertainties,
      ...output.recommendedVerification,
    ].join(' ').toLowerCase();

    for (const word of prohibitedWords) {
      if (allText.includes(word)) {
        issues.push(`Prohibited language detected: "${word}"`);
      }
    }

    // Check that evidence is cited
    if (output.evidence.length === 0) {
      issues.push('No evidence IDs cited');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Build the prompt for the LLM (exported for testing/audit)
   */
  buildPrompt(input: AIExplanationInput): string {
    const evidenceContext = input.signals.map(s => ({
      signalId: s.id,
      type: s.signalType,
      source: s.sourceType,
      explanation: s.explanation,
      severity: s.severity,
      confidence: s.confidence,
      evidenceReferences: s.evidenceReferences,
    }));

    return JSON.stringify({
      system: EXPLAINER_SYSTEM_PROMPT,
      input: {
        projectName: input.projectName,
        finding: {
          type: input.finding.findingType,
          title: input.finding.title,
          description: input.finding.description,
          severity: input.finding.severity,
          riskScore: input.finding.riskScore,
          confidence: input.finding.confidence,
          recommendedAction: input.finding.recommendedAction,
          limitations: input.finding.limitations,
        },
        signals: evidenceContext,
        projectContext: input.projectContext,
      },
      instructions: 'Generate explanation JSON matching the schema. Be conservative and factual.',
    }, null, 2);
  }

  private buildSummary(finding: CorrelatedFinding, projectName: string): string {
    const signalCount = finding.signalIds.length;
    const sourceCount = finding.evidenceChain.sourceDiversity;

    if (finding.signalIds.length > 1) {
      return `Project "${projectName}" shows ${signalCount} independent risk signals from ${sourceCount} different source types. This correlated finding is stronger than any individual signal but requires human verification before any action is taken.`;
    }

    return `Project "${projectName}" has a single risk signal that requires human review. The signal is based on limited evidence and may have alternative explanations.`;
  }

  private identifyUncertainties(finding: CorrelatedFinding, signals: RiskSignal[]): string[] {
    const uncertainties: string[] = [];

    // Source quality uncertainties
    const lowConfidenceSignals = signals.filter(s => s.confidence === 'LOW');
    if (lowConfidenceSignals.length > 0) {
      uncertainties.push(`${lowConfidenceSignals.length} signal(s) have LOW confidence — alternative explanations are plausible.`);
    }

    // Satellite resolution
    if (signals.some(s => s.sourceType === 'satellite')) {
      uncertainties.push('Satellite resolution is 10m — features smaller than 10m are not visible. Underground work, interior work, and surface finishing cannot be observed.');
    }

    // Financial timing
    if (signals.some(s => s.sourceType === 'financial_record')) {
      uncertainties.push('Financial records may not reflect the most recent state — disbursement and reported progress can have different timeframes.');
    }

    // Citizen reports
    if (signals.some(s => s.sourceType === 'citizen_report')) {
      uncertainties.push('Citizen reports carry lower confidence than official records — they may reflect incomplete understanding of project status.');
    }

    // Common alternatives
    uncertainties.push('The anomaly may be explained by: (a) delayed reporting, (b) working conditions not captured in observations, (c) alternate payment schedules, or (d) data quality issues.');

    return uncertainties;
  }

  private recommendVerification(finding: CorrelatedFinding): string[] {
    const recs: string[] = [];

    if (finding.findingType === 'PROGRESS_INCONSISTENCY' || finding.findingType === 'MULTI_SIGNAL_PATTERN') {
      recs.push('Conduct field verification by visiting the project site.');
      recs.push('Review recent contractor reports and milestone records.');
    }

    if (finding.findingType === 'COST_CONCERN') {
      recs.push('Review project budget, cost estimates, and contractor agreements.');
      recs.push('Compare with peer projects in the same sector and geography.');
    }

    if (finding.findingType === 'LOCATION_CONCERN') {
      recs.push('Verify project location against official records and coordinates.');
      recs.push('Check district and constituency alignment.');
    }

    if (finding.severity === 'HIGH' || finding.severity === 'CRITICAL') {
      recs.push('Escalate to a senior reviewer for further assessment.');
    }

    if (recs.length === 0) {
      recs.push('Schedule a human review of the flagged concern.');
    }

    return recs;
  }

  private buildNaturalLanguage(finding: CorrelatedFinding, signals: RiskSignal[], projectName: string): string {
    const topSignals = signals.slice(0, 3);
    const signalDescriptions = topSignals.map(s => s.explanation).join(' Additionally, ');

    let explanation = `VOJAS has identified a potential anomaly in project "${projectName}": ${signalDescriptions}.`;
    explanation += ` This finding is based on ${finding.signalIds.length} signal(s) from ${finding.evidenceChain.sourceDiversity} different source type(s).`;
    explanation += ` The overall risk score is ${finding.riskScore}/100 with ${finding.confidence} confidence.`;
    explanation += ` This is NOT a determination of fraud or wrongdoing — it is a signal that requires human verification by authorized personnel.`;

    return explanation;
  }

  getModelVersion(): string {
    return this.modelVersion;
  }

  getPromptVersion(): string {
    return this.promptVersion;
  }
}
