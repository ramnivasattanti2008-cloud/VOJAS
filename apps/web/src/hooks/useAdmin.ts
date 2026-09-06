/**
 * useAdmin — Admin Dashboard hooks
 */

import { useQuery } from '@tanstack/react-query';
import { createAdminApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';

const adminApi = createAdminApi(apiClient);

// ── Stats ────────────────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
    staleTime: 30_000, // 30 seconds
  });
}

// ── Audit ───────────────────────────────────────────────────────────────────

export function useAdminAudit(params?: { limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: () => adminApi.getAudit(params),
    staleTime: 60_000,
  });
}

// ── Alerts ─────────────────────────────────────────────────────────────────

export function useAdminAlerts(params?: { limit?: number; severity?: string }) {
  return useQuery({
    queryKey: ['admin', 'alerts', params],
    queryFn: () => adminApi.getAlerts(params),
    staleTime: 60_000,
  });
}

// ── Users ───────────────────────────────────────────────────────────────────

export function useAdminUsers(params?: { page?: number; limit?: number; role?: string; search?: string }) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminApi.getUsers(params),
    staleTime: 60_000,
  });
}

// ── Activity ─────────────────────────────────────────────────────────────────

export function useAdminActivity(params?: { days?: number }) {
  return useQuery({
    queryKey: ['admin', 'activity', params],
    queryFn: () => adminApi.getActivity(params),
    staleTime: 60_000,
  });
}
