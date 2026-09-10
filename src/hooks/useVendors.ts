'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createVendorApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';

const vendorApi = createVendorApi(apiClient);

export function useVendors(params?: { search?: string; state?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['vendors', params],
    queryFn: () => vendorApi.list(params),
  });
}

export function useVendor(id: string | null | undefined) {
  return useQuery({
    queryKey: ['vendors', id],
    queryFn: () => vendorApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: vendorApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}
