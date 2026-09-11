import type { ApiClient } from './client.js';
import type {
    CitizenClaim,
    CitizenReport,
    ModerationAction,
    PaginatedResponse,
    ReportMedia,
    ReportPrivacyLevel,
} from './types.js';

export interface SubmitReportPayload {
  title: string;
  description: string;
  category: string;
  privacyLevel: ReportPrivacyLevel;
  locationDesc?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracyM?: number;
  incidentDate?: string;
  projectId?: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  isAnonymous: boolean;
}

export interface UpdateReportPayload {
  status?: string;
  assignedToId?: string;
  resolution?: string;
  projectId?: string;
}

export interface ReportFilters {
  status?: string;
  category?: string;
  severity?: string;
  triageStatus?: string;
  projectId?: string;
  assignedToId?: string;
  page?: number;
  limit?: number;
}

export interface NearbyReportsParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
}

export function createCitizenReportsApi(client: ApiClient) {
  return {
    // Public: Submit a new citizen report
    submit(payload: SubmitReportPayload) {
      return client.post<CitizenReport>('/reports', payload);
    },

    // Public: Track report by reference
    track(reportReference: string) {
      return client.get<CitizenReport>(`/reports/track/${reportReference}`);
    },

    // Public: Track report status by reference
    trackStatus(reportReference: string) {
      return client.get<{ status: string; triageStatus: string; updatedAt: string }>(
        `/reports/track/${reportReference}/status`
      );
    },

    // Public: Add follow-up note or update to tracked report
    updateByReference(reportReference: string, note: string, newStatus?: string) {
      return client.post<{ success: boolean; report: CitizenReport }>(
        `/reports/track/${reportReference}/update`,
        { note, newStatus }
      );
    },

    // Auth: List all reports with filters
    list(params?: ReportFilters) {
      return client.get<PaginatedResponse<CitizenReport>>('/reports', params as Record<string, string | number | undefined>);
    },

    // Auth: Get single report
    get(id: string) {
      return client.get<CitizenReport>(`/reports/${id}`);
    },

    // Auth: Get report evidence (media + claims)
    getEvidence(id: string) {
      return client.get<{ media: ReportMedia[]; claims: CitizenClaim[] }>(`/reports/${id}/evidence`);
    },

    // Auth: Get reports by project
    getByProject(projectId: string) {
      return client.get<CitizenReport[]>(`/reports/by-project/${projectId}`);
    },

    // Auth: Upload media to a report
    uploadMedia(reportId: string, formData: FormData) {
      return client.post<ReportMedia>(`/reports/${reportId}/media`, formData as unknown as Record<string, unknown>);
    },

    // Auth: Run AI triage on a report
    runTriage(id: string) {
      return client.post<CitizenReport>(`/reports/${id}/triage`);
    },

    // Auth: Update report
    update(id: string, payload: UpdateReportPayload) {
      return client.patch<CitizenReport>(`/reports/${id}`, payload);
    },

    // Auth: Moderate a report
    moderate(id: string, action: ModerationAction, reason: string) {
      return client.post<CitizenReport>(`/reports/${id}/moderate`, { action, reason });
    },

    // Public: List public reports with optional filters
    listPublic(params?: { lat?: number; lng?: number; radiusKm?: number; limit?: number }) {
      return client.get<CitizenReport[]>('/reports/public', params as Record<string, string | number | undefined>);
    },

    // Public: List nearby reports
    listNearby(lat: number, lng: number, radiusKm?: number) {
      return client.get<CitizenReport[]>(`/reports/nearby`, {
        lat,
        lng,
        radiusKm,
      });
    },
  };
}

export type CitizenReportsApi = ReturnType<typeof createCitizenReportsApi>;
