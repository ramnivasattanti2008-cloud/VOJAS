import type { ApiClient } from './client.js';
import type { PaginatedResponse } from './types.js';
import type { Project } from './projects.js';

// ── MP Command Center API ──────────────────────────────────────────────────────

export interface MPConstituencySummary {
  /** False when the authenticated user has no admin-linked MP record yet. */
  linked: boolean;
  mpId: string | null;
  constituency: string | null;
  state: string | null;
  house: string | null;
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  delayedProjects: number;
  attentionNeeded: number;
  totalSanctioned: number;
  totalSpent: number;
  utilizationRate: number;
  /** Real per-sector project counts (never a fabricated/random split). */
  bySectorCount: Array<{ sector: string; count: number }>;
  recentActivity: {
    date: string;
    type: 'REPORT' | 'VERIFICATION' | 'ANOMALY' | 'UPDATE';
    description: string;
  }[];
}

export interface MPFinancialSummary {
  /** False when the authenticated user has no admin-linked MP record yet. */
  linked: boolean;
  totalSanctioned: number;
  /** Null when no real RELEASE-type observation exists yet for this MP's projects. */
  totalReleased: number | null;
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
  /** Null when no report in this group carries real coordinates. */
  latitude: number | null;
  longitude: number | null;
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
  /** Always REPORT — there is no CLAIM/FEEDBACK source in the schema. */
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
    // Get the authenticated user's own MP constituency summary. Resolved
    // entirely server-side from the admin-controlled User<->MP link —
    // there is no client-supplied MP id to pass.
    getMyConstituency() {
      return client.get<MPConstituencySummary>('/mp/me/constituency');
    },

    // Get the authenticated user's own MP's project portfolio. Resolved
    // entirely server-side from the admin-controlled User<->MP link.
    getProjects(params?: {
      status?: string;
      sector?: string;
      district?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) {
      return client.get<PaginatedResponse<Project> & { linked: boolean }>('/mp/me/projects', params);
    },

    // Get the authenticated user's own MP financial overview. Resolved
    // entirely server-side from the admin-controlled User<->MP link.
    getFinancials() {
      return client.get<MPFinancialSummary>('/mp/me/financials');
    },

    // Get the authenticated user's own MP's citizen demand clusters.
    getDemandClusters() {
      return client.get<{ linked: boolean; data: MPDemandCluster[] }>('/mp/me/demand-clusters');
    },

    // Get the authenticated user's own MP's citizen signals.
    getCitizenSignals(params?: { page?: number; limit?: number }) {
      return client.get<PaginatedResponse<MPCitizenSignal> & { linked: boolean; pendingCount: number }>(
        '/mp/me/signals',
        params
      );
    },
  };
}

export type MPApi = ReturnType<typeof createMpApi>;
