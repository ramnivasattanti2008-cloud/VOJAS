/**
 * AI Service — Phase 11
 *
 * A local, rule-based AI engine that works offline without any external API.
 * Designed as a pluggable architecture: the LLMProvider interface lets
 * you swap in a real OpenAI/Claude provider when an API key is configured.
 *
 * Modules:
 *  - TextClassifier   — analyzes report text for keywords, corruption signals, severity
 *  - PatternMatcher   — detects suspicious financial/timeline patterns
 *  - AnomalyExplainer — generates human-readable explanations
 *  - DocumentAnalyzer — extracts and scores text from uploaded documents
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AIAnalysisResult {
  keywords: string[];
  corruptionIndicators: string[];
  sentiment: "negative" | "neutral" | "positive";
  suggestedSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number; // 0-100
  summary: string;
}

export interface PatternMatch {
  pattern: string;
  description: string;
  score: number; // 0-100 contribution
  evidence: string[];
}

export interface PatternAnalysisResult {
  financialPatterns: PatternMatch[];
  timelinePatterns: PatternMatch[];
  geographicPatterns: PatternMatch[];
  overallRiskBoost: number; // additional risk points
}

export interface AnomalyExplanation {
  explanation: string;
  confidence: number; // 0-100
  contributingFactors: { factor: string; weight: number }[];
  recommendation: string;
}

export interface DocumentAnalysisResult {
  extractedText: string;
  wordCount: number;
  languageHint: string;
  flaggedPhrases: string[];
  suspiciousTerms: string[];
  riskScore: number; // 0-100
}

// ─────────────────────────────────────────────────────────────────────────────
// Corruption keyword dictionaries
// ─────────────────────────────────────────────────────────────────────────────

const CORRUPTION_KEYWORDS = [
  "bribe", "bribery", "kickback", "kick-back", "embezzlement", "embezzle",
  "fraud", "fraudulent", "scam", "hoarding", "black money", "hawala",
  "cartel", "collusion", "colluding", "rigged", "rigging", "fixing",
  "bureaucrat", "bureaucrats", "officials", "corruption", "corrupt",
  "diverted", "diverting", "siphoned", "siphoning", "siphon",
  "shell company", "front company", "ghost project", "fake invoice",
  "over-invoicing", "overinvoicing", "under-valuation", "undervaluation",
  "commission", "cut", "percentage", "payoff", "pay off",
];

const SEVERITY_ESCALATORS = [
  "murder", "threat", "threatened", "violence", "violent", "assault",
  "death", "died", "killed", "bribe", "murder", "illegal",
  "fake", "forged", "forgery", "fabricated", "fabrication",
  "massive", "crores", "lakhs", "crore", "lakh",
  "organised", "organized", "syndicate", "network", "ring",
];

const FINANCIAL_SUSPICION_KEYWORDS = [
  "over-priced", "overpriced", "over invoicing", "inflated", "inflating",
  "fake bill", "fabricated bill", "duplicate bill", "phony", "bogus",
  "cash payment", "unaccounted", "unaccounted cash", "no receipt",
];

// ─────────────────────────────────────────────────────────────────────────────
// Text Classifier
// ─────────────────────────────────────────────────────────────────────────────

export class TextClassifier {
  /**
   * Analyze report text and return structured analysis.
   */
  static analyze(title: string, description: string): AIAnalysisResult {
    const combined = `${title} ${description}`.toLowerCase();
    const words = combined.split(/\s+/);

    const keywords = this.extractKeywords(combined, words);
    const corruptionIndicators = this.detectCorruptionSignals(combined);
    const sentiment = this.analyzeSentiment(combined);
    const suggestedSeverity = this.inferSeverity(combined, corruptionIndicators);
    const confidence = this.computeConfidence(corruptionIndicators, keywords);
    const summary = this.generateSummary(title, keywords, corruptionIndicators, sentiment);

    return { keywords, corruptionIndicators, sentiment, suggestedSeverity, confidence, summary };
  }

  private static extractKeywords(text: string, words: string[]): string[] {
    // Government + MPLAD relevant stop words
    const stop = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "will", "would", "could",
      "should", "may", "might", "can", "this", "that", "these", "those",
      "i", "we", "they", "he", "she", "it", "me", "him", "her", "us",
      "in", "on", "at", "by", "for", "with", "about", "against", "between",
      "into", "through", "during", "before", "after", "above", "below",
      "from", "to", "of", "and", "or", "but", "if", "so", "as", "per",
      "all", "each", "every", "both", "few", "more", "most", "other",
      "some", "such", "no", "not", "only", "own", "same", "than", "too",
      "very", "just", "now", "also", "back", "here", "there", "when",
      "where", "why", "how", "what", "which", "who", "whom", "whose",
      "project", "work", "road", "construction", "building", "area",
    ]);

    // Word frequency — common MPLAD terms get boosted
    const boost = new Set([
      "road", "bridge", "school", "hospital", "water", "drainage", "sanitation",
      "electricity", "ration", "scheme", "fund", "money", "payment", "contract",
      "contractor", "tender", "approved", "sanctioned", "budget", "amount",
      "labour", "labor", "material", "bill", "invoice", "document",
    ]);

    const freq: Record<string, number> = {};
    for (const w of words) {
      const clean = w.replace(/[^a-z]/g, "");
      if (clean.length < 3 || stop.has(clean)) continue;
      freq[clean] = (freq[clean] || 0) + (boost.has(clean) ? 2 : 1);
    }

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([w]) => w);
  }

  private static detectCorruptionSignals(text: string): string[] {
    const matches: string[] = [];
    const lower = text.toLowerCase();

    for (const kw of CORRUPTION_KEYWORDS) {
      if (lower.includes(kw)) matches.push(kw);
    }

    // Check for patterns like "₹XX crore" + suspicious keyword
    const rupeePattern = /(?:₹|rs\.?|rupees?)\s*[\d.,]+\s*(?:crore|lakh| crore| lakh)/i;
    if (rupeePattern.test(lower)) {
      matches.push("high_value_amount");
    }

    // Check for anonymous + suspicious (stronger signal)
    if (lower.includes("anonymous") && CORRUPTION_KEYWORDS.some(k => lower.includes(k))) {
      matches.push("anonymous_with_evidence");
    }

    return [...new Set(matches)]; // deduplicate
  }

  private static analyzeSentiment(text: string): "negative" | "neutral" | "positive" {
    const negWords = [
      "poor", "bad", "terrible", "awful", "worst", "failed", "failure",
      "delay", "delayed", "slow", "neglected", "neglect", "corrupt",
      "fake", "fraud", "illegal", "wrong", "complaint", "issue", "problem",
      "damage", "damaged", "broken", "unfinished", "incomplete", "scam",
    ];
    const posWords = [
      "good", "excellent", "completed", "finished", "progress", "improved",
      "successful", "working", "proper", "verified", "certified", "approved",
    ];

    const words = text.toLowerCase().split(/\s+/);
    let neg = 0, pos = 0;
    for (const w of words) {
      if (negWords.includes(w)) neg++;
      if (posWords.includes(w)) pos++;
    }

    if (neg > pos + 1) return "negative";
    if (pos > neg + 1) return "positive";
    return "neutral";
  }

  private static inferSeverity(
    text: string,
    corruptionIndicators: string[]
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    const lower = text.toLowerCase();

    // Escalators
    const hasEscalator = SEVERITY_ESCALATORS.some(w => lower.includes(w));
    const hasFinancialSuspicion = FINANCIAL_SUSPICION_KEYWORDS.some(w => lower.includes(w));
    const corruptionCount = corruptionIndicators.length;

    // Pattern: multiple corruption signals + financial keywords = high
    if (hasEscalator && corruptionCount >= 2) return "CRITICAL";
    if (corruptionCount >= 3) return "HIGH";
    if (hasFinancialSuspicion || corruptionCount >= 1) return "MEDIUM";
    return "LOW";
  }

  private static computeConfidence(
    corruptionIndicators: string[],
    keywords: string[]
  ): number {
    // Base confidence from keyword richness
    let score = 40 + Math.min(keywords.length * 3, 30);

    // Boost from corruption indicators
    score += Math.min(corruptionIndicators.length * 8, 24);

    // Boost from specificity (longer description)
    score = Math.min(score, 92);

    return Math.round(score);
  }

  private static generateSummary(
    title: string,
    keywords: string[],
    corruptionIndicators: string[],
    sentiment: string
  ): string {
    if (corruptionIndicators.length > 0) {
      return `Report titled "${title}" contains ${corruptionIndicators.length} corruption-related signals and ${keywords.length} key topic terms. Overall sentiment is ${sentiment}.`;
    }
    return `Report titled "${title}" discusses ${keywords.slice(0, 5).join(", ")} with ${sentiment} sentiment. No strong corruption indicators detected.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern Matcher
// ─────────────────────────────────────────────────────────────────────────────

export interface ExpenditureRecord {
  amount: number;
  vendor?: string;
  invoiceNo?: string;
  paidOn?: string;
  category: string;
}

export interface TimelineRecord {
  startDate?: string;
  endDate?: string;
  expectedEndDate?: string;
  completedAt?: string;
  status: string;
}

export interface PatternMatcherInput {
  expenditures?: ExpenditureRecord[];
  timeline?: TimelineRecord;
}

export class PatternMatcher {
  /**
   * Detect suspicious financial and timeline patterns.
   */
  static analyze(input: PatternMatcherInput): PatternAnalysisResult {
    const financialPatterns: PatternMatch[] = [];
    const timelinePatterns: PatternMatch[] = [];
    const geographicPatterns: PatternMatch[] = [];

    if (input.expenditures?.length) {
      financialPatterns.push(...this.detectFinancialPatterns(input.expenditures));
    }

    if (input.timeline) {
      timelinePatterns.push(...this.detectTimelinePatterns(input.timeline));
    }

    const overallRiskBoost = Math.min(
      financialPatterns.reduce((s, p) => s + p.score, 0) +
      timelinePatterns.reduce((s, p) => s + p.score, 0) +
      geographicPatterns.reduce((s, p) => s + p.score, 0),
      30 // cap at 30 extra risk points
    );

    return { financialPatterns, timelinePatterns, geographicPatterns, overallRiskBoost };
  }

  private static detectFinancialPatterns(expenditures: ExpenditureRecord[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    // 1. Round number pattern — many bills are exact round lakhs
    const roundBills = expenditures.filter(e => {
      const r = e.amount % 100000;
      return r === 0 || r === e.amount;
    });
    if (roundBills.length / expenditures.length >= 0.4) {
      patterns.push({
        pattern: "ROUND_NUMBER_CLUSTERING",
        description: "A high proportion of bills are exact round amounts — a known manipulation tactic.",
        score: 25,
        evidence: roundBills.map(e => `₹${e.amount.toLocaleString("en-IN")}${e.invoiceNo ? ` (Bill #${e.invoiceNo})` : ""}`),
      });
    }

    // 2. Single vendor dominance — one contractor received all payments
    const vendorCounts: Record<string, number> = {};
    for (const e of expenditures) {
      const v = e.vendor?.trim() || "UNNAMED";
      vendorCounts[v] = (vendorCounts[v] || 0) + 1;
    }
    const topVendor = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1])[0];
    if (topVendor && topVendor[1] / expenditures.length >= 0.7 && topVendor[0] !== "UNNAMED") {
      patterns.push({
        pattern: "SINGLE_VENDOR_DOMINANCE",
        description: `Vendor "${topVendor[0]}" received ${topVendor[1]}/${expenditures.length} payments — potential cartel or favoritism.`,
        score: 20,
        evidence: [`${topVendor[1]} of ${expenditures.length} payments to same vendor`],
      });
    }

    // 3. Unusual amount spikes — one payment far exceeds the average
    if (expenditures.length > 2) {
      const amounts = expenditures.map(e => e.amount);
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const spikes = expenditures.filter(e => e.amount > avg * 3);
      if (spikes.length > 0) {
        patterns.push({
          pattern: "AMOUNT_SPIKE",
          description: "One or more payments significantly exceed the average — requires verification.",
          score: 18,
          evidence: spikes.map(e =>
            `₹${e.amount.toLocaleString("en-IN")} (avg: ₹${Math.round(avg).toLocaleString("en-IN")})`
          ),
        });
      }
    }

    // 4. Duplicate invoice numbers
    const invoiceNos = expenditures.map(e => e.invoiceNo?.trim()).filter(Boolean) as string[];
    const dupes = invoiceNos.filter((v, i, a) => a.indexOf(v) !== i);
    if (dupes.length > 0) {
      patterns.push({
        pattern: "DUPLICATE_INVOICE",
        description: "Duplicate invoice numbers detected — possible double-billing.",
        score: 30,
        evidence: [...new Set(dupes)],
      });
    }

    // 5. CONTINGENCY_CATEGORY overuse
    const contingencyCount = expenditures.filter(e => e.category === "CONTINGENCY").length;
    if (contingencyCount / expenditures.length > 0.25) {
      patterns.push({
        pattern: "CONTINGENCY_OVERUSE",
        description: "Over 25% of expenditures are in CONTINGENCY category — may hide unapproved spending.",
        score: 15,
        evidence: [`${contingencyCount}/${expenditures.length} in CONTINGENCY`],
      });
    }

    return patterns;
  }

  private static detectTimelinePatterns(timeline: TimelineRecord): PatternMatch[] {
    const patterns: PatternMatch[] = [];
    const now = new Date();

    // 1. Expected end date in the past but not completed
    if (timeline.expectedEndDate && timeline.status !== "COMPLETED" && timeline.status !== "VERIFIED") {
      const exp = new Date(timeline.expectedEndDate);
      if (exp < now) {
        const daysOverdue = Math.round((now.getTime() - exp.getTime()) / 86400000);
        patterns.push({
          pattern: "STALLED_PROJECT",
          description: `Project is ${daysOverdue} days overdue without completion — potential timeline manipulation or abandonment.`,
          score: 20,
          evidence: [`Expected: ${timeline.expectedEndDate}`, `Status: ${timeline.status}`],
        });
      }
    }

    // 2. Completion suspiciously close to expected date (on-time completion when overall progress is poor)
    if (timeline.completedAt && timeline.expectedEndDate) {
      const comp = new Date(timeline.completedAt);
      const exp = new Date(timeline.expectedEndDate);
      const daysDiff = Math.abs(comp.getTime() - exp.getTime()) / 86400000;
      if (daysDiff <= 3 && timeline.status !== "COMPLETED") {
        patterns.push({
          pattern: "SUSPICIOUS_TIMING",
          description: "Completion date is suspiciously close to the expected date — may indicate date manipulation.",
          score: 15,
          evidence: [`Completed: ${timeline.completedAt}`, `Expected: ${timeline.expectedEndDate}`],
        });
      }
    }

    return patterns;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Anomaly Explainer
// ─────────────────────────────────────────────────────────────────────────────

export class AnomalyExplainer {
  /**
   * Generate a human-readable explanation for an anomaly.
   */
  static explain(params: {
    title: string;
    description: string;
    category: string;
    severity: string;
    riskScore: number;
    ruleCode?: string;
    evidence?: string;
    projectName?: string;
    expenditures?: ExpenditureRecord[];
  }): AnomalyExplanation {
    const factors: { factor: string; weight: number }[] = [];

    // Severity weight
    const sevMap: Record<string, number> = { CRITICAL: 40, HIGH: 30, MEDIUM: 20, LOW: 10 };
    factors.push({ factor: `Severity: ${params.severity}`, weight: sevMap[params.severity] ?? 15 });

    // Category weight
    const catMap: Record<string, { factor: string; weight: number }> = {
      DUPLICATE: { factor: "Duplicate project detected", weight: 25 },
      COST_OUTLIER: { factor: "Cost significantly deviates from sector baseline", weight: 25 },
      BUDGET_OVERRUN: { factor: "Expenditure exceeds sanctioned budget", weight: 30 },
      TIMELINE: { factor: "Timeline anomaly detected", weight: 20 },
      STALLED: { factor: "Project stalled without completion", weight: 20 },
      FINANCIAL: { factor: "Financial irregularity pattern", weight: 25 },
      GEOGRAPHIC: { factor: "Geographic data inconsistency", weight: 15 },
      COMPLIANCE: { factor: "Missing required verification or documentation", weight: 15 },
    };
    const catInfo = catMap[params.category];
    if (catInfo) factors.push(catInfo);

    // Rule-based explanation text
    let explanation: string;
    switch (params.category) {
      case "DUPLICATE":
        explanation = `AI analysis flags "${params.title}" as a potential duplicate. ${params.projectName ? `The project "${params.projectName}" shows similar characteristics to another registered project in the same district/sector.` : "The description and financial parameters closely match an existing project entry."}`;
        break;

      case "COST_OUTLIER":
        explanation = `The sanctioned cost for "${params.title}" is unusually high or low compared to sector benchmarks. ${params.evidence ? `Evidence: ${params.evidence.substring(0, 120)}.` : ""} This may indicate estimation errors, corruption, or scope misrepresentation.`;
        break;

      case "BUDGET_OVERRUN":
        explanation = `"${params.title}" has expenditure records that appear to exceed the sanctioned budget. ${params.expenditures?.length ? `${params.expenditures.length} expenditure records were analyzed.` : ""} This pattern warrants immediate financial audit.`;
        break;

      case "TIMELINE":
        explanation = `The timeline data for "${params.title}" contains anomalies such as impossible date sequences, completion dates before start dates, or completion dates that contradict the project status.`;
        break;

      case "STALLED":
        explanation = `"${params.title}" has remained in-progress for an unusually long duration without completion or cancellation. The expected end date has passed without project closure.`;
        break;

      case "FINANCIAL":
        explanation = `AI pattern analysis detected suspicious financial behavior in "${params.title}": ${params.evidence ? params.evidence.substring(0, 150) : "unusual expenditure patterns that deviate from normal project spending."}`;
        break;

      case "GEOGRAPHIC":
        explanation = `The geographic coordinates provided for "${params.title}" appear inconsistent — either unverifiable, in an unlikely location, or conflicting with district/state information.`;
        break;

      case "COMPLIANCE":
        explanation = `AI compliance check on "${params.title}" found missing or inconsistent mandatory fields: ${params.evidence ? params.evidence.substring(0, 100) : "required documentation incomplete or unverifiable."}`;
        break;

      default:
        explanation = `AI analysis of "${params.title}" (${params.category}) found: ${params.description.substring(0, 200)}.`;
    }

    // Normalize factors to 100%
    const total = factors.reduce((s, f) => s + f.weight, 0);
    const contributingFactors = factors.map(f => ({
      ...f,
      weight: Math.round((f.weight / total) * 100),
    }));

    const confidence = Math.round(
      60 + Math.min(params.riskScore / 5, 30) + (params.ruleCode ? 5 : 0)
    );

    const recommendation = params.severity === "CRITICAL"
      ? "Immediate investigation recommended. Escalate to senior officer and initiate financial audit."
      : params.severity === "HIGH"
      ? "Prioritized review within 48 hours. Cross-reference with expenditure records and project documents."
      : params.severity === "MEDIUM"
      ? "Schedule for routine review. Gather additional evidence before taking action."
      : "Log for periodic monitoring. Low priority but note for future pattern analysis.";

    return { explanation, confidence: Math.min(confidence, 95), contributingFactors, recommendation };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Analyzer
// ─────────────────────────────────────────────────────────────────────────────

export class DocumentAnalyzer {
  /**
   * Analyze extracted text from an uploaded document.
   */
  static analyze(text: string): DocumentAnalysisResult {
    const cleaned = text.trim();
    const words = cleaned.split(/\s+/).filter(w => w.length > 2);
    const lower = cleaned.toLowerCase();

    const flaggedPhrases = this.detectFlaggedPhrases(lower);
    const suspiciousTerms = this.detectSuspiciousTerms(lower);
    const wordCount = words.length;
    const languageHint = this.detectLanguage(lower);

    // Risk score: base + flagged phrases + suspicious terms
    let riskScore = 20;
    riskScore += flaggedPhrases.length * 10;
    riskScore += suspiciousTerms.length * 8;
    riskScore = Math.min(riskScore, 95);

    return {
      extractedText: cleaned,
      wordCount,
      languageHint,
      flaggedPhrases,
      suspiciousTerms,
      riskScore,
    };
  }

  private static detectFlaggedPhrases(text: string): string[] {
    const flagged = [
      "certificate", "certified", "attested", "notarized",
      "approved by", "sanctioned by", "authorized by",
      "no objection", "noc ", "n.o.c",
    ];
    return flagged.filter(p => text.includes(p));
  }

  private static detectSuspiciousTerms(text: string): string[] {
    const terms: string[] = [];
    if (/over-?\s?price|inflate/i.test(text)) terms.push("over-pricing detected");
    if (/fake|fabricat|forged/i.test(text)) terms.push("fabrication indicators");
    if (/duplicate|double[- ]?billing/i.test(text)) terms.push("duplicate billing");
    if (/cash\s+payment|no\s+receipt/i.test(text)) terms.push("unaccounted cash");
    if (/round\s+figure|rounded\s+amount/i.test(text)) terms.push("round-figure amounts");
    return terms;
  }

  private static detectLanguage(text: string): string {
    // Simple heuristic — check for Devanagari (Hindi) Unicode range
    if (/[ऀ-ॿ]/.test(text)) return "Hindi (Devanagari)";
    if (text.split(/\s+/).length < 10) return "Insufficient text";
    return "English";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AI Service (orchestrator)
// ─────────────────────────────────────────────────────────────────────────────

export const aiService = {
  /**
   * Full analysis of a citizen report.
   */
  analyzeReport(title: string, description: string) {
    return TextClassifier.analyze(title, description);
  },

  /**
   * Pattern analysis for project financial + timeline data.
   */
  analyzeProjectPatterns(input: PatternMatcherInput) {
    return PatternMatcher.analyze(input);
  },

  /**
   * Generate explanation for an existing anomaly.
   */
  explainAnomaly(params: {
    title: string;
    description: string;
    category: string;
    severity: string;
    riskScore: number;
    ruleCode?: string;
    evidence?: string;
    projectName?: string;
    expenditures?: ExpenditureRecord[];
  }) {
    return AnomalyExplainer.explain(params);
  },

  /**
   * Analyze document text.
   */
  analyzeDocument(text: string) {
    return DocumentAnalyzer.analyze(text);
  },
};
