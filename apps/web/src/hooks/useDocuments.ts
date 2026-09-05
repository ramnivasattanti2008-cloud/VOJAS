'use client';

import { useQuery } from '@tanstack/react-query';
import { createDocumentApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';

const documentApi = createDocumentApi(apiClient);

export function useDocuments(params?: { projectId?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: () => documentApi.list(params),
  });
}

export function useDocument(id: string | null | undefined) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentApi.get(id!),
    enabled: !!id,
  });
}
