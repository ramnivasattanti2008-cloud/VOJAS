import type { ApiClient } from './client.js';
import type { Anomaly, AnomalyStats, PaginatedResponse } from './types.js';

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
      return client.get<PaginatedResponse<Anomaly>>('/anomalies', params);
    },
    stats() {
      return client.get<AnomalyStats>('/anomalies/stats');
    },
    get(id: string) {
      return client.get<Anomaly>(`/anomalies/${id}`);
    },
    create(payload: {
      title: string;
      description: string;
      category: string;
      severity?: string;
      projectId?: string;
      ruleCode?: string;
    }) {
      return client.post<Anomaly>('/anomalies', payload);
    },
    acknowledge(id: string) {
      return client.post<Anomaly>(`/anomalies/${id}/acknowledge`);
    },
    resolve(id: string, resolution: string) {
      return client.post<Anomaly>(`/anomalies/${id}/resolve`, { resolution });
    },
    escalate(id: string, authority?: string, notes?: string) {
      return client.post<Anomaly>(`/anomalies/${id}/escalate`, { authority, notes });
    },
  };
}
