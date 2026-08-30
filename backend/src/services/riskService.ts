import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import type { RiskLevel } from "@prisma/client";
import { logger } from "../utils/logger.js";
import { notifyRiskThreshold } from "./notificationService.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RiskFactor {
  code: string;
  label: string;
  points: number;
  detail: string;
}

export interface ProjectRiskData {
  projectId: string;
  overallScore: number;
  anomalyScore: number;
  financialScore: number;
  reportScore: number;
  timelineScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
}

// ─── Signal Weights ────────────────────────────────────────────────────────────

const SCORE = {
  ANOMALY_MAX:    40,
  FINANCIAL_MAX:   25,
  REPORT_MAX:      20,
  TIMELINE_MAX:    15,
} as const;

// ─── Anomaly severity point values ────────────────────────────────────────────

const ANOMALY_POINTS: Record<string, number> = {
  CRITICAL: 10,
  HIGH:      7,
  MEDIUM:    4,
  LOW:       1,
};

// ─── Report severity point values ─────────────────────────────────────────────

const REPORT_POINTS: Record<string, number> = {
  CRITICAL: 7,
  HIGH:      5,
  MEDIUM:    3,
  LOW:       1,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function cap(value: number, max: number): number {
  return Math.min(value, max);
}

function getRiskLevel(score: number): RiskLevel {
  if (score <= 20) return "LOW";
  if (score <= 40) return "MEDIUM";
  if (score <= 60) return "HIGH";
  return "CRITICAL";
}

function severityLabel(severity: string): string {
  const labels: Record<string, string> = {
    CRITICAL: "Critical",
    HIGH:     "High",
    MEDIUM:   "Medium",
    LOW:      "Low",
  };
  return labels[severity] ?? severity;
}

// ─── Scoring Functions ─────────────────────────────────────────────────────────

/**
 * Calculate anomaly signal score (0–40).
 * Each severity tier contributes a fixed point value per open/acknowledged anomaly.
 */
async function calcAnomalyScore(projectId: string): Promise<{ score: number; factors: RiskFactor[] }> {
  const anomalies = await prisma.anomaly.findMany({
    where: {
      projectId,
      status: { in: ["OPEN", "ACKNOWLEDGED", "UNDER_INVESTIGATION"] },
    },
    select: { severity: true },
  });

  const factors: RiskFactor[] = [];
  let score = 0;

  for (const a of anomalies) {
    const pts = ANOMALY_POINTS[a.severity] ?? 0;
    score += pts;
    factors.push({
      code: `ANOMALY_${a.severity}`,
      label: `${severityLabel(a.severity)} anomaly detected`,
      points: pts,
      detail: `Open anomaly with ${a.severity} severity contributes ${pts} pts`,
    });
  }

  score = cap(score, SCORE.ANOMALY_MAX);
  return { score, factors };
}

/**
 * Calculate financial health score (0–25).
 * Based on budget utilization (spentAmount / approvedAmount).
 */
async function calcFinancialScore(projectId: string): Promise<{ score: number; factors: RiskFactor[] }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { approvedAmount: true, spentAmount: true, expenditures: { select: { id: true } } },
  });

  const factors: RiskFactor[] = [];

  if (!project) return { score: 0, factors };

  const { approvedAmount, spentAmount, expenditures } = project;

  if (expenditures.length === 0) {
    factors.push({
      code: "FINANCIAL_NO_EXPENDITURE",
      label: "No expenditures recorded",
      points: 0,
      detail: "Project has no recorded expenditures yet",
    });
    return { score: 0, factors };
  }

  const utilization = approvedAmount > 0 ? (spentAmount / approvedAmount) * 100 : 0;
  let score: number;
  let label: string;
  let detail: string;

  if (utilization > 100) {
    score = 25;
    label = "Budget overrun";
    detail = `Spent ₹${spentAmount.toFixed(2)} exceeds approved ₹${approvedAmount.toFixed(2)} (${utilization.toFixed(1)}%)`;
  } else if (utilization >= 90) {
    score = 20;
    label = "Near budget limit";
    detail = `Utilization at ${utilization.toFixed(1)}% — approaching approved amount`;
  } else if (utilization >= 70) {
    score = 15;
    label = "High utilization";
    detail = `Utilization at ${utilization.toFixed(1)}% — healthy spending pace`;
  } else if (utilization >= 50) {
    score = 10;
    label = "Moderate utilization";
    detail = `Utilization at ${utilization.toFixed(1)}% — funds partially deployed`;
  } else {
    score = 5;
    label = "Low utilization";
    detail = `Utilization at ${utilization.toFixed(1)}% — slow fund deployment`;
  }

  factors.push({ code: "FINANCIAL_UTILIZATION", label, points: score, detail });
  return { score, factors };
}

