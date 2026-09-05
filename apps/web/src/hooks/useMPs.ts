'use client';

import { useQuery } from '@tanstack/react-query';
import { createMpApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';

const mpApi = createMpApi(apiClient);

export function useMPs(params?: {
  search?: string;
  state?: string;
  house?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['mps', params],
    queryFn: () => mpApi.list(params),
  });
}

export function useMP(id: string | null | undefined) {
  return useQuery({
    queryKey: ['mps', id],
    queryFn: () => mpApi.get(id!),
    enabled: !!id,
  });
}

export function useMPProjects(mpId: string | null | undefined, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['mps', mpId, 'projects', params],
    queryFn: () => mpApi.getProjects(mpId!, params),
    enabled: !!mpId,
  });
}
