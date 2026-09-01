import { api } from "./api";

function buildParams(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      searchParams.set(key, String(val));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : "";
}

export const dataQualityApi = {
  async issues(params: Record<string, unknown> = {}): Promise<any> {
    return api.get<any>(`/data-quality${buildParams(params)}`);
  },
  async issue(id: string): Promise<any> {
    return api.get<any>(`/data-quality/${id}`);
  },
  async scan(entityType?: string): Promise<any> {
    return api.post<any>("/data-quality/scan", { entityType });
  },
  async resolve(id: string, note?: string): Promise<any> {
    return api.put<any>(`/data-quality/${id}/resolve`, { note });
  },
  async dismiss(id: string, reason: string): Promise<any> {
    return api.put<any>(`/data-quality/${id}/dismiss`, { reason });
  },
  async stats(): Promise<any> {
    return api.get<any>("/data-quality/stats");
  },
};
