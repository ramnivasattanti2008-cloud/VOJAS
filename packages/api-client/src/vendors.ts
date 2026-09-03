import type { ApiClient } from './client';
import type { Vendor, PaginatedResponse } from './types';

export function createVendorApi(client: ApiClient) {
  return {
    list(params?: { search?: string; state?: string; status?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<Vendor>>('/api/v1/vendors', params);
    },
    get(id: string) {
      return client.get<Vendor>(`/api/v1/vendors/${id}`);
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
      return client.post<Vendor>('/api/v1/vendors', payload);
    },
  };
}
