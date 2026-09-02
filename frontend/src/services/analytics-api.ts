import { api } from "./api";
import type { RiskLevel } from "./risk-api";

// ─── Return types (mirrors backend analyticsService.ts) ──────────────────────────

export interface ProjectStatusCount {
  status: string;
  count: number;
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

export interface ReportStatusCount {
  status: string;
  count: number;
}

export interface ReportCategoryCount {
  category: string;
  count: number;
}

export interface AnomalySeverityCount {
  severity: string;
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
  month: string;
  amount: number;
}

export interface RiskDistribution {
  level: RiskLevel;
  count: number;
}

export interface TopRiskProject {
  projectId: string;
  projectName: string;
  district: string;
  state: string;
  overallScore: number;
  riskLevel: RiskLevel;
}

// ─── Summary payload ────────────────────────────────────────────────────────────

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
    topProjects: TopRiskProject[];
    avgScore: number;
  };
}

// ─── API client ────────────────────────────────────────────────────────────────

export const analyticsApi = {
  /**
   * GET /analytics/summary
   * Full analytics payload — all chart data for the Analytics page.
   */
  getSummary(): Promise<AnalyticsSummary> {
    return api.get<AnalyticsSummary>("/analytics/summary");
  },
};
