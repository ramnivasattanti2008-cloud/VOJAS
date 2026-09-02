import { api } from "./api";

export interface AIExplanation {
  explanation: string;
  confidence: number;
  contributingFactors: { factor: string; weight: number }[];
  recommendation: string;
}

export interface PatternMatch {
  pattern: string;
  description: string;
  score: number;
  evidence: string[];
}

export interface PatternAnalysisResult {
  financialPatterns: PatternMatch[];
  timelinePatterns: PatternMatch[];
  geographicPatterns: PatternMatch[];
  overallRiskBoost: number;
}

export interface ReportAIAnalysis {
  keywords: string[];
  corruptionIndicators: string[];
  sentiment: "negative" | "neutral" | "positive";
  suggestedSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  summary: string;
}

export const aiApi = {
  /**
   * POST /ai/explain-anomaly
   * Returns a human-readable AI explanation for an anomaly.
   * Pure transformation — does NOT change the anomaly status.
   */
  async explainAnomaly(params: {
    title: string;
    description: string;
    category: string;
    severity: string;
    riskScore: number;
    ruleCode?: string;
    evidence?: string;
    projectName?: string;
  }): Promise<AIExplanation> {
    return api.post<AIExplanation>("/ai/explain-anomaly", params);
  },

  /**
   * POST /ai/analyze-report
   * Analyze a citizen report text for keywords, corruption signals, severity.
   */
  async analyzeReport(title: string, description: string): Promise<ReportAIAnalysis> {
    return api.post<ReportAIAnalysis>("/ai/analyze-report", { title, description });
  },

  /**
   * POST /ai/analyze-patterns
   * Pattern analysis on project financial + timeline data.
   */
  async analyzePatterns(input: {
    expenditures?: { amount: number; vendor?: string; invoiceNo?: string; paidOn?: string; category: string }[];
    timeline?: { startDate?: string; endDate?: string; expectedEndDate?: string; completedAt?: string; status: string };
  }): Promise<PatternAnalysisResult> {
    return api.post<PatternAnalysisResult>("/ai/analyze-patterns", input);
  },
};
