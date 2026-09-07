/**
 * Admin API Client — M14 System Control Center
 * Full administrative operations for VOJAS platform
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

// User Management
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UserWithPermissions extends AdminUser {
  permissions: string[];
  accessHistory: Array<{
    action: string;
    timestamp: string;
    ipAddress?: string;
  }>;
}

// Roles & Permissions
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleChangeAudit {
  id: string;
  roleId: string;
  roleName: string;
  actorId: string;
  actorName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  previousValue: any;
  newValue: any;
  timestamp: string;
}

// Data Sources
export interface DataSource {
  id: string;
  sourceName: string;
  datasetName: string;
  department: string | null;
  officialUrl: string | null;
  lastFetched: string | null;
  lastUpdated: string | null;
  format: string;
  apiAvailable: boolean;
  downloadAvailable: boolean;
  status: string;
  notes: string | null;
  recordCount: number;
  lastError: string | null;
}

export interface DataSourceSyncResult {
  success: boolean;
  recordsImported: number;
  recordsUpdated: number;
  recordsRejected: number;
  duration: number;
  error?: string;
}

// Rules Management
export interface RiskRule {
  id: string;
  name: string;
  category: string;
  version: string;
  status: string;
  severityModifier: string;
  confidenceModifier: string;
  enabled: boolean;
  lastRun: string | null;
  matchCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RuleChangeAudit {
  id: string;
  ruleId: string;
  ruleName: string;
  actorId: string;
  actorName: string;
  previousValue: any;
  newValue: any;
  timestamp: string;
}

// AI Providers
export interface AIProvider {
  id: string;
  name: string;
  status: 'ACTIVE' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  models: Array<{
    id: string;
    name: string;
    status: string;
    latencyMs: number | null;
    failureCount: number;
    lastUsed: string | null;
  }>;
  usageStats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgLatencyMs: number;
    last24h: {
      requests: number;
      avgLatencyMs: number;
      failures: number;
    };
  };
}

// Satellite Providers
export interface SatelliteProvider {
  id: string;
  name: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
  datasets: Array<{
    id: string;
    name: string;
    available: boolean;
    lastUpdated: string | null;
    coverage: string;
  }>;
  stats: {
    totalObservations: number;
    processingQueue: number;
    failedJobs: number;
    avgProcessingTimeMs: number;
  };
}

// Background Jobs
export interface BackgroundJob {
  id: string;
  type: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'CANCELLED';
  projectId?: string;
  projectName?: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  error: string | null;
  retryCount: number;
  maxRetries: number;
}

// Health Checks
export interface HealthCheck {
  service: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  latencyMs: number | null;
  lastCheck: string;
  message?: string;
}

export interface HealthStatus {
  overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  timestamp: string;
  checks: HealthCheck[];
  history: Array<{
    timestamp: string;
    overall: string;
    healthyCount: number;
    degradedCount: number;
    unhealthyCount: number;
  }>;
}

// Security Events
export interface SecurityEvent {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actorId?: string;
  actorEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  resource: string;
  action: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  metadata?: any;
  timestamp: string;
}

// System Overview
export interface SystemOverview {
  status: {
    overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    score: number;
    checks: {
      healthy: number;
      degraded: number;
      unhealthy: number;
      total: number;
    };
  };
  jobs: {
    active: number;
    queued: number;
    failed: number;
    retrying: number;
  };
  providers: {
    satellite: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
    map: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
    ai: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
    database: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
  };
  dataIngestion: {
    lastSync: string | null;
    status: 'IDLE' | 'SYNCING' | 'ERROR';
    recordsToday: number;
  };
  satelliteProcessing: {
    queueDepth: number;
    avgProcessingTime: number;
    observationsToday: number;
  };
  recentAdminActions: Array<{
    id: string;
    action: string;
    actor: string;
    timestamp: string;
  }>;
  securityEventsLast24h: {
    total: number;
    critical: number;
    high: number;
  };
}

// ── Type Aliases ─────────────────────────────────────────────────────────────

/** Alias for backward compatibility */
export type User = AdminUser;

/** System health summary type */
export type SystemHealth = HealthStatus;

// ── API Functions ────────────────────────────────────────────────────────────

