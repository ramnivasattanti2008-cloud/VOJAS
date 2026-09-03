import type { ApiClient } from './client';
import type { Report, PaginatedResponse } from './types';

export function createReportApi(client: ApiClient) {
  return {
    list(params?: {
      status?: string;
      category?: string;
      severity?: string;
      projectId?: string;
      page?: number;
      limit?: number;
    }) {
      return client.get<PaginatedResponse<Report>>('/api/v1/reports', params);
    },
    get(id: string) {
      return client.get<Report>(`/api/v1/reports/${id}`);
    },
    submit(payload: {
      title: string;
      description: string;
      category: string;
      severity?: string;
      locationDesc?: string;
      latitude?: number;
      longitude?: number;
      projectId?: string;
      reporterName?: string;
      reporterEmail?: string;
      reporterPhone?: string;
      isAnonymous?: boolean;
    }) {
      return client.post<Report>('/api/v1/reports', payload);
    },
    assign(id: string, assignedToId: string) {
      return client.post<Report>(`/api/v1/reports/${id}/assign`, { assignedToId });
    },
    resolve(id: string, resolution: string) {
      return client.post<Report>(`/api/v1/reports/${id}/resolve`, { resolution });
    },
  };
}
