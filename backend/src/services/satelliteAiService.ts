/**
 * Satellite AI Analysis Service — VOJAS
 *
 * Takes a list of satellite captures and produces a development assessment:
 * - Progress summary (LLM-generated if OpenAI key is set, otherwise template-based)
 * - Anomaly detection (algorithmic: halts, accelerations, vegetation loss, dormancy)
 * - Timeline analysis grouped by quarter
 * - Statistical aggregation
 * - Recommended next steps
 *
 * Designed to work without OpenAI for demo/deployment without keys.
 */

import { logger } from "../utils/logger.js";
import type { SatelliteCapture } from "./satelliteService.js";

export interface SatelliteAnomaly {
  type:
    | "PROGRESS_HALT"
    | "ACCELERATION"
    | "VEGETATION_LOSS"
    | "OVERRUN"
    | "SUSPICIOUS_DORMANCY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  detectedDate: string;
}

export interface TimelineInsight {
  period: string;
  developmentScore: number;
  delta: number;
  insights: string;
}

export interface SatelliteAssessment {
  id: string;
  projectId: string;
  generatedAt: string;
  overallScore: number;
  progressSummary: string;
  keyObservations: string[];
  anomalies: SatelliteAnomaly[];
  confidence: number;
  nextSteps: string[];
  timelineAnalysis: TimelineInsight[];
  statistics: {
    earliestCapture: string;
    latestCapture: string;
    totalCaptures: number;
    avgCloudCover: number;
    averageDevelopmentRate: number;
    peakDevelopmentWeek: string;
    constructionActive: boolean;
  };
}

// ── Anomaly detection ─────────────────────────────────────────────────────────

function detectAnomalies(
  captures: SatelliteCapture[],
  projectId: string
): SatelliteAnomaly[] {
  if (captures.length < 2) return [];

  const anomalies: SatelliteAnomaly[] = [];

  // Sort by date ascending
  const sorted = [...captures].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // 1. PROGRESS_HALT: any 4-week window with sum of changes < 1
  for (let i = 3; i < sorted.length; i++) {
    const window = sorted.slice(i - 3, i + 1);
    const sum = window.reduce(
      (acc, c) => acc + Math.max(0, c.analysis.changeFromPrevious),
      0
    );
    if (sum < 4) {
      anomalies.push({
        type: "PROGRESS_HALT",
        severity: sum < 1 ? "HIGH" : "MEDIUM",
        description: `Progress halted for 4 weeks ending ${new Date(
          sorted[i].date
        ).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} — only ${sum.toFixed(1)} pts added.`,
        detectedDate: sorted[i].date,
      });
    }
  }

  // 2. ACCELERATION: any 2-week window with delta > 15
  for (let i = 1; i < sorted.length; i++) {
    const delta = sorted[i].analysis.changeFromPrevious;
    if (delta > 15) {
      anomalies.push({
        type: "ACCELERATION",
        severity: delta > 25 ? "HIGH" : "MEDIUM",
        description: `Rapid progress: +${delta} pts in week of ${new Date(
          sorted[i].date
        ).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`,
        detectedDate: sorted[i].date,
      });
    }
  }

  // 3. VEGETATION_LOSS: vegetation decreased > 30% in any 8-week window
  for (let i = 7; i < sorted.length; i++) {
    const earlier = sorted[i - 7].analysis.vegetationCover;
    const later = sorted[i].analysis.vegetationCover;
    if (earlier - later > 30) {
      anomalies.push({
        type: "VEGETATION_LOSS",
        severity: "MEDIUM",
        description: `Vegetation decreased ${Math.round(
          ((earlier - later) / earlier) * 100
        )}% over 8 weeks — possible uncontrolled land clearing.`,
        detectedDate: sorted[i].date,
      });
    }
  }

  // 4. OVERRUN: not completed after 52+ weeks and score < 70
  if (sorted.length >= 52) {
    const latest = sorted[sorted.length - 1];
    if (latest.analysis.developmentScore < 70) {
      anomalies.push({
        type: "OVERRUN",
        severity: latest.analysis.developmentScore < 40 ? "CRITICAL" : "HIGH",
        description: `Project running for ${Math.floor(
          (new Date(latest.date).getTime() - new Date(sorted[0].date).getTime()) /
            (7 * 24 * 60 * 60 * 1000)
        )} weeks but only at ${latest.analysis.developmentScore}% completion.`,
        detectedDate: latest.date,
      });
    }
  }

  // 5. SUSPICIOUS_DORMANCY: rapid progress followed by > 8 weeks of < 1 pt
  for (let i = 8; i < sorted.length; i++) {
    const lookback = sorted.slice(i - 8, i);
    const recentAvg =
      lookback.reduce(
        (acc, c) => acc + Math.max(0, c.analysis.changeFromPrevious),
        0
      ) / 8;
    const prior = sorted[i - 9];
    if (prior && prior.analysis.changeFromPrevious > 10 && recentAvg < 0.5) {
      anomalies.push({
        type: "SUSPICIOUS_DORMANCY",
        severity: "CRITICAL",
        description: `Project showed rapid progress (+${prior.analysis.changeFromPrevious} pts) then went dormant for 8+ weeks. Possible abandonment or budget freeze.`,
        detectedDate: sorted[i].date,
      });
    }
  }

  return anomalies;
}

