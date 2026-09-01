/**
 * MP + Vendor analytics — longitudinal views and benchmark data.
 *
 * Powers:
 *   GET /api/v1/analytics/mp-summary
 *   GET /api/v1/analytics/mp/:id/trends
 *   GET /api/v1/analytics/vendor-summary
 *   GET /api/v1/analytics/longitudinal
 */
import { prisma } from "../config/database.js";
import type { LokSabhaTerm } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MPTermSummary {
  term: LokSabhaTerm;
  totalProjects: number;
  totalSanctioned: number;
  totalSpent: number;
  utilizationPct: number;
  avgPerProject: number;
  anomalyCount: number;
}

export interface MPLongitudinalTrend {
  month: string;
  recommended: number;
  completed: number;
  spent: number;
}

export interface VendorBenchmark {
  vendorId: string;
  vendorName: string;
  totalPaid: number;
  projectCount: number;
  constituencyCount: number;
  uniqueDistricts: number;
  uniqueStates: number;
  crossConstituencyRisk: boolean;
  crossStateRisk: boolean;
  percentile: number; // 0-100, how high this vendor ranks by totalPaid
}

export interface LongitudinalStateTerm {
  state: string;
  term: LokSabhaTerm;
  projectCount: number;
  totalSanctioned: number;
  totalSpent: number;
  utilizationPct: number;
}