/**
 * Calculate citizen report score (0–20).
 * Each severity tier contributes points for active (non-closed) reports.
 */
async function calcReportScore(projectId: string): Promise<{ score: number; factors: RiskFactor[] }> {
  const reports = await prisma.report.findMany({
    where: {
      projectId,
      status: { notIn: ["RESOLVED", "CLOSED", "REJECTED"] },
    },
    select: { severity: true },
  });

  const factors: RiskFactor[] = [];
  let score = 0;

  for (const r of reports) {
    const pts = REPORT_POINTS[r.severity] ?? 0;
    score += pts;
    factors.push({
      code: `REPORT_${r.severity}`,
      label: `${severityLabel(r.severity)} citizen report open`,
      points: pts,
      detail: `Open report with ${r.severity} severity contributes ${pts} pts`,
    });
  }

  score = cap(score, SCORE.REPORT_MAX);
  return { score, factors };
}

/**
 * Calculate timeline health score (0–15).
 * Checks for stalled projects, overdue completions, missing dates.
 */
async function calcTimelineScore(projectId: string): Promise<{ score: number; factors: RiskFactor[] }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      status: true,
      startDate: true,
      expectedEndDate: true,
      completedAt: true,
    },
  });

  const factors: RiskFactor[] = [];

  if (!project) return { score: 0, factors };

  const { status, startDate, expectedEndDate, completedAt } = project;
  const now = new Date();

  // No timeline data at all
  if (!startDate && !expectedEndDate) {
    factors.push({
      code: "TIMELINE_NO_DATA",
      label: "Missing timeline data",
      points: 5,
      detail: "No start or expected end dates recorded",
    });
    return { score: 5, factors };
  }

  // Stalled: IN_PROGRESS for more than 3 years without completion
  if (status === "IN_PROGRESS" && startDate) {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    if (startDate < threeYearsAgo && !completedAt) {
      factors.push({
        code: "TIMELINE_STALLED",
        label: "Project stalled",
        points: 15,
        detail: "Project in progress for more than 3 years without completion",
      });
      return { score: 15, factors };
    }
  }

  // Past expected end date but not completed
  if (expectedEndDate && status !== "COMPLETED" && status !== "VERIFIED") {
    if (expectedEndDate < now) {
      factors.push({
        code: "TIMELINE_OVERDUE",
        label: "Past expected completion date",
        points: 10,
        detail: `Expected completion was ${expectedEndDate.toISOString().split("T")[0]} — project not yet completed`,
      });
      return { score: 10, factors };
    }
  }

  // On track
  factors.push({
    code: "TIMELINE_OK",
    label: "Timeline on track",
    points: 0,
    detail: "No timeline risk factors detected",
  });
  return { score: 0, factors };
}

// ─── Main Scoring ──────────────────────────────────────────────────────────────

export async function calculateProjectRisk(projectId: string): Promise<ProjectRiskData> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new AppError(404, "NOT_FOUND", `Project '${projectId}' not found`);
  }

  const [anomaly, financial, report, timeline] = await Promise.all([
    calcAnomalyScore(projectId),
    calcFinancialScore(projectId),
    calcReportScore(projectId),
    calcTimelineScore(projectId),
  ]);

  const allFactors = [...anomaly.factors, ...financial.factors, ...report.factors, ...timeline.factors];
  const overallScore = anomaly.score + financial.score + report.score + timeline.score;
  const riskLevel = getRiskLevel(overallScore);

  return {
    projectId,
    overallScore,
    anomalyScore:    anomaly.score,
    financialScore: financial.score,
    reportScore:    report.score,
    timelineScore:  timeline.score,
    riskLevel,
    factors: allFactors,
  };
}

