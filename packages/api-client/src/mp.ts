import type { ApiClient } from './client.js';
import type { ApiResponse, PaginatedResponse } from './types.js';
import type { MP } from './types.js';
import type { Project } from './projects.js';

// ── MP Command Center API ──────────────────────────────────────────────────────

export interface MPConstituencySummary {
  mpId: string;
  constituency: string;
  state: string;
  house: string;
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  delayedProjects: number;
  attentionNeeded: number;
  totalSanctioned: number;
  totalSpent: number;
  utilizationRate: number;
  recentActivity: {
    date: string;
    type: 'REPORT' | 'VERIFICATION' | 'ANOMALY' | 'UPDATE';
    description: string;
  }[];
}

export interface MPFinancialSummary {
  totalSanctioned: number;
  totalReleased: number;
  totalSpent: number;
  utilizationPercent: number;
  bySector: Array<{
    sector: string;
    sanctioned: number;
    spent: number;
    utilization: number;
  }>;
  byMonth: Array<{
    month: string;
    sanctioned: number;
    spent: number;
  }>;
}

export interface MPDemandCluster {
  id: string;
  location: string;
  latitude: number;
  longitude: number;
  requestCount: number;
  sector: string;
  primaryIssue: string;
  intensity: 'LOW' | 'MEDIUM' | 'HIGH';
  recentRequests: Array<{
    id: string;
    description: string;
    submittedAt: string;
  }>;
}

export interface MPCitizenSignal {
  id: string;
  type: 'REPORT' | 'CLAIM' | 'FEEDBACK';
  title: string;
  description: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  sector?: string;
  status: string;
  submittedAt: string;
  projectId?: string;
  projectName?: string;
}

export function createMpApi(client: ApiClient) {
  return {
    // Get MP's own constituency summary
    getMyConstituency(mpId: string) {
      return client.get<MPConstituencySummary>(`/mp/${mpId}/constituency`);
    },

    // Get MP's project portfolio
    getProjects(mpId: string, params?: {
      status?: string;
      sector?: string;
      district?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) {
      return client.get<PaginatedResponse<Project>>(`/mp/${mpId}/projects`, params);
    },

    // Get MP's financial overview
    getFinancials(mpId: string) {
      return client.get<MPFinancialSummary>(`/mp/${mpId}/financials`);
    },

    // Get citizen demand clusters
    getDemandClusters(mpId: string) {
      return client.get<MPDemandCluster[]>(`/mp/${mpId}/demands/clusters`);
    },

    // Get citizen signals
    getCitizenSignals(mpId: string, params?: {
      page?: number;
      limit?: number;
    }) {
      return client.get<PaginatedResponse<MPCitizenSignal>>(`/mp/${mpId}/signals`, params);
    },

    // Generate constituency report
    generateReport(mpId: string, params: {
      type: 'PROGRESS' | 'FINANCIAL' | 'DEMAND' | 'SECTOR';
      format?: 'PDF' | 'CSV' | 'JSON';
      startDate?: string;
      endDate?: string;
      sector?: string;
    }) {
      return client.post<{ reportId: string; downloadUrl: string }>(`/mp/${mpId}/reports/generate`, params);
    },
  };
}

export type MPApi = ReturnType<typeof createMpApi>;
