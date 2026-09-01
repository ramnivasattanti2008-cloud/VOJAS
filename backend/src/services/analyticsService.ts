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

    const [
      projects,
      reports,
      anomalies,
      schemeFin,
      riskDist,
    ] = await Promise.all([
      // ── Projects ────────────────────────────────────────────────────────────
      prisma.project.findMany({
        select: {
          status: true,
          sector: true,
          district: true,
          state: true,
          approvedAmount: true,
          spentAmount: true,
          createdAt: true,
        },
      }),

      // ── Reports ────────────────────────────────────────────────────────────
      prisma.report.findMany({
        select: {
          status: true,
          category: true,
          createdAt: true,
          resolvedAt: true,
        },
      }),

      // ── Anomalies ──────────────────────────────────────────────────────────
      prisma.anomaly.findMany({
        select: {
          severity: true,
          status: true,
          category: true,
        },
      }),

      // ── Scheme financials (re-use existing aggregation) ─────────────────────
      prisma.expenditure.groupBy({
        by: ["category", "status"],
        _sum: { amount: true },
        _count: true,
      }),

      // ── Risk distribution ────────────────────────────────────────────────────
      prisma.projectRisk.findMany({
        select: {
          overallScore: true,
          riskLevel: true,
          project: {
            select: {
              id: true,
              name: true,
              district: true,
              state: true,
            },
          },
        },
        orderBy: { overallScore: "desc" },
        take: 10,
      }),
    ]);

    // ── Projects ────────────────────────────────────────────────────────────────

    const byStatus: ProjectStatusCount[] = Object.entries(
      projects.reduce<Record<string, number>>((acc, p) => {
        acc[p.status] = (acc[p.status] ?? 0) + 1;
        return acc;
      }, {})
    ).map(([status, count]) => ({ status: status as ProjectStatus, count }));

    const bySectorMap = projects.reduce<
      Record<string, { count: number; totalBudget: number; totalSpent: number }>
    >((acc, p) => {
      if (!acc[p.sector]) acc[p.sector] = { count: 0, totalBudget: 0, totalSpent: 0 };
      acc[p.sector].count++;
      acc[p.sector].totalBudget += p.approvedAmount;
      acc[p.sector].totalSpent += p.spentAmount;
      return acc;
    }, {});
    const bySector: ProjectBySector[] = Object.entries(bySectorMap)
      .map(([sector, v]) => ({ sector, ...v }))
      .sort((a, b) => b.count - a.count);

    const byDistrictMap = projects.reduce<
      Record<string, { state: string; count: number; totalBudget: number; totalSpent: number }>
    >((acc, p) => {
      if (!acc[p.district]) acc[p.district] = { state: p.state, count: 0, totalBudget: 0, totalSpent: 0 };
      acc[p.district].count++;
      acc[p.district].totalBudget += p.approvedAmount;
      acc[p.district].totalSpent += p.spentAmount;
      return acc;
    }, {});
    const byDistrict: ProjectByDistrict[] = Object.entries(byDistrictMap)
      .map(([district, v]) => ({ district, ...v }))
      .sort((a, b) => b.count - a.count);

    // Monthly project creation — last 12 months
    const monthlyCreationMap: Record<string, number> = {};
    for (const p of projects) {
      const key = formatMonth(startOfMonth(new Date(p.createdAt)));
      if (new Date(p.createdAt) >= twelveMonthsAgo) {
        monthlyCreationMap[key] = (monthlyCreationMap[key] ?? 0) + 1;
      }
    }
    const monthlyCreation: MonthlyProjectCreation[] = Object.entries(monthlyCreationMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    const totalBudget = projects.reduce((s, p) => s + p.approvedAmount, 0);
    const totalSpent = projects.reduce((s, p) => s + p.spentAmount, 0);

    // ── Reports ─────────────────────────────────────────────────────────────────

    const reportByStatus: ReportStatusCount[] = Object.entries(
      reports.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      }, {})
    ).map(([status, count]) => ({ status: status as ReportStatus, count }));

    const reportByCategory: ReportCategoryCount[] = Object.entries(
      reports.reduce<Record<string, number>>((acc, r) => {
        acc[r.category] = (acc[r.category] ?? 0) + 1;
        return acc;
      }, {})
    ).map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Avg resolution time
    const resolved = reports.filter((r) => r.resolvedAt && r.createdAt);
    const avgResolutionDays =
      resolved.length > 0
        ? Math.round(
            resolved.reduce((sum, r) => {
              const ms = new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime();
              return sum + ms / (1000 * 60 * 60 * 24);
            }, 0) / resolved.length
          )
        : null;

    // ── Anomalies ────────────────────────────────────────────────────────────────

    const anomalyBySeverity: AnomalySeverityCount[] = Object.entries(
      anomalies.reduce<Record<string, number>>((acc, a) => {
        acc[a.severity] = (acc[a.severity] ?? 0) + 1;
        return acc;
      }, {})
    ).map(([severity, count]) => ({ severity: severity as AnomalySeverity, count }));

    const anomalyByStatus: AnomalyStatusCount[] = Object.entries(
      anomalies.reduce<Record<string, number>>((acc, a) => {
        acc[a.status] = (acc[a.status] ?? 0) + 1;
        return acc;
      }, {})
    ).map(([status, count]) => ({ status, count }));

    const anomalyByCategory: AnomalyCategoryCount[] = Object.entries(
      anomalies.reduce<Record<string, number>>((acc, a) => {
        acc[a.category] = (acc[a.category] ?? 0) + 1;
        return acc;
      }, {})
    ).map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const openAnomalies = anomalies.filter((a) =>
      ["OPEN", "ACKNOWLEDGED", "UNDER_INVESTIGATION"].includes(a.status)
    ).length;

    // ── Financials ───────────────────────────────────────────────────────────────

    const finTotalBudget = totalBudget;
    const finTotalSpent = totalSpent;

    // SchemeFin now returns rows keyed by (category, status)
    // Sum amount by status for header KPIs
    const totalAuthorizedAmt = schemeFin
      .filter((e) => e.status === "AUTHORIZED")
      .reduce((s, e) => s + (e._sum.amount ?? 0), 0);
    const totalPendingAmt = schemeFin
      .filter((e) => e.status === "PENDING")
      .reduce((s, e) => s + (e._sum.amount ?? 0), 0);

    // Aggregate by category (sum across statuses)
    const byCatMap: Record<string, { total: number; count: number }> = {};
    for (const row of schemeFin) {
      if (!byCatMap[row.category]) byCatMap[row.category] = { total: 0, count: 0 };
      byCatMap[row.category].total += row._sum.amount ?? 0;
      byCatMap[row.category].count += row._count;
    }
    const byCategory: ExpenditureByCategory[] = Object.entries(byCatMap)
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.total - a.total);

    const allExpenditures = await prisma.expenditure.findMany({
      select: { amount: true, category: true, paidOn: true },
    });

    // Monthly expenditures — last 12 months
    const byMonthMap: Record<string, number> = {};
    for (const e of allExpenditures) {
      if (e.paidOn) {
        const d = new Date(e.paidOn);
        if (d >= twelveMonthsAgo) {
          const key = formatMonth(startOfMonth(d));
          byMonthMap[key] = (byMonthMap[key] ?? 0) + e.amount;
        }
      }
    }
    const byMonth: ExpenditureByMonth[] = Object.entries(byMonthMap)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    const utilization = finTotalBudget > 0 ? (finTotalSpent / finTotalBudget) * 100 : 0;

    // ── Risk ─────────────────────────────────────────────────────────────────────

    const riskDistMap: Record<string, number> = {};
    for (const r of riskDist) {
      riskDistMap[r.riskLevel] = (riskDistMap[r.riskLevel] ?? 0) + 1;
    }
    const riskDistribution: RiskDistribution[] = (["LOW", "MEDIUM", "HIGH", "CRITICAL"] as RiskLevel[])
      .map((level) => ({ level, count: riskDistMap[level] ?? 0 }));

    const topProjects: TopRiskProjects[] = riskDist.slice(0, 10).map((r) => ({
      projectId: r.project.id,
      projectName: r.project.name,
      district: r.project.district,
      state: r.project.state,
      overallScore: r.overallScore,
      riskLevel: r.riskLevel,
    }));

    const avgScore =
      riskDist.length > 0
        ? Math.round(riskDist.reduce((s, r) => s + r.overallScore, 0) / riskDist.length)
        : 0;

    return {
      projects: {
        total: projects.length,
        byStatus,
        bySector,
        byDistrict,
        monthlyCreation,
        avgBudget: projects.length > 0 ? totalBudget / projects.length : 0,
        avgSpent: projects.length > 0 ? totalSpent / projects.length : 0,
      },
      reports: {
        total: reports.length,
        byStatus: reportByStatus,
        byCategory: reportByCategory,
        avgResolutionDays,
      },
      anomalies: {
        total: anomalies.length,
        open: openAnomalies,
        bySeverity: anomalyBySeverity,
        byStatus: anomalyByStatus,
        byCategory: anomalyByCategory,
      },
      financial: {
        totalBudget: finTotalBudget,
        totalSpent: finTotalSpent,
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

  /** Risk distribution for the risk page */
  async getRiskStats() {
    const risks = await prisma.projectRisk.findMany({
      select: { riskLevel: true, overallScore: true },
    });

    const dist: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const r of risks) dist[r.riskLevel] = (dist[r.riskLevel] ?? 0) + 1;

    const avg = risks.length > 0
      ? Math.round(risks.reduce((s, r) => s + r.overallScore, 0) / risks.length)
      : 0;

    return { distribution: dist, total: risks.length, avgScore: avg };
  },
};
