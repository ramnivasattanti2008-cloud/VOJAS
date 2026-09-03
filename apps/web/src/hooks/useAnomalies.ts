'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createAnomalyApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';

const anomalyApi = createAnomalyApi(apiClient);

export function useAnomalies(params?: {
  status?: string;
  severity?: string;
  category?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['anomalies', params],
    queryFn: () => anomalyApi.list(params),
  });
}

export function useAnomaly(id: string | null | undefined) {
  return useQuery({
    queryKey: ['anomalies', id],
    queryFn: () => anomalyApi.get(id!),
    enabled: !!id,
  });
}

export function useAnomalyStats() {
  return useQuery({
    queryKey: ['anomalies', 'stats'],
    queryFn: () => anomalyApi.stats(),
  });
}

export function useCreateAnomaly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: anomalyApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anomalies'] });
    },
  });
}

export function useAcknowledgeAnomaly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => anomalyApi.acknowledge(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anomalies'] });
    },
  });
}

export function useResolveAnomaly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      anomalyApi.resolve(id, resolution),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anomalies'] });
    },
  });
}

export function useEscalateAnomaly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, authority, notes }: { id: string; authority?: string; notes?: string }) =>
      anomalyApi.escalate(id, authority, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anomalies'] });
    },
  });
}
