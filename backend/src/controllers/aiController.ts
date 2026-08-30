import { z } from "zod";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { aiService } from "../services/aiService.js";

// ── Zod schemas ────────────────────────────────────────────────────────────────

const AnalyzeReportSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(5000),
});

const AnalyzeDocumentSchema = z.object({
  text: z.string().min(1).max(50000),
});

const ExplainAnomalySchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(5000),
  category: z.string(),
  severity: z.string(),
  riskScore: z.number().int().min(0).max(100),
  ruleCode: z.string().optional(),
  evidence: z.string().optional(),
  projectName: z.string().optional(),
});

const AnalyzePatternsSchema = z.object({
  expenditures: z.array(z.object({
    amount: z.number().positive(),
    vendor: z.string().optional(),
    invoiceNo: z.string().optional(),
    paidOn: z.string().optional(),
    category: z.string(),
  })).optional(),
  timeline: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    expectedEndDate: z.string().optional(),
    completedAt: z.string().optional(),
    status: z.string(),
  }).optional(),
});

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * POST /ai/analyze-report
 * AI analysis of a citizen report — keywords, corruption indicators, severity, summary.
 */
export const analyzeReport = asyncHandler(async (req, res) => {
  const { title, description } = AnalyzeReportSchema.parse(req.body);

  const result = aiService.analyzeReport(title, description);

  res.json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * POST /ai/analyze-patterns
 * AI pattern analysis on project financial + timeline data.
 */
export const analyzePatterns = asyncHandler(async (req, res) => {
  const input = AnalyzePatternsSchema.parse(req.body);

  const result = aiService.analyzeProjectPatterns(input);

  res.json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * POST /ai/explain-anomaly
 * Generate human-readable explanation for an anomaly.
 */
export const explainAnomaly = asyncHandler(async (req, res) => {
  const params = ExplainAnomalySchema.parse(req.body);

  const result = aiService.explainAnomaly(params);

  res.json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * POST /ai/analyze-document
 * Analyze text extracted from an uploaded document.
 */
export const analyzeDocument = asyncHandler(async (req, res) => {
  const { text } = AnalyzeDocumentSchema.parse(req.body);

  const result = aiService.analyzeDocument(text);

  res.json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});
