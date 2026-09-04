'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createChangeAnalysisApi,
  type ChangeAnalysis,
  type ChangeAnalysisJob,
  type ProcessingStatus,
  type SignalType,
} from '@vojas/api-client';
import { apiClient } from '@/lib/api';

const caApi = createChangeAnalysisApi(apiClient);

export function useChangeAnalyses(projectId: string | null | undefined, options?: {
  status?: ProcessingStatus;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['projects', projectId, 'changeAnalysis', 'list', options],
    queryFn: () => caApi.list(projectId!, options),
    enabled: !!projectId,
  });
}

export function useChangeAnalysisLatest(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'changeAnalysis', 'latest'],
    queryFn: () => caApi.latest(projectId!),
    enabled: !!projectId,
  });
}

export function useChangeAnalysis(
  projectId: string | null | undefined,
  analysisId: string | null | undefined
) {
  return useQuery({
    queryKey: ['projects', projectId, 'changeAnalysis', analysisId],
    queryFn: () => caApi.get(projectId!, analysisId!),
    enabled: !!projectId && !!analysisId,
  });
}

export function useChangeAnalysisMethodology(
  projectId: string | null | undefined,
  analysisId: string | null | undefined
) {
  return useQuery({
    queryKey: ['projects', projectId, 'changeAnalysis', analysisId, 'methodology'],
    queryFn: () => caApi.getMethodology(projectId!, analysisId!),
    enabled: !!projectId && !!analysisId,
  });
}

export function useChangeAnalysisEvidence(
  projectId: string | null | undefined,
  analysisId: string | null | undefined
) {
  return useQuery({
    queryKey: ['projects', projectId, 'changeAnalysis', analysisId, 'evidence'],
    queryFn: () => caApi.getEvidence(projectId!, analysisId!),
    enabled: !!projectId && !!analysisId,
  });
}

export function useChangeAnalysisMap(
  projectId: string | null | undefined,
  analysisId: string | null | undefined
) {
  return useQuery({
    queryKey: ['projects', projectId, 'changeAnalysis', analysisId, 'map'],
    queryFn: () => caApi.getMap(projectId!, analysisId!),
    enabled: !!projectId && !!analysisId,
  });
}

export function useChangeAnalysisHistory(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'changeAnalysis', 'history'],
    queryFn: () => caApi.getHistory(projectId!),
    enabled: !!projectId,
  });
}

/** Poll job status while it is QUEUED or PROCESSING. */
export function useChangeAnalysisJob(
  projectId: string | null | undefined,
  analysisId: string | null | undefined
) {
  return useQuery<ChangeAnalysisJob, Error>({
    queryKey: ['projects', projectId, 'changeAnalysis', analysisId, 'job'],
    queryFn: () => caApi.getJob(projectId!, analysisId!),
    enabled: !!projectId && !!analysisId,
    refetchInterval: (q) => {
      const s = q.state.data;
      return s && s.status !== 'COMPLETED' && s.status !== 'FAILED'
        ? 3000
        : false;
    },
  });
}

export interface RunAnalysisParams {
  observationBeforeId: string;
  observationAfterId: string;
  sector?: string;
  primarySignal?: SignalType;
}

export function useRunChangeAnalysis(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation<{ status: ProcessingStatus; jobId: string; message: string }, Error, RunAnalysisParams>({
    mutationFn: (params) => caApi.run(projectId!, params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'changeAnalysis'] });
    },
  });
}
