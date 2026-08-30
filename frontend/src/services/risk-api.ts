import { api } from "./api";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskFactor {
  code: string;
  label: string;
  points: number;
  detail: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  sector: string;
  district: string;
  state: string;
  approvedAmount: number;
  spentAmount: number;
}

export interface ProjectRisk {
  id: string;
  projectId: string;
  overallScore: number;
  anomalyScore: number;
  financialScore: number;
  reportScore: number;
  timelineScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  computedAt: string;
  updatedAt: string;
  project: ProjectSummary;
}

export interface PaginatedRisks {
  items: ProjectRisk[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RiskStats {
  totalProjects: number;
  distribution: { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number };
  avgScore: number;
}

// ─── API Client ────────────────────────────────────────────────────────────────

export const riskApi = {
  /** GET /risk/stats */
  async stats(): Promise<RiskStats> {
    const res = await api.get<{ data: RiskStats }>("/risk/stats");
    return res.data;
  },

  /** GET /risk — paginated risk list */
  list(opts: {
    riskLevel?: RiskLevel;
    sortBy?: "overallScore" | "riskLevel" | "updatedAt";
    sortOrder?: "asc" | "desc";
    page?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (opts.riskLevel) params.set("riskLevel", opts.riskLevel);
    if (opts.sortBy)    params.set("sortBy", opts.sortBy);
    if (opts.sortOrder)  params.set("sortOrder", opts.sortOrder);
    params.set("page", String(opts.page ?? 1));
    params.set("limit", String(opts.limit ?? 50));
    return api.get<PaginatedRisks>(`/risk?${params.toString()}`);
  },

  /** GET /risk/:projectId */
  async get(projectId: string): Promise<ProjectRisk> {
    const res = await api.get<{ data: { risk: ProjectRisk } }>(`/risk/${projectId}`);
    return res.data.risk;
  },

  /** POST /risk/recalculate — recalculate ALL */
  async recalculateAll() {
    const res = await api.post<{
      data: { message: string; count: number; projects: ProjectRisk[] };
    }>("/risk/recalculate", {});
    return res.data;
  },

  /** POST /risk/:projectId/recalculate — recalculate one */
  async recalculateOne(projectId: string) {
    const res = await api.post<{ data: { risk: ProjectRisk } }>(
      `/risk/${projectId}/recalculate`,
      {}
    );
    return res.data.risk;
  },
};
