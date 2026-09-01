import { api } from "./api";

export const dataSourcesApi = {
  async list(): Promise<any> {
    return api.get<any>("/data-sources");
  },
  async get(id: string): Promise<any> {
    return api.get<any>(`/data-sources/${id}`);
  },
  async create(data: Record<string, unknown>): Promise<any> {
    return api.post<any>("/data-sources", data);
  },
  async update(id: string, data: Record<string, unknown>): Promise<any> {
    return api.put<any>(`/data-sources/${id}`, data);
  },
  async remove(id: string): Promise<any> {
    return api.delete<any>(`/data-sources/${id}`);
  },
  async freshness(id: string): Promise<any> {
    return api.get<any>(`/data-sources/${id}/freshness`);
  },
  async sync(id: string): Promise<any> {
    return api.post<any>(`/data-sources/${id}/sync`, {});
  },
  async stats(): Promise<any> {
    return api.get<any>("/data-sources/stats");
  },
};
