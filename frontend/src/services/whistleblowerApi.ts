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

export const whistleblowerApi = {
  async submit(data: Record<string, unknown>): Promise<any> {
    return api.post<any>("/whistleblower", data);
  },
  async list(params: Record<string, unknown> = {}): Promise<any> {
    return api.get<any>(`/whistleblower${buildParams(params)}`);
  },
  async get(id: string): Promise<any> {
    return api.get<any>(`/whistleblower/${id}`);
  },
  async review(id: string, action: string, note?: string): Promise<any> {
    return api.put<any>(`/whistleblower/${id}/review`, { action, note });
  },
  async stats(): Promise<any> {
    return api.get<any>("/whistleblower/stats");
  },
};
