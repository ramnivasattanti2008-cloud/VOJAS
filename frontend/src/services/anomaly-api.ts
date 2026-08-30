import { api } from "./api";
import type { Anomaly, AnomalyRule } from "@/types";

// Re-export so feature pages can import Anomaly alongside the API
export type { Anomaly };

export interface AnomalyFilters {
  status?: string;
  severity?: string;
  category?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAnomalies {
  items: Anomaly[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ScanResult {
  newAnomalies: number;
  totalAnomalies: number;
  ruleCounts: Record<string, number>;
}

export interface AnomalyStats {
  total: number;
  open: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byCategory: { category: string; _count: { id: number } }[];
}

export const anomalyApi = {
  list(filters: AnomalyFilters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.category) params.set("category", filters.category);
    if (filters.projectId) params.set("projectId", filters.projectId);
    params.set("page", String(filters.page ?? 1));
    params.set("limit", String(filters.limit ?? 20));
    return api.get<PaginatedAnomalies>(`/anomalies?${params.toString()}`);
  },

  async stats(): Promise<AnomalyStats> {
    const res = await api.get<{ data: AnomalyStats }>("/anomalies/stats");
    return res.data;
  },

  async get(id: string): Promise<Anomaly> {
    const res = await api.get<{ data: { anomaly: Anomaly } }>(`/anomalies/${id}`);
    return res.data.anomaly;
  },

  async acknowledge(id: string): Promise<Anomaly> {
    const res = await api.post<{ data: { anomaly: Anomaly } }>(`/anomalies/${id}/acknowledge`, {});
    return res.data.anomaly;
  },

  async resolve(id: string, resolution: string): Promise<Anomaly> {
    const res = await api.post<{ data: { anomaly: Anomaly } }>(`/anomalies/${id}/resolve`, { resolution });
    return res.data.anomaly;
  },

  async scan(): Promise<ScanResult> {
    const res = await api.post<{ data: ScanResult }>("/anomalies/scan", {});
    return res.data;
  },

  async listRules(): Promise<AnomalyRule[]> {
    const res = await api.get<{ data: { rules: AnomalyRule[] } }>("/anomalies/rules");
    return res.data.rules;
  },

  async updateRule(id: string, enabled: boolean): Promise<AnomalyRule> {
    const res = await api.put<{ data: { rule: AnomalyRule } }>(`/anomalies/rules/${id}`, { enabled });
    return res.data.rule;
  },
};