export interface LongitudinalOverview {
  byTerm: {
    term: LokSabhaTerm;
    totalProjects: number;
    totalSanctioned: number;
    totalSpent: number;
    utilizationPct: number;
  }[];
  byStateTerm: LongitudinalStateTerm[];
  topStatesByTerm: Record<LokSabhaTerm, { state: string; totalSanctioned: number }[]>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMonth(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function quarter(d: Date): string {
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()} Q${q}`;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const mpAnalyticsService = {
  /**
   * Summary stats across all MPs — powers the MP analytics page header.
   */
  async getMPOverview(): Promise<{
    totalMPs: number;
    byHouse: Record<string, number>;
    byTerm: Record<string, number>;
    topStates: { state: string; count: number }[];
    avgProjectsPerMP: number;
  }> {
    const mps = await prisma.mP.findMany({
      select: {
        id: true,
        house: true,
        term: true,
        state: true,
        _count: { select: { projects: true } },
      },
    });

    const byHouse: Record<string, number> = {};
    const byTerm: Record<string, number> = {};
    const stateCounts: Record<string, number> = {};
    let totalProjects = 0;

    for (const mp of mps) {
      byHouse[mp.house] = (byHouse[mp.house] ?? 0) + 1;
      byTerm[mp.term] = (byTerm[mp.term] ?? 0) + 1;
      stateCounts[mp.state] = (stateCounts[mp.state] ?? 0) + 1;
      totalProjects += mp._count.projects;
    }

    const topStates = Object.entries(stateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([state, count]) => ({ state, count }));

    return {
      totalMPs: mps.length,
      byHouse,
      byTerm,
      topStates,
      avgProjectsPerMP: mps.length > 0 ? Math.round(totalProjects / mps.length) : 0,
    };
  },

  /**
   * Per-MP trends across Lok Sabha terms — longitudinal bar chart.
   */
  async getMPTrends(mpId: string): Promise<{
    byTerm: MPTermSummary[];
    monthly: MPLongitudinalTrend[];
  }> {
    const projects = await prisma.project.findMany({
      where: { mpId },
      select: {
        id: true,
        approvedAmount: true,
        spentAmount: true,
        status: true,
        term: true,
        recommendedDate: true,
        completedAt: true,
      },
    });

    // By term summary
    const termGroups: Record<string, typeof projects> = {};
    for (const p of projects) {
      const t = p.term ?? "UNKNOWN";
      if (!termGroups[t]) termGroups[t] = [];
      termGroups[t].push(p);
    }

    const anomalyMap = new Set<string>();
    const anomalies = await prisma.anomaly.findMany({
      where: { project: { mpId } },
      select: { id: true, projectId: true },
    });
    for (const a of anomalies) anomalyMap.add(a.projectId);

    const byTerm: MPTermSummary[] = [];
    for (const [term, list] of Object.entries(termGroups)) {
      if (term === "UNKNOWN") continue;
      const sanctioned = list.reduce((s, p) => s + p.approvedAmount, 0);
      const spent = list.reduce((s, p) => s + p.spentAmount, 0);
      byTerm.push({
        term: term as LokSabhaTerm,
        totalProjects: list.length,
        totalSanctioned: sanctioned,
        totalSpent: spent,
        utilizationPct: sanctioned > 0 ? Math.round((spent / sanctioned) * 100) : 0,
        avgPerProject: list.length > 0 ? Math.round(sanctioned / list.length) : 0,
        anomalyCount: list.filter((p) => anomalyMap.has(p.id)).length,
      });
    }

    // Monthly trends (last 24 months)
    const twentyFourMonthsAgo = new Date();
    twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);

    const recent = projects.filter(
      (p) => p.recommendedDate && new Date(p.recommendedDate) >= twentyFourMonthsAgo
    );

    const monthGroups: Record<string, { recommended: number; completed: number; spent: number }> = {};
    for (const p of recent) {
      const m = p.recommendedDate ? formatMonth(new Date(p.recommendedDate)) : "Unknown";
      if (!monthGroups[m]) monthGroups[m] = { recommended: 0, completed: 0, spent: 0 };
      monthGroups[m].recommended += 1;
      if (p.status === "COMPLETED" || p.status === "VERIFIED") monthGroups[m].completed += 1;
      monthGroups[m].spent += p.spentAmount;
    }

    const monthly: MPLongitudinalTrend[] = Object.entries(monthGroups)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([month, v]) => ({ month, ...v }));

    return { byTerm, monthly };
  },
};

export const vendorAnalyticsService = {
  /**
   * Vendor overview — powers the vendor analytics page.
   */
  async getVendorOverview(): Promise<{
    totalVendors: number;
    totalPaid: number;
    avgPaidPerVendor: number;
    crossStateRisk: number;
    crossConstituencyRisk: number;
    byPaymentStatus: Record<string, number>;
    topStates: { state: string; totalPaid: number; count: number }[];
  }> {
    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        state: true,
        totalPaid: true,
        projectCount: true,
        constituencyCount: true,
        _count: { select: { expenditures: true } },
      },
    });

    let totalPaid = 0;
    let crossStateRisk = 0;
    let crossConstituencyRisk = 0;
    const statePaid: Record<string, { totalPaid: number; count: number }> = {};

    for (const v of vendors) {
      totalPaid += v.totalPaid;
      if (v.constituencyCount > 3) crossConstituencyRisk++;
      // cross-state: expenditures across states — use projectCount vs constituencyCount as proxy
      if (v.projectCount > 0 && v.projectCount > v.constituencyCount * 0.8) {
        // heuristic: if projects >> constituencies, likely cross-state
        crossStateRisk++;
      }
      if (v.state) {
        if (!statePaid[v.state]) statePaid[v.state] = { totalPaid: 0, count: 0 };
        statePaid[v.state].totalPaid += v.totalPaid;
        statePaid[v.state].count += 1;
      }
    }

    const byPaymentStatus = await prisma.expenditure.groupBy({
      by: ["paymentStatus"],
      _count: { id: true },
    });

    const topStates = Object.entries(statePaid)
      .sort((a, b) => b[1].totalPaid - a[1].totalPaid)
      .slice(0, 10)
      .map(([state, v]) => ({ state, totalPaid: v.totalPaid, count: v.count }));

    return {
      totalVendors: vendors.length,
      totalPaid,
      avgPaidPerVendor: vendors.length > 0 ? Math.round(totalPaid / vendors.length) : 0,
      crossStateRisk,
      crossConstituencyRisk,
      byPaymentStatus: Object.fromEntries(
        byPaymentStatus.map((s) => [s.paymentStatus ?? "UNKNOWN", s._count.id])
      ),
      topStates,
    };
  },

  /**
   * Top N vendors with benchmark percentiles.
   */
  async getTopVendorsBenchmark(limit = 50): Promise<VendorBenchmark[]> {
    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        totalPaid: true,
        projectCount: true,
        constituencyCount: true,
        state: true,
        district: true,
        expenditures: {
          select: {
            project: { select: { district: true, state: true } },
          },
          take: 500,
        },
      },
      orderBy: { totalPaid: "desc" },
      take: limit,
    });

    const allTotalPaid = await prisma.vendor.findMany({ select: { totalPaid: true } });
    const sortedPaid = allTotalPaid.map((v) => v.totalPaid).sort((a, b) => b - a);
    const maxPaid = sortedPaid[0] ?? 1;

    const benchmarks: VendorBenchmark[] = [];
    for (const v of vendors) {
      const uniqueStates = new Set(v.expenditures.map((e) => e.project?.state).filter(Boolean)).size;
      const uniqueDistricts = new Set(
        v.expenditures.map((e) => e.project?.district).filter(Boolean)
      ).size;

      const crossConstituencyRisk = v.constituencyCount > 3;
      const crossStateRisk = uniqueStates > 3;

      // Percentile: how high this vendor ranks (100 = top)
      const rank = sortedPaid.indexOf(v.totalPaid);
      const percentile = sortedPaid.length > 0 ? Math.round(((sortedPaid.length - rank) / sortedPaid.length) * 100) : 0;

      benchmarks.push({
        vendorId: v.id,
        vendorName: v.name,
        totalPaid: v.totalPaid,
        projectCount: v.projectCount,
        constituencyCount: v.constituencyCount,
        uniqueDistricts,
        uniqueStates,
        crossConstituencyRisk,
        crossStateRisk,
        percentile,
      });
    }

    return benchmarks;
  },
};

export const longitudinalService = {
  /**
   * Cross-term + cross-state longitudinal view of MPLADS spending.
   */
  async getOverview(): Promise<LongitudinalOverview> {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        term: true,
        state: true,
        approvedAmount: true,
        spentAmount: true,
        status: true,
        recommendedDate: true,
      },
    });

    // By term
    const termGroups: Record<string, typeof projects> = {};
    for (const p of projects) {
      const t = p.term ?? "UNKNOWN";
      if (!termGroups[t]) termGroups[t] = [];
      termGroups[t].push(p);
    }

    const allTerms: LokSabhaTerm[] = ["FIFTEENTH", "SIXTEENTH", "SEVENTEENTH", "EIGHTEENTH"];
    const byTerm = allTerms.map((term) => {
      const list = termGroups[term] ?? [];
      const sanctioned = list.reduce((s, p) => s + p.approvedAmount, 0);
      const spent = list.reduce((s, p) => s + p.spentAmount, 0);
      return {
        term,
        totalProjects: list.length,
        totalSanctioned: sanctioned,
        totalSpent: spent,
        utilizationPct: sanctioned > 0 ? Math.round((spent / sanctioned) * 100) : 0,
      };
    });

    // By state × term
    const stateTermGroups: Record<string, typeof projects> = {};
    for (const p of projects) {
      if (!p.term || p.term === "UNKNOWN") continue;
      const key = `${p.state}::${p.term}`;
      if (!stateTermGroups[key]) stateTermGroups[key] = [];
      stateTermGroups[key].push(p);
    }

    const byStateTerm: LongitudinalStateTerm[] = [];
    for (const [key, list] of Object.entries(stateTermGroups)) {
      const [state, term] = key.split("::") as [string, LokSabhaTerm];
      const sanctioned = list.reduce((s, p) => s + p.approvedAmount, 0);
      const spent = list.reduce((s, p) => s + p.spentAmount, 0);
      byStateTerm.push({
        state,
        term,
        projectCount: list.length,
        totalSanctioned: sanctioned,
        totalSpent: spent,
        utilizationPct: sanctioned > 0 ? Math.round((spent / sanctioned) * 100) : 0,
      });
    }

    // Top states by term
    const topStatesByTerm: Record<string, { state: string; totalSanctioned: number }[]> = {};
    for (const term of allTerms) {
      const byState: Record<string, number> = {};
      for (const st of byStateTerm) {
        if (st.term !== term) continue;
        byState[st.state] = (byState[st.state] ?? 0) + st.totalSanctioned;
      }
      topStatesByTerm[term] = Object.entries(byState)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([state, totalSanctioned]) => ({ state, totalSanctioned }));
    }

    return { byTerm, byStateTerm, topStatesByTerm };
  },
};
