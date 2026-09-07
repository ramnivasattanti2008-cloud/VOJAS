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

export function useMPConstituency(mpId: string | null | undefined) {
  return useQuery({
    queryKey: ['mp', mpId, 'constituency'],
    queryFn: () => mpApi.getMyConstituency(mpId!),
    enabled: !!mpId,
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

export function useMPFinancials(mpId: string | null | undefined) {
  return useQuery({
    queryKey: ['mp', mpId, 'financials'],
    queryFn: () => mpApi.getFinancials(mpId!),
    enabled: !!mpId,
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
