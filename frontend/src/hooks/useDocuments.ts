import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentApi, type UploadDocumentPayload } from "@/services/document-api";
import type {
  DocumentListResult,
  DocumentStats,
  ProjectDocument,
  DocumentFilters,
} from "@/types/document-types";
import { qk } from "./query-keys";

export function useDocuments(projectId: string, filters: Partial<DocumentFilters> = {}) {
  return useQuery<DocumentListResult>({
    queryKey: qk.documents(projectId, filters),
    queryFn: () => documentApi.getProjectDocuments(projectId, filters),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useDocumentStats(projectId: string) {
  return useQuery<DocumentStats>({
    queryKey: qk.documentStats(projectId),
    queryFn: () => documentApi.stats(projectId),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useUploadDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation<{ document: ProjectDocument }, Error, UploadDocumentPayload>({
    mutationFn: (payload) => documentApi.upload(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", "list", projectId] });
      qc.invalidateQueries({ queryKey: qk.documentStats(projectId) });
    },
  });
}

export function useVerifyDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation<
    { document: ProjectDocument },
    Error,
    { id: string; status: string; note?: string }
  >({
    mutationFn: ({ id, status, note }) => documentApi.verify(id, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", "list", projectId] });
      qc.invalidateQueries({ queryKey: qk.documentStats(projectId) });
    },
  });
}

export function useDeleteDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => documentApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", "list", projectId] });
      qc.invalidateQueries({ queryKey: qk.documentStats(projectId) });
    },
  });
}

export function useAnalyzeDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => documentApi.analyze(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", "list", projectId] });
    },
  });
}
