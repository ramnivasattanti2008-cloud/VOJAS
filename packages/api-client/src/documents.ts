import type { ApiClient } from './client';
import type { Document, PaginatedResponse } from './types';

export function createDocumentApi(client: ApiClient) {
  return {
    list(params?: { projectId?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<Document>>('/documents', params);
    },
    get(id: string) {
      return client.get<Document>(`/documents/${id}`);
    },
  };
}

export type DocumentApi = ReturnType<typeof createDocumentApi>;
