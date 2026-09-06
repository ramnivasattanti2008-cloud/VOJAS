/**
 * Admin API Client — System stats, audit, alerts, users
 */

import type { ApiClient } from './client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  projects: {
    total: number;
    completed: number;
    inProgress: number;
    delayed: number;
    completionRate: number;
  };
  anomalies: {
    total: number;
    open: number;
    resolvedRate: number;
  };
  reports: {
    total: number;
    pending: number;
    pendingRate: number;
  };
  users: {
    total: number;
    active: number;
  };
  vendors: {
    total: number;
  };
  satellite: {
    totalObservations: number;
  };
  financial: {
    totalSanctioned: number;
    totalSpent: number;
    utilizationRate: number;
  };
}

export interface AuditEvent {
  id: string;
  actorId: string;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface AnomalyAlert {
  id: string;
  title: string;
  severity: string;
  category: string;
  projectId?: string;
  project?: {
    id: string;
    name: string;
    sector: string;
    state: string;
    district: string;
  };
  createdAt: string;
}

export interface AdminActivity {
  period: { days: number; since: string };
  summary: {
    newProjects: number;
    newReports: number;
    newAnomalies: number;
    resolvedAnomalies: number;
    newUsers: number;
    auditEvents: number;
  };
  dailyProjects: Array<{ date: string; count: number }>;
}

// ── API Functions ────────────────────────────────────────────────────────────

export function createAdminApi(client: ApiClient) {
  return {
    /**
     * GET /admin/stats — system-wide statistics
     */
    getStats(): Promise<AdminStats> {
      return client.get('/admin/stats');
    },

    /**
     * GET /admin/audit — recent audit events
     */
    getAudit(params?: { limit?: number }): Promise<AuditEvent[]> {
      return client.get('/admin/audit', params);
    },

    /**
     * GET /admin/alerts — active risk alerts
     */
    getAlerts(params?: { limit?: number; severity?: string }): Promise<{
      openAnomalies: AnomalyAlert[];
      recentHighSeverity: AnomalyAlert[];
      byCategory: { category: string; count: number }[];
      byStatus: { status: string; count: number }[];
      totalOpen: number;
      totalHighSeverity: number;
    }> {
      return client.get('/admin/alerts', params);
    },

    /**
     * GET /admin/users — user list
     */
    getUsers(params?: { page?: number; limit?: number; role?: string; search?: string }): Promise<{
      users: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
      return client.get('/admin/users', params);
    },

    /**
     * GET /admin/activity — recent activity summary
     */
    getActivity(params?: { days?: number }): Promise<AdminActivity> {
      return client.get('/admin/activity', params);
    },
  };
}
