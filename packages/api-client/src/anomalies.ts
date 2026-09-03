import type { ApiClient } from './client';
import type { Anomaly, AnomalyStats, PaginatedResponse } from './types';

export function createAnomalyApi(client: ApiClient) {
  return {
    list(params?: {
      status?: string;
      severity?: string;
      category?: string;
      projectId?: string;
      page?: number;
      limit?: number;
    }) {
      return client.get<PaginatedResponse<Anomaly>>('/api/v1/anomalies', params);
    },
    stats() {
      return client.get<AnomalyStats>('/api/v1/anomalies/stats');
    },
    get(id: string) {
      return client.get<Anomaly>(`/api/v1/anomalies/${id}`);
    },
    create(payload: {
      title: string;
      description: string;
      category: string;
      severity?: string;
      projectId?: string;
      ruleCode?: string;
    }) {
      return client.post<Anomaly>('/api/v1/anomalies', payload);
    },
    acknowledge(id: string) {
      return client.post<Anomaly>(`/api/v1/anomalies/${id}/acknowledge`);
    },
    resolve(id: string, resolution: string) {
      return client.post<Anomaly>(`/api/v1/anomalies/${id}/resolve`, { resolution });
    },
    escalate(id: string, authority?: string, notes?: string) {
      return client.post<Anomaly>(`/api/v1/anomalies/${id}/escalate`, { authority, notes });
    },
  };
}
