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

export function useMPProjects(mpId: string | null | undefined, filters?: MPProjectFilters) {
  return useQuery({
    queryKey: ['mp', mpId, 'projects', filters],
    queryFn: () => mpApi.getProjects(mpId!, filters),
    enabled: !!mpId,
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

export function useMPDemandClusters(mpId: string | null | undefined) {
  return useQuery({
    queryKey: ['mp', mpId, 'demands'],
    queryFn: () => mpApi.getDemandClusters(mpId!),
    enabled: !!mpId,
  });
}

// ── MP Citizen Signals ─────────────────────────────────────────────────────────

export function useMPCitizenSignals(mpId: string | null | undefined, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['mp', mpId, 'signals', params],
    queryFn: () => mpApi.getCitizenSignals(mpId!, params),
    enabled: !!mpId,
  });
}

// ── MP Reports ─────────────────────────────────────────────────────────────────

export interface MPReportParams {
  type: 'PROGRESS' | 'FINANCIAL' | 'DEMAND' | 'SECTOR';
  format?: 'PDF' | 'CSV' | 'JSON';
  startDate?: string;
  endDate?: string;
  sector?: string;
}
