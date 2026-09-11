import type { ApiClient } from './client.js';
import type { Vendor, PaginatedResponse } from './types.js';

export function createVendorApi(client: ApiClient) {
  return {
    list(params?: { search?: string; state?: string; status?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<Vendor>>('/vendors', params);
    },
    get(id: string) {
      return client.get<Vendor>(`/vendors/${id}`);
    },
    create(payload: {
      name: string;
      udyamRegNo?: string;
      pan?: string;
      gstin?: string;
      district?: string;
      state?: string;
      contactEmail?: string;
      contactPhone?: string;
    }) {
      return client.post<Vendor>('/vendors', payload);
    },
  };
}