// ── Statistics ────────────────────────────────────────────────────────────────

function computeStatistics(captures: SatelliteCapture[]): SatelliteAssessment["statistics"] {
  if (!captures.length) {
    return {
      earliestCapture: "",
      latestCapture: "",
      totalCaptures: 0,
      avgCloudCover: 0,
      averageDevelopmentRate: 0,
      peakDevelopmentWeek: "",
      constructionActive: false,
    };
  }
  const sorted = [...captures].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const earliest = sorted[0];
  const latest = sorted[sorted.length - 1];
  const avgCloudCover = Math.round(
    sorted.reduce((acc, c) => acc + c.cloudCover, 0) / sorted.length
  );
  const scoreDelta = latest.analysis.developmentScore - earliest.analysis.developmentScore;
  const weeks = Math.max(
    1,
    Math.floor(
      (new Date(latest.date).getTime() - new Date(earliest.date).getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    )
  );
  const averageDevelopmentRate = parseFloat((scoreDelta / weeks).toFixed(2));

  let peak = sorted[0];
  for (const c of sorted) {
    if (c.analysis.changeFromPrevious > peak.analysis.changeFromPrevious) peak = c;
  }

  const last4 = sorted.slice(-4);
  const constructionActive =
    last4.reduce((acc, c) => acc + Math.max(0, c.analysis.changeFromPrevious), 0) > 5;

  return {
    earliestCapture: earliest.date,
    latestCapture: latest.date,
    totalCaptures: sorted.length,
    avgCloudCover,
    averageDevelopmentRate,
    peakDevelopmentWeek: peak.date,
    constructionActive,
  };
}

// ── Quarterly timeline analysis ──────────────────────────────────────────────

function buildTimelineAnalysis(
  captures: SatelliteCapture[]
): TimelineInsight[] {
  if (!captures.length) return [];
  const sorted = [...captures].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const quarterMap = new Map<string, SatelliteCapture[]>();
  for (const c of sorted) {
    const d = new Date(c.date);
    const q = Math.floor(d.getMonth() / 3) + 1;
    const key = `${d.getFullYear()} Q${q}`;
    if (!quarterMap.has(key)) quarterMap.set(key, []);
    quarterMap.get(key)!.push(c);
  }

  const insights: TimelineInsight[] = [];
  const keys = Array.from(quarterMap.keys());
  for (let i = 0; i < keys.length; i++) {
    const period = keys[i];
    const list = quarterMap.get(period)!;
    const avg = Math.round(
      list.reduce((acc, c) => acc + c.analysis.developmentScore, 0) / list.length
    );
    const prev = i > 0 ? quarterMap.get(keys[i - 1])! : null;
    const prevAvg = prev
      ? Math.round(
          prev.reduce((acc, c) => acc + c.analysis.developmentScore, 0) / prev.length
        )
      : avg;
    const delta = avg - prevAvg;

    let insightText: string;
    if (delta > 10)
      insightText = `Significant acceleration: +${delta} pts average development score.`;
    else if (delta > 3)
      insightText = `Steady progress: +${delta} pts.`;
    else if (delta < -3)
      insightText = `Regression detected: ${delta} pts. Investigate causes.`;
    else insightText = `Stable period with ${avg}% average completion.`;

    insights.push({
      period,
      developmentScore: avg,
      delta,
      insights: insightText,
    });
  }
  return insights;
}

// ── AI Text Generation ────────────────────────────────────────────────────────

interface TextContext {
  projectId: string;
  overallScore: number;
  statistics: SatelliteAssessment["statistics"];
  anomalies: SatelliteAnomaly[];
  timeline: TimelineInsight[];
}

async function generateAiText(ctx: TextContext): Promise<{
  summary: string;
  observations: string[];
  nextSteps: string[];
}> {
  // Try OpenAI if available
  if (process.env.OPENAI_API_KEY) {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI();
      const prompt = `You are an MPLADS analyst reviewing weekly satellite imagery for a parliamentary constituency development project.

Project ID: ${ctx.projectId}
Total captures: ${ctx.statistics.totalCaptures}
Period: ${ctx.statistics.earliestCapture} to ${ctx.statistics.latestCapture}
Current development score: ${ctx.overallScore}/100
Average weekly development rate: ${ctx.statistics.averageDevelopmentRate} pts/week
Construction active: ${ctx.statistics.constructionActive ? "Yes" : "No"}
Anomalies detected: ${ctx.anomalies.length}

Generate:
1. A 2-3 sentence progress summary
2. Three key observations
3. Three recommended next steps for oversight officers

Return JSON: { "summary": "", "observations": [], "nextSteps": [] }`;

      const resp = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });
      const parsed = JSON.parse(resp.choices[0].message.content || "{}");
      return {
        summary: parsed.summary ?? "Analysis in progress.",
        observations: parsed.observations ?? [],
        nextSteps: parsed.nextSteps ?? [],
      };
    } catch (err) {
      logger.warn("[satellite-ai] OpenAI call failed, falling back to templates", err);
    }
  }

  // Template-based fallback
  return generateFallbackText(ctx);
}

