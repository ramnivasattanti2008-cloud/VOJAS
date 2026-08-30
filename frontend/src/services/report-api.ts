import { api, ApiError } from "./api";
import type {
  Report,
  PaginatedReports,
  ReportStats,
  ReportAttachment,
} from "@/types/report-types";

export interface SubmitReportPayload {
  title: string;
  description: string;
  category: string;
  severity?: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  isAnonymous?: boolean;
  locationDesc?: string;
  latitude?: number;
  longitude?: number;
  projectId?: string;
}

export interface ReportFilters {
  status?: string;
  category?: string;
  severity?: string;
  projectId?: string;
  assignedToId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface TransitionPayload {
  toStatus: string;
  notes?: string;
  resolution?: string;
}

export const reportApi = {
  // Public — no auth needed
  submit: (payload: SubmitReportPayload) =>
    api.post<{
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
    }>(
      "/reports/submit",
      payload
    ),

  // Auth required
  list: (filters?: ReportFilters) =>
    api.get<PaginatedReports>(
      `/reports${buildQuery(filters)}`
    ),

  stats: () =>
    api.get<{ stats: ReportStats }>("/reports/stats"),

  get: (id: string) =>
    api.get<{ report: Report }>(`/reports/${id}`),

  /**
   * Audit-only: fetch the original (un-redacted) report.
   * Requires an investigation context string that will be recorded in AuditLog.
   * Caller must be ADMIN or REVIEWER.
   */
  getOriginal: (id: string, investigationContext: string) =>
    api.get<{ report: Report; _warning: string }>(
      `/reports/${id}/original`,
      { "X-Investigation-Context": investigationContext }
    ),

  update: (id: string, data: Partial<SubmitReportPayload>) =>
    api.put<{ report: Report }>(`/reports/${id}`, data),

  transition: (id: string, payload: TransitionPayload) =>
    api.post<{ report: Report }>(`/reports/${id}/transition`, payload),

  assign: (id: string, assignedToId: string) =>
    api.post<{ report: Report }>(`/reports/${id}/assign`, { assignedToId }),

  remove: (id: string) =>
    api.delete<{ message: string }>(`/reports/${id}`),

  /** Upload a file attachment to a report. Public — no auth needed. */
  uploadAttachment: (reportId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.postForm<{ attachment: ReportAttachment }>(
      `/reports/${reportId}/attachments`,
      formData
    );
  },

  /** Delete an attachment. Auth required. */
  removeAttachment: (reportId: string, attachmentId: string) =>
    api.delete<{ message: string }>(
      `/reports/${reportId}/attachments/${attachmentId}`
    ),
};

function buildQuery(filters?: ReportFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      params.set(k, String(v));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export { ApiError };
