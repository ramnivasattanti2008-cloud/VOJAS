import { prisma } from "../config/database.js";
import type { ProjectStatus, ReportStatus, AnomalySeverity, RiskLevel } from "@prisma/client";

// ─── Return types ──────────────────────────────────────────────────────────────

export interface ProjectStatusCount {
  status: ProjectStatus;
  count: number;
}

export interface ReportStatusCount {
  status: ReportStatus;
  count: number;
}

export interface ReportCategoryCount {
  category: string;
  count: number;
}

export interface AnomalySeverityCount {
  severity: AnomalySeverity;
  count: number;
}

export interface AnomalyStatusCount {
  status: string;
  count: number;
}

export interface AnomalyCategoryCount {
  category: string;
  count: number;
}

export interface ExpenditureByCategory {
  category: string;
  total: number;
  count: number;
}

export interface ExpenditureByMonth {
  month: string;   // "Jan 2026"
  amount: number;
}

export interface ProjectBySector {
  sector: string;
  count: number;
  totalBudget: number;
  totalSpent: number;
}

export interface ProjectByDistrict {
  district: string;
  state: string;
  count: number;
  totalBudget: number;
  totalSpent: number;
}

export interface MonthlyProjectCreation {
  month: string;
  count: number;
}

export interface RiskDistribution {
  level: RiskLevel;
  count: number;
}

export interface TopRiskProjects {
  projectId: string;
  projectName: string;
  district: string;
  state: string;
  overallScore: number;
  riskLevel: RiskLevel;
}

export interface AnalyticsSummary {
  projects: {
    total: number;
    byStatus: ProjectStatusCount[];
    bySector: ProjectBySector[];
    byDistrict: ProjectByDistrict[];
    monthlyCreation: MonthlyProjectCreation[];
    avgBudget: number;
    avgSpent: number;
  };
  reports: {
    total: number;
    byStatus: ReportStatusCount[];
    byCategory: ReportCategoryCount[];
    avgResolutionDays: number | null;
  };
  anomalies: {
    total: number;
    open: number;
    bySeverity: AnomalySeverityCount[];
    byStatus: AnomalyStatusCount[];
    byCategory: AnomalyCategoryCount[];
  };
  financial: {
    totalBudget: number;
    totalSpent: number;
    totalAuthorized: number;
    totalPending: number;
    utilization: number;
    byCategory: ExpenditureByCategory[];
    byMonth: ExpenditureByMonth[];
  };
  risk: {
    distribution: RiskDistribution[];
    topProjects: TopRiskProjects[];
    avgScore: number;
  };
}

// ─── Month formatting ────────────────────────────────────────────────────────────

