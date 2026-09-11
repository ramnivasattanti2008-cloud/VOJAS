'use client';

import { apiClient } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
    ModerationAction,
    ReportFilters,
    SubmitReportPayload,
    UpdateReportPayload,
} from '@vojas/api-client';
import { createCitizenReportsApi } from '@vojas/api-client';

const reportsApi = createCitizenReportsApi(apiClient);

// Public hooks (no auth required)
export function useSubmitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitReportPayload) => reportsApi.submit(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen-reports'] });
    },
  });
}

export function useTrackReport(reportReference: string | null) {
  return useQuery({
    queryKey: ['citizen-reports', 'track', reportReference],
    queryFn: () => reportsApi.track(reportReference!),
    enabled: !!reportReference,
  });
}

export function useTrackReportStatus(reportReference: string | null) {
  return useQuery({
    queryKey: ['citizen-reports', 'status', reportReference],
    queryFn: () => reportsApi.trackStatus(reportReference!),
    enabled: !!reportReference,
  });
}

export function useUpdateReportByReference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportReference, note }: { reportReference: string; note: string }) =>
      reportsApi.updateByReference(reportReference, note),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['citizen-reports', 'track', vars.reportReference] });
      qc.invalidateQueries({ queryKey: ['citizen-reports', 'status', vars.reportReference] });
    },
  });
}

export function usePublicReports(params?: { lat?: number; lng?: number; radiusKm?: number; limit?: number }) {
  return useQuery({
    queryKey: ['citizen-reports', 'public', params],
    queryFn: () => reportsApi.listPublic(params),
  });
}

export function useNearbyReports(lat: number, lng: number, radiusKm?: number) {
  return useQuery({
    queryKey: ['citizen-reports', 'nearby', lat, lng, radiusKm],
    queryFn: () => reportsApi.listNearby(lat, lng, radiusKm),
    enabled: lat !== 0 && lng !== 0,
  });
}

// Authenticated hooks
export function useCitizenReports(params?: ReportFilters) {
  return useQuery({
    queryKey: ['citizen-reports', 'list', params],
    queryFn: () => reportsApi.list(params),
  });
}

export function useCitizenReport(id: string | null | undefined) {
  return useQuery({
    queryKey: ['citizen-reports', id],
    queryFn: () => reportsApi.get(id!),
    enabled: !!id,
  });
}

export function useReportEvidence(id: string | null | undefined) {
  return useQuery({
    queryKey: ['citizen-reports', id, 'evidence'],
    queryFn: () => reportsApi.getEvidence(id!),
    enabled: !!id,
  });
}

export function useReportsByProject(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['citizen-reports', 'project', projectId],
    queryFn: () => reportsApi.getByProject(projectId!),
    enabled: !!projectId,
  });
}

export function useRunReportTriage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reportsApi.runTriage(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['citizen-reports', id] });
    },
  });
}

export function useUpdateCitizenReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateReportPayload }) =>
      reportsApi.update(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['citizen-reports', id] });
      qc.invalidateQueries({ queryKey: ['citizen-reports', 'list'] });
    },
  });
}

export function useModerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: ModerationAction; reason: string }) =>
      reportsApi.moderate(id, action, reason),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['citizen-reports', id] });
      qc.invalidateQueries({ queryKey: ['citizen-reports', 'list'] });
    },
  });
}
