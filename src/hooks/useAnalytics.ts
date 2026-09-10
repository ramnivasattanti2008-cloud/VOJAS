'use client';

/**
 * useAnalytics — M16 Advanced Analytics hooks
 * Forecasting, benchmarking, scenario analysis, and insights
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createAnalyticsApi, type AnalyticsApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';

const analyticsApi: AnalyticsApi = createAnalyticsApi(apiClient);

// ── Query Key Factories ───────────────────────────────────────────────────────

export const analyticsKeys = {
  all: ['analytics'] as const,
  project: (id: string) => [...analyticsKeys.all, 'project', id] as const,
  projectAnalytics: (id: string) => [...analyticsKeys.project(id), 'analytics'] as const,
  projectBenchmark: (id: string, metricType: string) => [...analyticsKeys.project(id), 'benchmark', metricType] as const,
  aggregated: (params: Record<string, string | undefined>) => [...analyticsKeys.all, 'aggregated', params] as const,
  benchmark: (metricType: string) => [...analyticsKeys.all, 'benchmark', metricType] as const,
  patterns: (params?: Record<string, string | undefined>) => [...analyticsKeys.all, 'patterns', params] as const,
  hotspots: (params?: Record<string, number | undefined>) => [...analyticsKeys.all, 'hotspots', params] as const,
  forecast: {
    delay: (projectId: string, horizonDays?: number) => [...analyticsKeys.project(projectId), 'forecast', 'delay', horizonDays] as const,
    cost: (projectId: string) => [...analyticsKeys.project(projectId), 'forecast', 'cost'] as const,
    risk: (projectId: string) => [...analyticsKeys.project(projectId), 'forecast', 'risk'] as const,
  },
  scenarios: {
    all: () => [...analyticsKeys.all, 'scenarios'] as const,
    comparative: (params: { entityType: string; entityId: string; scenarioType: string; changeRate: number }) =>
      [...analyticsKeys.scenarios.all(), 'comparative', params] as const,
  },
  snapshots: (params?: { entityType?: string; entityId?: string; page?: number }) =>
    [...analyticsKeys.all, 'snapshots', params] as const,
  insights: (params?: { entityType?: string; severity?: string; page?: number }) =>
    [...analyticsKeys.all, 'insights', params] as const,
  models: (active?: boolean) => [...analyticsKeys.all, 'models', active] as const,
};

// ── Project Analytics ─────────────────────────────────────────────────────────

export function useProjectAnalytics(projectId: string) {
  return useQuery({
    queryKey: analyticsKeys.projectAnalytics(projectId),
    queryFn: () => analyticsApi.getProjectAnalytics(projectId),
    staleTime: 60_000,
    enabled: !!projectId,
  });
}

// ── Aggregated Metrics ────────────────────────────────────────────────────────

export function useAggregatedMetrics(params: {
  entityType: string;
  entityId: string;
  state?: string;
  sector?: string;
  districtId?: string;
}) {
  return useQuery({
    queryKey: analyticsKeys.aggregated(params),
    queryFn: () => analyticsApi.getAggregatedMetrics(params),
    staleTime: 60_000,
    enabled: !!params.entityType && !!params.entityId,
  });
}

// ── Benchmarks ────────────────────────────────────────────────────────────────

export function useBenchmark(metricType: string, peerCriteria?: Record<string, unknown>) {
  return useQuery({
    queryKey: analyticsKeys.benchmark(metricType),
    queryFn: () => analyticsApi.getBenchmarkDistribution(metricType, peerCriteria),
    staleTime: 120_000,
    enabled: !!metricType,
  });
}

export function useProjectBenchmark(projectId: string, metricType: string) {
  return useQuery({
    queryKey: analyticsKeys.projectBenchmark(projectId, metricType),
    queryFn: () => analyticsApi.getProjectBenchmark(projectId, metricType),
    staleTime: 120_000,
    enabled: !!projectId && !!metricType,
  });
}

// ── Cross-Project Patterns ───────────────────────────────────────────────────

export function useCrossProjectPatterns(params?: {
  sector?: string;
  state?: string;
  districtId?: string;
}) {
  return useQuery({
    queryKey: analyticsKeys.patterns(params),
    queryFn: () => analyticsApi.getCrossProjectPatterns(params),
    staleTime: 120_000,
  });
}

// ── Hotspots ─────────────────────────────────────────────────────────────────

export function useHotspots(params?: {
  minRiskScore?: number;
  minFindings?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: analyticsKeys.hotspots(params),
    queryFn: () => analyticsApi.getHotspots(params),
    staleTime: 120_000,
  });
}

// ── Forecasting ───────────────────────────────────────────────────────────────

export function useDelayForecast(projectId: string, horizonDays?: number) {
  return useQuery({
    queryKey: analyticsKeys.forecast.delay(projectId, horizonDays),
    queryFn: () => analyticsApi.getDelayForecast(projectId, horizonDays),
    staleTime: 60_000,
    enabled: !!projectId,
  });
}

export function useCostForecast(projectId: string) {
  return useQuery({
    queryKey: analyticsKeys.forecast.cost(projectId),
    queryFn: () => analyticsApi.getCostForecast(projectId),
    staleTime: 60_000,
    enabled: !!projectId,
  });
}

export function useRiskForecast(projectId: string) {
  return useQuery({
    queryKey: analyticsKeys.forecast.risk(projectId),
    queryFn: () => analyticsApi.getRiskForecast(projectId),
    staleTime: 60_000,
    enabled: !!projectId,
  });
}

// ── Scenarios ────────────────────────────────────────────────────────────────

export function useRunScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      params,
    }: {
      projectId: string;
      params: {
        scenarioType: string;
        baselineValue: number;
        changeRate?: number;
        horizonDays?: number;
      };
    }) => analyticsApi.runScenario(projectId, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.project(variables.projectId) });
    },
  });
}

export function useComparativeScenarios(params: {
  entityType: string;
  entityId: string;
  scenarioType: string;
  changeRate: number;
}) {
  return useQuery({
    queryKey: analyticsKeys.scenarios.comparative(params),
    queryFn: () => analyticsApi.getComparativeScenarios(params),
    staleTime: 120_000,
    enabled:
      !!params.entityType &&
      !!params.entityId &&
      !!params.scenarioType &&
      params.changeRate !== undefined,
  });
}

// ── Snapshots ────────────────────────────────────────────────────────────────

export function useAnalyticsSnapshots(params?: {
  entityType?: string;
  entityId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: analyticsKeys.snapshots(params),
    queryFn: () => analyticsApi.getSnapshots(params),
    staleTime: 60_000,
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { entityType: string; entityId: string; metrics: unknown }) =>
      analyticsApi.createSnapshot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.snapshots() });
    },
  });
}

// ── Insights ─────────────────────────────────────────────────────────────────

export function useAnalyticsInsights(params?: {
  entityType?: string;
  entityId?: string;
  severity?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: analyticsKeys.insights(params),
    queryFn: () => analyticsApi.getInsights(params),
    staleTime: 60_000,
  });
}

// ── Model Versions ───────────────────────────────────────────────────────────

export function useModelVersions(active?: boolean) {
  return useQuery({
    queryKey: analyticsKeys.models(active),
    queryFn: () => analyticsApi.getModelVersions(active),
    staleTime: 300_000, // 5 min — model versions rarely change
  });
}