function formatMonth(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", year: "numeric" }); // "Aug 2026"
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// ─── Service ────────────────────────────────────────────────────────────────────

export const analyticsService = {
  /**
   * Full analytics summary — powers the Analytics page charts.
   * Run with appropriate Zod validation + error handling at the controller layer.
   */
  async getSummary(): Promise<AnalyticsSummary> {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    // SQLite stores DateTime as integer (ms since epoch), so pass it as a number for raw SQL.
    const twelveMonthsAgoMs = twelveMonthsAgo.getTime();

    // ── Single round-trip with SQL aggregates — no full table scans ─────────────
    // Old code: prisma.project.findMany() + prisma.report.findMany() + prisma.anomaly.findMany()
    //   loaded all 60k projects, all reports, all anomalies into memory (6+ seconds).
    // New code: groupBy/aggregate/$queryRaw push the work to SQLite — under 100ms.

    const [
      projectAgg,         // totals + avg
      projectsByStatus,    // groupBy status
      projectsBySector,    // groupBy sector
      projectsByDistrict,  // groupBy district+state
      projectsByMonth,     // $queryRaw: monthly creation
      reportAgg,           // totals
      reportsByStatus,     // groupBy status
      reportsByCategory,   // groupBy category
      reportsResolution,   // $queryRaw: avg resolution days
      anomalyAgg,          // totals
      anomaliesBySeverity, // groupBy severity
      anomaliesByStatus,   // groupBy status
      anomaliesByCategory, // groupBy category
      expenditureByCat,    // groupBy category+status
      expendituresByMonth, // $queryRaw: monthly spend
      riskAgg,             // groupBy riskLevel + avg
      topRiskProjects,     // findMany top 10 (small set)
    ] = await Promise.all([
      // Project totals
      prisma.project.aggregate({
        _count: { _all: true },
        _sum: { approvedAmount: true, spentAmount: true },
        _avg: { approvedAmount: true, spentAmount: true },
      }),
      // Project by status
      prisma.project.groupBy({ by: ["status"], _count: true }),
      // Project by sector (with sums)
      prisma.project.groupBy({
        by: ["sector"],
        _count: true,
        _sum: { approvedAmount: true, spentAmount: true },
      }),
      // Project by district+state (with sums)
      prisma.project.groupBy({
        by: ["district", "state"],
        _count: true,
        _sum: { approvedAmount: true, spentAmount: true },
      }),
      // Monthly project creation — last 12 months
      prisma.$queryRaw<Array<{ ym: string; count: number }>>`
        SELECT
          strftime('%Y-%m', datetime(createdAt/1000, 'unixepoch')) AS ym,
          COUNT(*) AS count
        FROM Project
        WHERE createdAt >= ${twelveMonthsAgoMs}
        GROUP BY ym
        ORDER BY ym ASC
      `.then((rows) =>
        rows.map((r) => {
          const [year, month] = r.ym.split("-");
          const d = new Date(parseInt(year), parseInt(month) - 1, 1);
          return { month: formatMonth(d), count: Number(r.count) };
        })
      ),
      // Report totals
      prisma.report.aggregate({ _count: { _all: true } }),
      // Report by status
      prisma.report.groupBy({ by: ["status"], _count: true }),
      // Report by category
      prisma.report.groupBy({ by: ["category"], _count: true }),
      // Avg resolution time
      prisma.$queryRaw<Array<{ avg_days: number | null }>>`
        SELECT AVG(
          (julianday(datetime(resolvedAt/1000, 'unixepoch'))
           - julianday(datetime(createdAt/1000, 'unixepoch')))
        ) AS avg_days
        FROM Report
        WHERE resolvedAt IS NOT NULL AND createdAt IS NOT NULL
      `,
      // Anomaly totals
      prisma.anomaly.aggregate({ _count: { _all: true } }),
      prisma.anomaly.groupBy({ by: ["severity"], _count: true }),
      prisma.anomaly.groupBy({ by: ["status"], _count: true }),
      prisma.anomaly.groupBy({ by: ["category"], _count: true }),
      // Expenditure groupBy category+status
      prisma.expenditure.groupBy({
        by: ["category", "status"],
        _sum: { amount: true },
        _count: true,
      }),
      // Monthly expenditures — last 12 months
      prisma.$queryRaw<Array<{ ym: string; total: number }>>`
        SELECT
          strftime('%Y-%m', datetime(paidOn/1000, 'unixepoch')) AS ym,
          COALESCE(SUM(amount), 0) AS total
        FROM Expenditure
        WHERE paidOn IS NOT NULL AND paidOn >= ${twelveMonthsAgoMs}
        GROUP BY ym
        ORDER BY ym ASC
      `.then((rows) =>
        rows.map((r) => {
          const [year, month] = r.ym.split("-");
          const d = new Date(parseInt(year), parseInt(month) - 1, 1);
          return { month: formatMonth(d), amount: Number(r.total) };
        })
      ),
      // Risk distribution + avg score
      prisma.projectRisk.groupBy({
        by: ["riskLevel"],
        _count: true,
        _avg: { overallScore: true },
      }),
      // Top 10 risk projects (only 10 rows)
      prisma.projectRisk.findMany({
        select: {
          overallScore: true,
          riskLevel: true,
          project: { select: { id: true, name: true, district: true, state: true } },
        },
        orderBy: { overallScore: "desc" },
        take: 10,
      }),
    ]);

    // ── Projects ────────────────────────────────────────────────────────────────

    const totalProjects = projectAgg._count._all;
    const totalBudget = projectAgg._sum.approvedAmount ?? 0;
    const totalSpent = projectAgg._sum.spentAmount ?? 0;

    const byStatus: ProjectStatusCount[] = projectsByStatus
      .map((p) => ({ status: p.status as ProjectStatus, count: p._count }))
      .sort((a, b) => b.count - a.count);

    const bySector: ProjectBySector[] = projectsBySector
      .map((s) => ({
        sector: s.sector,
        count: s._count,
        totalBudget: s._sum.approvedAmount ?? 0,
        totalSpent: s._sum.spentAmount ?? 0,
      }))
      .sort((a, b) => b.count - a.count);

    const byDistrict: ProjectByDistrict[] = projectsByDistrict
      .map((d) => ({
        district: d.district,
        state: d.state,
        count: d._count,
        totalBudget: d._sum.approvedAmount ?? 0,
        totalSpent: d._sum.spentAmount ?? 0,
      }))
      .sort((a, b) => b.count - a.count);

    const monthlyCreation: MonthlyProjectCreation[] = projectsByMonth;

    // ── Reports ─────────────────────────────────────────────────────────────────

    const reportByStatus: ReportStatusCount[] = reportsByStatus.map((r) => ({
      status: r.status as ReportStatus,
      count: r._count,
    }));

    const reportByCategory: ReportCategoryCount[] = reportsByCategory
      .map((r) => ({ category: r.category, count: r._count }))
      .sort((a, b) => b.count - a.count);

    const avgResolutionDays =
      reportsResolution[0]?.avg_days != null
        ? Math.round(reportsResolution[0].avg_days)
        : null;

    // ── Anomalies ────────────────────────────────────────────────────────────────

    const anomalyBySeverity: AnomalySeverityCount[] = anomaliesBySeverity.map((a) => ({
      severity: a.severity as AnomalySeverity,
      count: a._count,
    }));

    const anomalyByStatus: AnomalyStatusCount[] = anomaliesByStatus.map((a) => ({
      status: a.status,
      count: a._count,
    }));

    const anomalyByCategory: AnomalyCategoryCount[] = anomaliesByCategory
      .map((a) => ({ category: a.category, count: a._count }))
      .sort((a, b) => b.count - a.count);

    const openAnomalies = anomalyByStatus
      .filter((a) => ["OPEN", "ACKNOWLEDGED", "UNDER_INVESTIGATION"].includes(a.status))
      .reduce((s, a) => s + a.count, 0);

    // ── Financials ───────────────────────────────────────────────────────────────

    const totalAuthorizedAmt = expenditureByCat
      .filter((e) => e.status === "AUTHORIZED")
      .reduce((s, e) => s + (e._sum.amount ?? 0), 0);
    const totalPendingAmt = expenditureByCat
      .filter((e) => e.status === "PENDING")
      .reduce((s, e) => s + (e._sum.amount ?? 0), 0);

    // Aggregate by category (sum across statuses)
    const byCatMap: Record<string, { total: number; count: number }> = {};
    for (const row of expenditureByCat) {
      if (!byCatMap[row.category]) byCatMap[row.category] = { total: 0, count: 0 };
      byCatMap[row.category].total += row._sum.amount ?? 0;
      byCatMap[row.category].count += row._count;
    }
    const byCategory: ExpenditureByCategory[] = Object.entries(byCatMap)
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.total - a.total);

    const byMonth: ExpenditureByMonth[] = expendituresByMonth;

    const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // ── Risk ─────────────────────────────────────────────────────────────────────

    const riskDistMap: Record<string, number> = {};
    for (const r of riskAgg) {
      riskDistMap[r.riskLevel] = r._count;
    }
    const riskDistribution: RiskDistribution[] = (["LOW", "MEDIUM", "HIGH", "CRITICAL"] as RiskLevel[])
      .map((level) => ({ level, count: riskDistMap[level] ?? 0 }));

    const topProjects: TopRiskProjects[] = topRiskProjects.map((r) => ({
      projectId: r.project.id,
      projectName: r.project.name,
      district: r.project.district,
      state: r.project.state,
      overallScore: r.overallScore,
      riskLevel: r.riskLevel,
    }));

    // Avg of groupBy averages weighted by count for accuracy
    const totalRiskRows = riskAgg.reduce((s, r) => s + r._count, 0);
    const avgScore =
      totalRiskRows > 0
        ? Math.round(
            riskAgg.reduce((s, r) => s + (r._avg.overallScore ?? 0) * r._count, 0) / totalRiskRows
          )
        : 0;

    return {
      projects: {
        total: totalProjects,
        byStatus,
        bySector,
        byDistrict,
        monthlyCreation,
        avgBudget: projectAgg._avg.approvedAmount ?? 0,
        avgSpent: projectAgg._avg.spentAmount ?? 0,
      },
      reports: {
        total: reportAgg._count._all,
        byStatus: reportByStatus,
        byCategory: reportByCategory,
        avgResolutionDays,
      },
      anomalies: {
        total: anomalyAgg._count._all,
        open: openAnomalies,
        bySeverity: anomalyBySeverity,
        byStatus: anomalyByStatus,
        byCategory: anomalyByCategory,
      },
      financial: {
        totalBudget,
        totalSpent,
        totalAuthorized: totalAuthorizedAmt,
        totalPending: totalPendingAmt,
        utilization,
        byCategory,
        byMonth,
      },
      risk: {
        distribution: riskDistribution,
        topProjects,
        avgScore,
      },
    };
  },

  /**
   * Role-specific dashboard stats — lightweight, one query per entity.
   */
  async getDashboardStats(role: string): Promise<Record<string, unknown>> {
    const [projects, reports, anomalies, riskStats] = await Promise.all([
      prisma.project.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.report.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.anomaly.groupBy({
        by: ["severity"],
        _count: true,
      }),
      analyticsService.getRiskStats(),
    ]);

    const openReports = reports.filter((r) => r.status === "SUBMITTED").reduce((s, r) => s + r._count, 0);
    const totalProjects = projects.reduce((s, p) => s + p._count, 0);
    const totalAnomalies = anomalies.reduce((s, a) => s + a._count, 0);
    const criticalAnomalies = anomalies.filter((a) => a.severity === "CRITICAL").reduce((s, a) => s + a._count, 0);

    const byStatus = (
      items: { status: string; _count: number }[]
    ) =>
      items.reduce<Record<string, number>>((acc, i) => {
        acc[i.status] = i._count;
        return acc;
      }, {});

    return {
      totalProjects,
      projectsByStatus: byStatus(projects as { status: string; _count: number }[]),
      openReports,
      reportsByStatus: byStatus(reports as { status: string; _count: number }[]),
      totalAnomalies,
      criticalAnomalies,
      anomaliesBySeverity: anomalies.reduce<Record<string, number>>((acc, a) => {
        acc[a.severity] = a._count;
        return acc;
      }, {}),
      riskStats,
    };
  },

  /** Risk distribution for the risk page — uses groupBy, no full scan */
  async getRiskStats() {
    const [grouped, totalAgg] = await Promise.all([
      prisma.projectRisk.groupBy({
        by: ["riskLevel"],
        _count: true,
        _avg: { overallScore: true },
      }),
      prisma.projectRisk.aggregate({
        _count: { _all: true },
        _avg: { overallScore: true },
      }),
    ]);

    const dist: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const r of grouped) dist[r.riskLevel] = r._count;

    return {
      distribution: dist,
      total: totalAgg._count._all,
      avgScore: Math.round(totalAgg._avg.overallScore ?? 0),
    };
  },
};
