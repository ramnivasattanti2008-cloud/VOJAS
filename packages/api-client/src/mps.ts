import type { ApiClient } from './client.js';
import type { MP, PaginatedResponse } from './types.js';
import type { Project } from './projects.js';

export function createMpApi(client: ApiClient) {
  return {
    list(params?: {
      search?: string;
      state?: string;
      house?: string;
      page?: number;
      limit?: number;
    }) {
      return client.get<PaginatedResponse<MP & { _count?: { projects: number } }>>('/mps', params);
    },
    get(id: string) {
      return client.get<MP & { _count: { projects: number }; projects: Project[] }>(`/mps/${id}`);
    },
    getProjects(id: string, params?: { page?: number; limit?: number }) {
      return client.get<PaginatedResponse<Project>>(`/mps/${id}/projects`, params);
    },
  };
}

export type MpApi = ReturnType<typeof createMpApi>;
