'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createRiskApi } from '@vojas/api-client';
import type {
  RiskSignal,
  RiskFinding,
  RiskEvent,
  ProjectRiskSummary,
  RiskAnalysisResult,
  NationalRiskSummary,
  RiskTrend,
  RiskHotspot,
  RiskRule,
} from '@vojas/api-client';
import { apiClient } from '@/lib/api';

const riskApi = createRiskApi(apiClient);

// ── National / summary ───────────────────────────────────────

export function useNationalRiskSummary() {
  return useQuery<NationalRiskSummary, Error>({
    queryKey: ['risk', 'summary'],
    queryFn: () => riskApi.getSummary(),
  });
}

export function useRiskTrends(days = 30) {
  return useQuery<{ trends: RiskTrend[] }, Error>({
    queryKey: ['risk', 'trends', days],
    queryFn: () => riskApi.getTrends({ days }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRiskHotspots(minRiskScore = 40, limit = 50) {
  return useQuery<{ hotspots: RiskHotspot[] }, Error>({
    queryKey: ['risk', 'hotspots', minRiskScore, limit],
    queryFn: () => riskApi.getHotspots({ minRiskScore, limit }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRiskRules() {
  return useQuery<{ rules: RiskRule[] }, Error>({
    queryKey: ['risk', 'rules'],
    queryFn: () => riskApi.getRules(),
    staleTime: 10 * 60 * 1000,
  });
}

// ── Project-level ─────────────────────────────────────────────

export function useProjectRisk(projectId: string | null | undefined) {
  return useQuery<ProjectRiskSummary, Error>({
    queryKey: ['projects', projectId, 'risk'],
    queryFn: () => riskApi.getRisk(projectId!),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRiskSignals(projectId: string | null | undefined) {
  return useQuery<{ signals: RiskSignal[]; total: number }, Error>({
    queryKey: ['projects', projectId, 'risk', 'signals'],
    queryFn: () => riskApi.getSignals(projectId!),
    enabled: !!projectId,
  });
}

export function useRiskFindings(
  projectId: string | null | undefined,
  filters?: { status?: string; severity?: string }
) {
  return useQuery<{ findings: RiskFinding[]; total: number }, Error>({
    queryKey: projectId
      ? ['projects', projectId, 'risk', 'findings', filters]
      : ['risk', 'findings', 'global', filters],
    queryFn: () =>
      projectId
        ? riskApi.getFindings(projectId, filters)
        : riskApi.getAllFindings(filters),
  });
}

/**
 * Explicit national/global findings query (always hits /risk/findings).
 * Provided separately so callers can be unambiguous.
 */
export function useAllRiskFindings(filters?: { status?: string; severity?: string; page?: number; limit?: number }) {
  return useQuery<{ findings: RiskFinding[]; total: number }, Error>({
    queryKey: ['risk', 'findings', 'global', filters],
    queryFn: () => riskApi.getAllFindings(filters),
  });
}

export function useRiskFinding(projectId: string | null | undefined, findingId: string | null | undefined) {
  return useQuery<{
    finding: RiskFinding;
    signals: RiskSignal[];
    project: { name: string; sector: string; status: string; approvedAmount: number; spentAmount: number };
  }, Error>({
    queryKey: ['projects', projectId, 'risk', 'findings', findingId],
    queryFn: () => riskApi.getFinding(projectId!, findingId!),
    enabled: !!projectId && !!findingId,
  });
}

export function useRiskEvents(projectId: string | null | undefined) {
  return useQuery<{ events: RiskEvent[] }, Error>({
    queryKey: ['projects', projectId, 'risk', 'events'],
    queryFn: () => riskApi.getEvents(projectId!),
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

// ── Mutations ────────────────────────────────────────────────

export interface AnalyzeRiskParams {
  forceNewRun?: boolean;
}

export function useAnalyzeRisk(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation<RiskAnalysisResult, Error, AnalyzeRiskParams>({
    mutationFn: (params) => riskApi.analyze(projectId!, params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'risk'] });
    },
  });
}

export interface UpdateFindingStatusParams {
  status: string;
  resolution?: string;
}

export interface FindingStatusUpdateResult {
  id: string;
  status: RiskFinding['status'];
  acknowledgedById?: string | null;
  acknowledgedAt?: string | null;
  resolvedById?: string | null;
  resolvedAt?: string | null;
  resolution?: string | null;
}

export function useUpdateFindingStatus() {
  const qc = useQueryClient();
  return useMutation<FindingStatusUpdateResult, Error, { findingId: string; params: UpdateFindingStatusParams }>({
    mutationFn: ({ findingId, params }) => riskApi.updateFindingStatus(findingId, params),
    onSuccess: () => {
      // Invalidate every key whose first two segments are ['risk', 'findings']
      // — covers both per-project and global finding lists.
      qc.invalidateQueries({ queryKey: ['risk', 'findings'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