// ─── Upsert risk record ───────────────────────────────────────────────────────

export async function saveProjectRisk(data: ProjectRiskData): Promise<void> {
  await prisma.projectRisk.upsert({
    where: { projectId: data.projectId },
    update: {
      overallScore:   data.overallScore,
      anomalyScore:   data.anomalyScore,
      financialScore: data.financialScore,
      reportScore:   data.reportScore,
      timelineScore: data.timelineScore,
      riskLevel:     data.riskLevel,
      factors:       JSON.stringify(data.factors),
      computedAt:    new Date(),
    },
    create: {
      projectId:      data.projectId,
      overallScore:   data.overallScore,
      anomalyScore:   data.anomalyScore,
      financialScore: data.financialScore,
      reportScore:   data.reportScore,
      timelineScore:  data.timelineScore,
      riskLevel:     data.riskLevel,
      factors:       JSON.stringify(data.factors),
      computedAt:    new Date(),
    },
  });
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const riskService = {
  /** Calculate and save risk score for one project */
  async calculateForProject(projectId: string) {
    // Fetch current risk before recalculating so we can detect threshold crossings
    const existing = await prisma.projectRisk.findUnique({ where: { projectId } });
    const previousLevel: RiskLevel | null = existing?.riskLevel ?? null;

    const data = await calculateProjectRisk(projectId);
    await saveProjectRisk(data);

    // Fire RISK_THRESHOLD notification when a project crosses HIGH or CRITICAL
    const alertingLevels: RiskLevel[] = ["HIGH", "CRITICAL"];
    const wasAlerting = previousLevel != null && alertingLevels.includes(previousLevel);
    const isAlerting = alertingLevels.includes(data.riskLevel);

    if (!wasAlerting && isAlerting) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      });
      void notifyRiskThreshold({
        projectId,
        projectName: project?.name ?? projectId,
        newLevel: data.riskLevel,
        score: data.overallScore,
      }).catch((err) => {
        logger.warn("[notify] risk threshold notification failed:", err);
      });
    }

    return data;
  },

  /** Recalculate and save risk for every project */
  async recalculateAll() {
    const projects = await prisma.project.findMany({ select: { id: true } });
    const results: ProjectRiskData[] = [];
    for (const { id } of projects) {
      // Use calculateForProject so threshold-crossing notifications fire
      const data = await this.calculateForProject(id);
      results.push(data);
    }
    return results;
  },

  /** Get risk data for one project (recalculate on demand) */
  async getRiskByProject(projectId: string) {
    const data = await calculateProjectRisk(projectId);
    await saveProjectRisk(data);
    return data;
  },

  /** List all risk records with project details, paginated */
  async listRisks(opts: {
    riskLevel?: RiskLevel;
    sortBy?: "overallScore" | "riskLevel" | "updatedAt";
    sortOrder?: "asc" | "desc";
    page?: number;
    limit?: number;
  }) {
    const {
      riskLevel,
      sortBy = "overallScore",
      sortOrder = "desc",
      page = 1,
      limit = 50,
    } = opts;

    const where = riskLevel ? { riskLevel } : {};

    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortOrder;

    const [total, items] = await Promise.all([
      prisma.projectRisk.count({ where }),
      prisma.projectRisk.findMany({
        where,
        include: {
          project: {
            select: {
              id: true, name: true, status: true, sector: true,
              district: true, state: true, approvedAmount: true, spentAmount: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Parse factors JSON
    const withFactors = items.map((r) => ({
      ...r,
      factors: (() => {
        try { return JSON.parse(r.factors ?? "[]") as RiskFactor[]; }
        catch { return []; }
      })(),
    }));

    return {
      items: withFactors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /** Get aggregated risk stats */
  async getRiskStats() {
    const [total, byLevel, avgScore] = await Promise.all([
      prisma.projectRisk.count(),
      prisma.projectRisk.groupBy({
        by: ["riskLevel"],
        _count: true,
      }),
      prisma.projectRisk.aggregate({
        _avg: { overallScore: true },
      }),
    ]);

    const distribution: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const row of byLevel) {
      distribution[row.riskLevel] = row._count;
    }

    return {
      totalProjects: total,
      distribution,
      avgScore: avgScore._avg.overallScore ?? 0,
    };
  },
};
