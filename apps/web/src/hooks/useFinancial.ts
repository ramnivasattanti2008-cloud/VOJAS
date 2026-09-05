'use client';

import { useQuery } from '@tanstack/react-query';
import { createFinancialApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import type {
  FundLifecycle,
  FinancialObservation,
  ReconciliationResult,
  PeerBenchmark,
  FinancialRiskSignals,
  CrossSourceCorrelation,
} from '@vojas/api-client';

const financialApi = createFinancialApi(apiClient);

export function useFinancialObservations(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'financial'],
    queryFn: () => financialApi.list(projectId!),
    enabled: !!projectId,
  });
}

export function useFundLifecycle(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'financial', 'summary'],
    queryFn: () => financialApi.getSummary(projectId!),
    enabled: !!projectId,
  });
}

export function useFinancialReconciliation(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'financial', 'reconciliation'],
    queryFn: () => financialApi.getReconciliation(projectId!),
    enabled: !!projectId,
  });
}

export function usePeerBenchmarks(
  projectId: string | null | undefined,
  scope: 'sector' | 'district' | 'state' | 'national' = 'sector'
) {
  return useQuery({
    queryKey: ['projects', projectId, 'financial', 'benchmarks', scope],
    queryFn: () => financialApi.getBenchmarks(projectId!, scope),
    enabled: !!projectId,
    retry: false,
  });
}

export function useFinancialRiskSignals(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'financial', 'signals'],
    queryFn: () => financialApi.getSignals(projectId!),
    enabled: !!projectId,
  });
}

export function useCrossSourceCorrelation(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'financial', 'correlation'],
    queryFn: () => financialApi.getCorrelation(projectId!),
    enabled: !!projectId,
  });
}
