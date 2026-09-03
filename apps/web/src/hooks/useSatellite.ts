'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSatelliteApi, type SatelliteStatus, type TimelineEntry, type SatelliteObservation, type SatelliteAnalysis, type ProgressComparison, type SyncResult, type SatelliteJob } from '@vojas/api-client';
import { apiClient } from '@/lib/api';

const satApi = createSatelliteApi(apiClient);

export function useSatelliteStatus(projectId: string | null | undefined) {
  return useQuery<SatelliteStatus, Error>({
    queryKey: ['projects', projectId, 'satellite', 'status'],
    queryFn: () => satApi.getStatus(projectId!),
    enabled: !!projectId,
    refetchInterval: (q) => {
      const s = q.state.data;
      return s?.processingStatus === 'PROCESSING' ? 5000 : false;
    },
  });
}

export function useSatelliteTimeline(projectId: string | null | undefined) {
  return useQuery<{ entries: TimelineEntry[] }, Error>({
    queryKey: ['projects', projectId, 'satellite', 'timeline'],
    queryFn: () => satApi.getTimeline(projectId!),
    enabled: !!projectId,
  });
}

export function useSatelliteObservations(projectId: string | null | undefined, limit = 50) {
  return useQuery<{ observations: SatelliteObservation[] }, Error>({
    queryKey: ['projects', projectId, 'satellite', 'observations', limit],
    queryFn: () => satApi.getObservations(projectId!, limit),
    enabled: !!projectId,
  });
}

export function useSatelliteBaseline(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'satellite', 'baseline'],
    queryFn: () => satApi.getBaseline(projectId!),
    enabled: !!projectId,
  });
}

export function useSatelliteChange(projectId: string | null | undefined) {
  return useQuery<{ comparisons: SatelliteAnalysis[] }, Error>({
    queryKey: ['projects', projectId, 'satellite', 'change'],
    queryFn: () => satApi.getChange(projectId!),
    enabled: !!projectId,
  });
}

export function useProgressComparison(projectId: string | null | undefined) {
  return useQuery<ProgressComparison, Error>({
    queryKey: ['projects', projectId, 'satellite', 'comparison'],
    queryFn: () => satApi.getComparison(projectId!),
    enabled: !!projectId,
  });
}

export function useTriggerSatelliteSync(projectId: string) {
  const qc = useQueryClient();
  return useMutation<SyncResult, Error>({
    mutationFn: () => satApi.triggerSync(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'satellite'] });
    },
  });
}

export function useSatelliteJob(projectId: string, jobId: string | null) {
  return useQuery<SatelliteJob, Error>({
    queryKey: ['projects', projectId, 'satellite', 'job', jobId],
    queryFn: () => satApi.getJob(projectId, jobId!),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const s = q.state.data;
      return s && s.status !== 'COMPLETED' && s.status !== 'FAILED' ? 3000 : false;
    },
  });
}
