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

export const inspectionsApi = {
  async list(params: Record<string, unknown> = {}): Promise<any> {
    return api.get<any>(`/inspections${buildParams(params)}`);
  },
  async get(id: string): Promise<any> {
    return api.get<any>(`/inspections/${id}`);
  },
  async create(data: Record<string, unknown>): Promise<any> {
    return api.post<any>("/inspections", data);
  },
  async assign(id: string, inspectorId: string, scheduledDate: string): Promise<any> {
    return api.put<any>(`/inspections/${id}/assign`, { inspectorId, scheduledDate });
  },
  async complete(id: string, data: Record<string, unknown>): Promise<any> {
    return api.put<any>(`/inspections/${id}/complete`, data);
  },
  async my(): Promise<any> {
    return api.get<any>("/inspections/my");
  },
  async stats(): Promise<any> {
    return api.get<any>("/inspections/stats");
  },
};
