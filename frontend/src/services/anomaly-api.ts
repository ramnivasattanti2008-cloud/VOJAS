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
    return api.get<AnomalyStats>("/anomalies/stats");
  },

  async get(id: string): Promise<Anomaly> {
    const res = await api.get<{ anomaly: Anomaly }>(`/anomalies/${id}`);
    return (res as any).anomaly ?? res as any;
  },

  async acknowledge(id: string): Promise<Anomaly> {
    const res = await api.post<{ anomaly: Anomaly }>(`/anomalies/${id}/acknowledge`, {});
    return (res as any).anomaly ?? res as any;
  },

  async resolve(id: string, resolution: string): Promise<Anomaly> {
    const res = await api.post<{ anomaly: Anomaly }>(`/anomalies/${id}/resolve`, { resolution });
    return (res as any).anomaly ?? res as any;
  },

  async scan(): Promise<ScanResult> {
    return api.post<ScanResult>("/anomalies/scan", {});
  },

  async listRules(): Promise<AnomalyRule[]> {
    const res = await api.get<{ rules: AnomalyRule[] }>("/anomalies/rules");
    return (res as any).rules ?? res as any;
  },

  async updateRule(id: string, enabled: boolean): Promise<AnomalyRule> {
    const res = await api.put<{ rule: AnomalyRule }>(`/anomalies/rules/${id}`, { enabled });
    return (res as any).rule ?? res as any;
  },
};
