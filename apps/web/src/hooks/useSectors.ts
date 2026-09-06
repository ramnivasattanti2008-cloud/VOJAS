/**
 * useSectors — M13 16-Sector Intelligence Framework hooks
 */

import { useQuery } from '@tanstack/react-query';
import { createSectorsApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import type { ProjectSector } from '@vojas/shared';

const sectorsApi = createSectorsApi(apiClient);

// ── Sector Configuration ─────────────────────────────────────────────────────

export function useSectors() {
  return useQuery({
    queryKey: ['sectors'],
    queryFn: () => sectorsApi.getAll(),
  });
}

export function useSectorConfig(code: ProjectSector) {
  return useQuery({
    queryKey: ['sectors', 'config', code],
    queryFn: () => sectorsApi.getConfig(code),
    enabled: !!code,
  });
}

// ── Sector Overview ──────────────────────────────────────────────────────────

export function useSectorOverview() {
  return useQuery({
    queryKey: ['sectors', 'overview'],
    queryFn: () => sectorsApi.getOverview(),
  });
}

export function useSectorSummary() {
  return useQuery({
    queryKey: ['sectors', 'summary'],
    queryFn: () => sectorsApi.getSummary(),
  });
}

// ── Sector Projects ──────────────────────────────────────────────────────────

export function useSectorProjects(code: ProjectSector, params?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['sectors', 'projects', code, params],
    queryFn: () => sectorsApi.getProjects(code, params),
    enabled: !!code,
  });
}

// ── Sector Alerts ────────────────────────────────────────────────────────────

export function useSectorAlerts(code: ProjectSector) {
  return useQuery({
    queryKey: ['sectors', 'alerts', code],
    queryFn: () => sectorsApi.getAlerts(code),
    enabled: !!code,
  });
}

// ── Sector Reports ───────────────────────────────────────────────────────────

export function useSectorReports(code: ProjectSector, params?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['sectors', 'reports', code, params],
    queryFn: () => sectorsApi.getReports(code, params),
    enabled: !!code,
  });
}

// ── Sector Analytics ─────────────────────────────────────────────────────────

export function useSectorAnalytics(code: ProjectSector) {
  return useQuery({
    queryKey: ['sectors', 'analytics', code],
    queryFn: () => sectorsApi.getAnalytics(code),
    enabled: !!code,
  });
}
