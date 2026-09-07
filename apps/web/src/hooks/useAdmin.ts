/**
 * useAdmin — M14 System Control Center hooks
 * All administrative operations for VOJAS platform
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createAdminApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';

const adminApi = createAdminApi(apiClient);

// ── System Overview ─────────────────────────────────────────────────────────

export function useSystemOverview() {
  return useQuery({
    queryKey: ['admin', 'system-overview'],
    queryFn: () => adminApi.getSystemOverview(),
    staleTime: 15_000, // 15 seconds for real-time feel
    refetchInterval: 30_000, // refresh every 30s
  });
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
    staleTime: 30_000,
  });
}

// ── Audit ────────────────────────────────────────────────────────────────────

export function useAdminAudit(params?: { limit?: number; actorId?: string; action?: string; entityType?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: () => adminApi.getAudit(params),
    staleTime: 60_000,
  });
}

export function useAdminAuditExport(params?: { startDate?: string; endDate?: string; actorId?: string }) {
  return useQuery({
    queryKey: ['admin', 'audit-export', params],
    queryFn: () => adminApi.getAuditExport(params),
    staleTime: 0,
    enabled: false, // Only fetch on demand
  });
}

// ── Alerts ──────────────────────────────────────────────────────────────────

export function useAdminAlerts(params?: { limit?: number; severity?: string }) {
  return useQuery({
    queryKey: ['admin', 'alerts', params],
    queryFn: () => adminApi.getAlerts(params),
    staleTime: 60_000,
  });
}

// ── Users ────────────────────────────────────────────────────────────────────

export function useAdminUsers(params?: { page?: number; limit?: number; role?: string; search?: string; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminApi.getUsers(params),
    staleTime: 60_000,
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: () => adminApi.getUser(id),
    staleTime: 60_000,
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; role: string; password?: string }) =>
      adminApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; role: string; isActive: boolean }> }) =>
      adminApi.updateUser(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', variables.id] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export function useUserAccessHistory(id: string) {
  return useQuery({
    queryKey: ['admin', 'users', id, 'access'],
    queryFn: () => adminApi.getUserAccessHistory(id),
    staleTime: 60_000,
    enabled: !!id,
  });
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export function useAdminRoles() {
  return useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => adminApi.getRoles(),
    staleTime: 60_000,
  });
}

export function useAdminRole(id: string) {
  return useQuery({
    queryKey: ['admin', 'roles', id],
    queryFn: () => adminApi.getRole(id),
    staleTime: 60_000,
    enabled: !!id,
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; description: string; permissions: string[] }> }) =>
      adminApi.updateRole(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles', variables.id] });
    },
  });
}

export function useRoleAuditTrail(roleId: string) {
  return useQuery({
    queryKey: ['admin', 'roles', roleId, 'audit'],
    queryFn: () => adminApi.getRoleAuditTrail(roleId),
    staleTime: 60_000,
    enabled: !!roleId,
  });
}

export function useRolePermissionsMatrix() {
  return useQuery({
    queryKey: ['admin', 'roles', 'permissions-matrix'],
    queryFn: () => adminApi.getRolePermissionsMatrix(),
    staleTime: 60_000,
  });
}

// ── Data Sources ───────────────────────────────────────────────────────────────

export function useAdminDataSources(params?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['admin', 'data-sources', params],
    queryFn: () => adminApi.getDataSources(params),
    staleTime: 60_000,
  });
}

export function useTriggerDataSourceSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.triggerDataSourceSync(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'data-sources'] });
    },
  });
}

export function useDataSourceRecords(id: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'data-sources', id, 'records', params],
    queryFn: () => adminApi.getDataSourceRecords(id, params),
    staleTime: 60_000,
    enabled: !!id,
  });
}

// ── Rules ─────────────────────────────────────────────────────────────────────

export function useAdminRules(params?: { category?: string; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'rules', params],
    queryFn: () => adminApi.getRules(params),
    staleTime: 60_000,
  });
}

export function useAdminRule(id: string) {
  return useQuery({
    queryKey: ['admin', 'rules', id],
    queryFn: () => adminApi.getRule(id),
    staleTime: 60_000,
    enabled: !!id,
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminApi.updateRule(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rules'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'rules', variables.id] });
    },
  });
}

export function useRuleAuditTrail(ruleId: string) {
  return useQuery({
    queryKey: ['admin', 'rules', ruleId, 'audit'],
    queryFn: () => adminApi.getRuleAuditTrail(ruleId),
    staleTime: 60_000,
    enabled: !!ruleId,
  });
}

export function useRuleVersions(ruleId: string) {
  return useQuery({
    queryKey: ['admin', 'rules', ruleId, 'versions'],
    queryFn: () => adminApi.getRuleVersions(ruleId),
    staleTime: 60_000,
    enabled: !!ruleId,
  });
}

// ── AI Control ────────────────────────────────────────────────────────────────

export function useAIProviders() {
  return useQuery({
    queryKey: ['admin', 'ai', 'providers'],
    queryFn: () => adminApi.getAIProviders(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useAIProviderStats() {
  return useQuery({
    queryKey: ['admin', 'ai', 'stats'],
    queryFn: () => adminApi.getAIProviderStats(),
    staleTime: 60_000,
  });
}

// ── Satellites ─────────────────────────────────────────────────────────────────

export function useSatelliteProviders() {
  return useQuery({
    queryKey: ['admin', 'satellites', 'providers'],
    queryFn: () => adminApi.getSatelliteProviders(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useSatelliteObservations(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'satellites', 'observations', params],
    queryFn: () => adminApi.getSatelliteObservations(params),
    staleTime: 30_000,
  });
}

export function useRetrySatelliteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => adminApi.retrySatelliteJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'satellites'] });
    },
  });
}

// ── Background Jobs ─────────────────────────────────────────────────────────────

export function useAdminJobs(params?: { page?: number; limit?: number; status?: string; type?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['admin', 'jobs', params],
    queryFn: () => adminApi.getJobs(params),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useRetryJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => adminApi.retryJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
    },
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => adminApi.cancelJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
    },
  });
}

// ── Health ─────────────────────────────────────────────────────────────────────

export function useHealthStatus() {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: () => adminApi.getHealth(),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useHealthHistory(hours?: number) {
  return useQuery({
    queryKey: ['admin', 'health', 'history', hours ?? 24],
    queryFn: () => adminApi.getHealthHistory(hours),
    staleTime: 60_000,
  });
}

// ── Security ────────────────────────────────────────────────────────────────────

export function useSecurityEvents(params?: { page?: number; limit?: number; severity?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['admin', 'security', 'events', params],
    queryFn: () => adminApi.getSecurityEvents(params),
    staleTime: 30_000,
  });
}

// ── Activity ────────────────────────────────────────────────────────────────────

export function useAdminActivity(params?: { days?: number }) {
  return useQuery({
    queryKey: ['admin', 'activity', params],
    queryFn: () => adminApi.getActivity(params),
    staleTime: 60_000,
  });
}