export function createAdminApi(client: ApiClient) {
  return {
    // ── Stats ──────────────────────────────────────────────────────────────
    getStats(): Promise<AdminStats> {
      return client.get('/admin/stats');
    },

    // ── Audit ──────────────────────────────────────────────────────────────
    getAudit(params?: { limit?: number; actorId?: string; action?: string; entityType?: string; startDate?: string; endDate?: string }): Promise<AuditEvent[]> {
      return client.get('/admin/audit', params);
    },

    getAuditExport(params?: { startDate?: string; endDate?: string; actorId?: string }): Promise<string> {
      return client.get('/admin/audit/export', params);
    },

    // ── Alerts ─────────────────────────────────────────────────────────────
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

    // ── Users ──────────────────────────────────────────────────────────────
    getUsers(params?: { page?: number; limit?: number; role?: string; search?: string; status?: string }): Promise<{
      users: AdminUser[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
      return client.get('/admin/users', params);
    },

    getUser(id: string): Promise<UserWithPermissions> {
      return client.get(`/admin/users/${id}`);
    },

    createUser(data: { name: string; email: string; role: string; password?: string }): Promise<AdminUser> {
      return client.post('/admin/users', data);
    },

    updateUser(id: string, data: Partial<{ name: string; role: string; isActive: boolean }>): Promise<AdminUser> {
      return client.patch(`/admin/users/${id}`, data);
    },

    deleteUser(id: string): Promise<void> {
      return client.delete(`/admin/users/${id}`);
    },

    getUserAccessHistory(id: string): Promise<Array<{ action: string; timestamp: string; ipAddress?: string }>> {
      return client.get(`/admin/users/${id}/access`);
    },

    // ── Roles ───────────────────────────────────────────────────────────────
    getRoles(): Promise<Role[]> {
      return client.get('/admin/roles');
    },

    getRole(id: string): Promise<Role> {
      return client.get(`/admin/roles/${id}`);
    },

    updateRole(id: string, data: Partial<{ name: string; description: string; permissions: string[] }>): Promise<Role> {
      return client.patch(`/admin/roles/${id}`, data);
    },

    getRoleAuditTrail(roleId: string): Promise<RoleChangeAudit[]> {
      return client.get(`/admin/roles/${roleId}/audit`);
    },

    getRolePermissionsMatrix(): Promise<Record<string, string[]>> {
      return client.get('/admin/roles/permissions-matrix');
    },

    // ── Data Sources ─────────────────────────────────────────────────────────
    getDataSources(params?: { status?: string; search?: string }): Promise<DataSource[]> {
      return client.get('/admin/data-sources', params);
    },

    triggerDataSourceSync(id: string): Promise<DataSourceSyncResult> {
      return client.post(`/admin/data-sources/${id}/sync`, {});
    },

    getDataSourceRecords(id: string, params?: { page?: number; limit?: number }): Promise<{
      records: any[];
      pagination: { page: number; limit: number; total: number };
    }> {
      return client.get(`/admin/data-sources/${id}/records`, params);
    },

    // ── Rules ───────────────────────────────────────────────────────────────
    getRules(params?: { category?: string; status?: string }): Promise<RiskRule[]> {
      return client.get('/admin/rules', params);
    },

    getRule(id: string): Promise<RiskRule> {
      return client.get(`/admin/rules/${id}`);
    },

    updateRule(id: string, data: Partial<RiskRule>): Promise<RiskRule> {
      return client.patch(`/admin/rules/${id}`, data);
    },

    getRuleAuditTrail(ruleId: string): Promise<RuleChangeAudit[]> {
      return client.get(`/admin/rules/${ruleId}/audit`);
    },

    getRuleVersions(ruleId: string): Promise<any[]> {
      return client.get(`/admin/rules/${ruleId}/versions`);
    },

    // ── AI Control ──────────────────────────────────────────────────────────
    getAIProviders(): Promise<AIProvider[]> {
      return client.get('/admin/ai/providers');
    },

    getAIProviderStats(): Promise<{
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      avgLatencyMs: number;
      byProvider: Record<string, { requests: number; failures: number; avgLatency: number }>;
    }> {
      return client.get('/admin/ai/stats');
    },

    // ── Satellites ──────────────────────────────────────────────────────────
    getSatelliteProviders(): Promise<SatelliteProvider[]> {
      return client.get('/admin/satellites/providers');
    },

    getSatelliteObservations(params?: { page?: number; limit?: number; status?: string }): Promise<{
      observations: any[];
      pagination: { page: number; limit: number; total: number };
    }> {
      return client.get('/admin/satellites/observations', params);
    },

    retrySatelliteJob(jobId: string): Promise<void> {
      return client.post(`/admin/satellites/jobs/${jobId}/retry`, {});
    },

    // ── Background Jobs ─────────────────────────────────────────────────────
    getJobs(params?: { page?: number; limit?: number; status?: string; type?: string; startDate?: string; endDate?: string }): Promise<{
      jobs: BackgroundJob[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
      summary: { byStatus: Record<string, number> };
    }> {
      return client.get('/admin/jobs', params);
    },

    retryJob(jobId: string): Promise<void> {
      return client.post(`/admin/jobs/${jobId}/retry`, {});
    },

    cancelJob(jobId: string): Promise<void> {
      return client.post(`/admin/jobs/${jobId}/cancel`, {});
    },

    // ── Health ──────────────────────────────────────────────────────────────
    getHealth(): Promise<HealthStatus> {
      return client.get('/admin/health');
    },

    getHealthHistory(hours?: number): Promise<HealthStatus['history']> {
      return client.get('/admin/health/history', { hours: hours ?? 24 });
    },

    // ── Security ────────────────────────────────────────────────────────────
    getSecurityEvents(params?: { page?: number; limit?: number; severity?: string; startDate?: string; endDate?: string }): Promise<{
      events: SecurityEvent[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
      summary: { bySeverity: Record<string, number>; byResult: Record<string, number> };
    }> {
      return client.get('/admin/security/events', params);
    },

    // ── Activity ────────────────────────────────────────────────────────────
    getActivity(params?: { days?: number }): Promise<AdminActivity> {
      return client.get('/admin/activity', params);
    },

    // ── System Overview (Command Center Home) ────────────────────────────────
    getSystemOverview(): Promise<SystemOverview> {
      return client.get('/admin/system-overview');
    },

    // ── M14: User Management ─────────────────────────────────────────────────
    adminGetUsers(params?: {
      page?: number;
      limit?: number;
      role?: string;
      search?: string;
      isActive?: boolean;
    }): Promise<{
      users: AdminUser[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
      return client.get('/admin/users', params);
    },

    adminCreateUser(data: {
      name: string;
      email: string;
      password: string;
      role: string;
    }): Promise<AdminUser> {
      return client.post('/admin/users', data);
    },

    adminUpdateRoles(id: string, role: string): Promise<AdminUser> {
      return client.put(`/admin/users/${id}/roles`, { role });
    },

    adminDisableUser(id: string): Promise<AdminUser> {
      return client.put(`/admin/users/${id}/disable`, {});
    },

    adminEnableUser(id: string): Promise<AdminUser> {
      return client.put(`/admin/users/${id}/enable`, {});
    },

    adminGetHealth(): Promise<{
      status: string;
      timestamp: string;
      services: Record<string, string>;
    }> {
      return client.get('/admin/health');
    },

    adminGetJobs(params?: { limit?: number }): Promise<{
      jobs: Array<{
        id: string;
        action: string;
        actorId: string;
        timestamp: string;
        metadata?: any;
      }>;
      total: number;
    }> {
      return client.get('/admin/jobs', params);
    },

    adminGetStats(): Promise<AdminStats> {
      return client.get('/admin/stats');
    },

    // ── M14: Search ──────────────────────────────────────────────────────────
    searchResources(params: {
      q: string;
      type?: string;
      page?: number;
      limit?: number;
    }): Promise<{
      query: string;
      types: string[];
      results: Record<string, unknown>;
      pagination: { page: number; limit: number };
    }> {
      return client.get('/search', params);
    },

    getSearchSuggestions(q: string): Promise<{
      suggestions: Array<{ type: string; id: string; text: string; subtext?: string }>;
    }> {
      return client.get('/search/suggestions', { q });
    },
  };
}

/** Return type of createAdminApi */
export type AdminApi = ReturnType<typeof createAdminApi>;
