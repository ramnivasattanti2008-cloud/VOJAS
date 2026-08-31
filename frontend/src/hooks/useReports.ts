import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  reportApi,
  type SubmitReportPayload,
  type ReportFilters,
  type TransitionPayload,
} from "@/services/report-api";
import type { Report, ReportStats, ReportAttachment } from "@/types/report-types";
import { qk } from "./query-keys";

// ── Queries ──────────────────────────────────────────────────────────────────

export function useReports(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: qk.reports(filters),
    queryFn: () => reportApi.list(filters),
    staleTime: 30_000,
  });
}

export function useReportStats() {
  return useQuery<{ stats: ReportStats }>({
    queryKey: qk.reportStats(),
    queryFn: () => reportApi.stats(),
    staleTime: 60_000,
  });
}

export function useReport(id: string | undefined) {
  return useQuery<{ report: Report }>({
    queryKey: qk.report(id ?? ""),
    queryFn: () => reportApi.get(id!),
    enabled: !!id,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export interface SubmitReportResult {
  report: Partial<Report>;
  aiAnalysis?: {
    keywords: string[];
    corruptionIndicators: string[];
    sentiment: string;
    suggestedSeverity: string;
    confidence: number;
    summary: string;
  };
  message: string;
}

export function useSubmitReport() {
  return useMutation<SubmitReportResult, Error, SubmitReportPayload>({
    mutationFn: (payload) => reportApi.submit(payload),
  });
}

export function useUpdateReport(id: string) {
  const qc = useQueryClient();
  return useMutation<{ report: Report }, Error, Partial<SubmitReportPayload>>({
    mutationFn: (data) => reportApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: qk.report(id) });
    },
  });
}

export function useTransitionReport() {
  const qc = useQueryClient();
  return useMutation<{ report: Report }, Error, { id: string; payload: TransitionPayload }>({
    mutationFn: ({ id, payload }) => reportApi.transition(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: qk.report(id) });
    },
  });
}

export function useAssignReport() {
  const qc = useQueryClient();
  return useMutation<{ report: Report }, Error, { id: string; assignedToId: string }>({
    mutationFn: ({ id, assignedToId }) => reportApi.assign(id, assignedToId),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: qk.report(id) });
    },
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation<{ message: string }, Error, string>({
    mutationFn: (id) => reportApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useUploadReportAttachment(reportId: string) {
  const qc = useQueryClient();
  return useMutation<{ attachment: ReportAttachment }, Error, File>({
    mutationFn: (file) => reportApi.uploadAttachment(reportId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.report(reportId) });
    },
  });
}

export function useRemoveReportAttachment(reportId: string) {
  const qc = useQueryClient();
  return useMutation<{ message: string }, Error, string>({
    mutationFn: (attachmentId) => reportApi.removeAttachment(reportId, attachmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.report(reportId) });
    },
  });
}
