'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createReportApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';

const reportApi = createReportApi(apiClient);

export function useReports(params?: {
  status?: string;
  category?: string;
  severity?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: () => reportApi.list(params),
  });
}

export function useReport(id: string | null | undefined) {
  return useQuery({
    queryKey: ['reports', id],
    queryFn: () => reportApi.get(id!),
    enabled: !!id,
  });
}

export function useSubmitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reportApi.submit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useAssignReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) =>
      reportApi.assign(id, assignedToId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      reportApi.resolve(id, resolution),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
