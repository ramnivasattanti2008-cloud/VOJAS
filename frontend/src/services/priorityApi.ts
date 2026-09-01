import { api } from "./api";

export const priorityApi = {
  async top(limit = 20): Promise<any> {
    return api.get<any>(`/priority/top?limit=${limit}`);
  },
  async byDistrict(district: string): Promise<any> {
    return api.get<any>(`/priority/district/${encodeURIComponent(district)}`);
  },
  async byArea(state: string, district?: string): Promise<any> {
    return api.get<any>(`/priority/area?state=${encodeURIComponent(state)}${district ? `&district=${encodeURIComponent(district)}` : ""}`);
  },
  async compute(data: Record<string, unknown>): Promise<any> {
    return api.post<any>("/priority/compute", data);
  },
  async recomputeAll(): Promise<any> {
    return api.post<any>("/priority/recompute-all", {});
  },
  async stats(): Promise<any> {
    return api.get<any>("/priority/stats");
  },
};