function generateFallbackText(ctx: TextContext): {
  summary: string;
  observations: string[];
  nextSteps: string[];
} {
  const { overallScore, statistics, anomalies } = ctx;
  const weeks = Math.floor(
    (new Date(statistics.latestCapture).getTime() -
      new Date(statistics.earliestCapture).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );

  // Summary
  let summary: string;
  if (overallScore >= 90) {
    summary = `Project has reached ${overallScore}% completion over ${weeks} weeks of monitoring, with a sustained development rate of ${statistics.averageDevelopmentRate} pts/week. The trajectory is consistent with successful delivery ahead of parliamentary expectations.`;
  } else if (overallScore >= 60) {
    summary = `Project is at ${overallScore}% completion after ${weeks} weeks. Active construction is visible in recent captures, with a healthy ${statistics.averageDevelopmentRate} pts/week development rate. ${anomalies.length > 0 ? `${anomalies.length} anomalies were detected during the monitoring period.` : "No significant anomalies detected."}`;
  } else if (overallScore >= 30) {
    summary = `Project is in mid-stage development at ${overallScore}% completion. Progress has been recorded over ${weeks} weeks but ${anomalies.length > 0 ? `${anomalies.length} anomalies suggest issues requiring attention` : "pace could be improved"}. Current rate: ${statistics.averageDevelopmentRate} pts/week.`;
  } else {
    summary = `Project remains in early stages at ${overallScore}% completion after ${weeks} weeks. ${anomalies.length > 0 ? `Anomalies detected (${anomalies.length}) indicate possible progress delays or implementation challenges.` : "This is normal for the foundation phase."} Active monitoring is recommended.`;
  }

  // Observations
  const observations: string[] = [];
  if (statistics.constructionActive) {
    observations.push(
      `Construction activity is ongoing — measurable progress detected in the most recent 4 weeks of imagery.`
    );
  } else {
    observations.push(
      `No measurable progress detected in recent weeks — site may be dormant or experiencing delays.`
    );
  }
  observations.push(
    `Average cloud cover across monitoring period: ${statistics.avgCloudCover}% — image quality is ${statistics.avgCloudCover < 20 ? "excellent" : statistics.avgCloudCover < 35 ? "good" : "moderate"}.`
  );
  if (statistics.averageDevelopmentRate > 0) {
    observations.push(
      `Development rate of ${statistics.averageDevelopmentRate} pts/week translates to a projected ${weeks * statistics.averageDevelopmentRate}-week completion timeline at current pace.`
    );
  }
  if (anomalies.length > 0) {
    const criticalCount = anomalies.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH").length;
    observations.push(
      `${anomalies.length} anomalies detected during monitoring (${criticalCount} high/critical severity) — see detailed breakdown below.`
    );
  }

  // Next steps
  const nextSteps: string[] = [];
  if (anomalies.some((a) => a.type === "PROGRESS_HALT" || a.type === "SUSPICIOUS_DORMANCY")) {
    nextSteps.push(
      `Schedule field inspection to investigate reported progress halts — verify site status and contractor activity.`
    );
  }
  if (anomalies.some((a) => a.type === "VEGETATION_LOSS")) {
    nextSteps.push(
      `Verify environmental compliance — significant vegetation loss detected.`
    );
  }
  if (anomalies.some((a) => a.type === "OVERRUN")) {
    nextSteps.push(
      `Escalate to MPLADS review committee for timeline revision and budget reallocation.`
    );
  }
  if (nextSteps.length === 0) {
    nextSteps.push(
      `Continue routine weekly satellite monitoring and verify on-site progress during next field visit.`
    );
  }
  if (overallScore >= 80) {
    nextSteps.push(
      `Initiate project completion verification protocol — schedule final inspection within 2 weeks.`
    );
  } else {
    nextSteps.push(
      `Request monthly progress reports from implementing agency for cross-verification with satellite data.`
    );
  }

  return { summary, observations, nextSteps };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function analyzeSatelliteTimeline(
  projectId: string,
  captures: SatelliteCapture[]
): Promise<SatelliteAssessment> {
  logger.info(`[satellite-ai] Analyzing ${captures.length} captures for ${projectId}`);

  const statistics = computeStatistics(captures);
  const anomalies = detectAnomalies(captures, projectId);
  const timelineAnalysis = buildTimelineAnalysis(captures);
  const overallScore =
    captures.length > 0
      ? Math.round(
          captures.reduce((acc, c) => acc + c.analysis.developmentScore, 0) /
            captures.length
        )
      : 0;

  const text = await generateAiText({
    projectId,
    overallScore,
    statistics,
    anomalies,
    timeline: timelineAnalysis,
  });

  // Confidence: based on data quality
  const confidence = parseFloat(
    Math.min(1, Math.max(0.3, 0.95 - statistics.avgCloudCover / 200)).toFixed(2)
  );

  return {
    id: `assess-${projectId}-${Date.now()}`,
    projectId,
    generatedAt: new Date().toISOString(),
    overallScore,
    progressSummary: text.summary,
    keyObservations: text.observations,
    anomalies,
    confidence,
    nextSteps: text.nextSteps,
    timelineAnalysis,
    statistics,
  };
}
