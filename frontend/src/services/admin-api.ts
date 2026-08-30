import { api } from "./api";

// ── Types ───────────────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "OFFICER" | "REVIEWER" | "ANALYST" | "VIEWER";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface SystemStats {
  userCount: number;
  projectCount: number;
  reportCount: number;
  openAnomalies: number;
  totalExpenditure: number;
}

export interface AnomalyRule {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  enabled: boolean;
  priority: number;
  matchCount: number;
  lastRun: string | null;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

export interface PaginatedAuditLogs {
  logs: AuditLog[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Service ─────────────────────────────────────────────────────────────────

export const adminApi = {
  // System stats
  stats: () => api.get<SystemStats>("/admin/stats"),

  // Users
  listUsers:  () => api.get<{ users: AdminUser[] }>("/admin/users"),
  createUser: (data: { name: string; email: string; password: string; role?: UserRole }) =>
    api.post<{ user: AdminUser }>("/admin/users", data),
  updateUser: (id: string, data: { name?: string; role?: UserRole }) =>
    api.put<{ user: AdminUser }>(`/admin/users/${id}`, data),
  deleteUser: (id: string) =>
    api.delete<{ message: string }>(`/admin/users/${id}`),

  // Anomaly rules
  listRules: () => api.get<{ rules: AnomalyRule[] }>("/admin/anomaly-rules"),
  updateRule: (id: string, data: { enabled?: boolean; priority?: number }) =>
    api.put<{ rule: AnomalyRule }>(`/admin/anomaly-rules/${id}`, data),

  // Audit logs
  listAuditLogs: (page = 1, limit = 20) =>
    api.get<PaginatedAuditLogs>(`/admin/audit-logs?page=${page}&limit=${limit}`),
};

export { ApiError } from "./api";
