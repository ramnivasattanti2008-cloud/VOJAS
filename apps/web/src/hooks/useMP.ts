'use client';

/**
 * useMP — MP Command Center hooks (M14)
 */

import { useQuery } from '@tanstack/react-query';
import { createMPCommandApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import type { ProjectSector, ProjectStatus } from '@vojas/shared';

const mpApi = createMPCommandApi(apiClient);

// ── My Constituency ─────────────────────────────────────────────────────────────
// Resolved entirely server-side from the authenticated user's admin-linked
// MP record — no mpId is passed from the client. Callers should check
// `data.linked` and render a "not linked" state when it's false, rather
// than falling back to placeholder data.

export function useMPConstituency() {
  return useQuery({
    queryKey: ['mp', 'me', 'constituency'],
    queryFn: () => mpApi.getMyConstituency(),
  });
}

// ── MP Projects ─────────────────────────────────────────────────────────────────

export interface MPProjectFilters {
  status?: ProjectStatus;
  sector?: ProjectSector;
  district?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useMPProjects(filters?: MPProjectFilters) {
  return useQuery({
    queryKey: ['mp', 'me', 'projects', filters],
    queryFn: () => mpApi.getProjects(filters),
  });
}

// ── MP Financials ───────────────────────────────────────────────────────────────
// Same server-side resolution as useMPConstituency above — check
// `data.linked` before rendering financial figures.

export function useMPFinancials() {
  return useQuery({
    queryKey: ['mp', 'me', 'financials'],
    queryFn: () => mpApi.getFinancials(),
  });
}

// ── MP Demand Clusters ─────────────────────────────────────────────────────────

export function useMPDemandClusters() {
  return useQuery({
    queryKey: ['mp', 'me', 'demands'],
    queryFn: () => mpApi.getDemandClusters(),
  });
}

// ── MP Citizen Signals ─────────────────────────────────────────────────────────

export function useMPCitizenSignals(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['mp', 'me', 'signals', params],
    queryFn: () => mpApi.getCitizenSignals(params),
  });
}
