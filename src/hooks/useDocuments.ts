'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createDocumentApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import type { UploadDocumentPayload } from '@vojas/api-client';

const documentApi = createDocumentApi(apiClient);

export function useDocuments(params?: { projectId?: string; type?: string; status?: string; page?: number; limit?: number }) {
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

export function useDocumentsByProject(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['documents', 'by-project', projectId],
    queryFn: () => documentApi.listByProject(projectId!),
    enabled: !!projectId,
  });
}

export function useDocumentExtraction(id: string | null | undefined) {
  return useQuery({
    queryKey: ['documents', id, 'extraction'],
    queryFn: () => documentApi.getExtraction(id!),
    enabled: !!id,
  });
}

export function useDocumentCrossCheck(id: string | null | undefined) {
  return useQuery({
    queryKey: ['documents', id, 'cross-check'],
    queryFn: () => documentApi.crossCheck(id!),
    enabled: !!id,
  });
}

export function useDocumentSearch(query: string, projectId?: string) {
  return useQuery({
    queryKey: ['documents', 'search', query, projectId],
    queryFn: () => documentApi.search(query, projectId),
    enabled: query.length >= 2,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UploadDocumentPayload) => documentApi.upload(payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['documents', 'by-project', vars.projectId] });
    },
  });
}

export function useReprocessDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentApi.reprocess(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useVerifyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, verificationNote }: { id: string; status: 'VERIFIED' | 'REJECTED' | 'REQUIRES_INFO'; verificationNote?: string }) =>
      documentApi.verify(id, { status, verificationNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
