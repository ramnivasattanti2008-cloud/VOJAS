import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { qk } from "./query-keys";
import type { Vendor, PaginatedVendors } from "@/types";

export interface VendorFilters {
  state?: string;
  search?: string;
  minPaid?: number;
  page?: number;
  limit?: number;
  sortBy?: "totalPaid" | "projectCount" | "constituencyCount" | "name";
  sortDir?: "asc" | "desc";
}

export const vendorApi = {
  list: (filters: VendorFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.state) params.set("state", filters.state);
    if (filters.search) params.set("search", filters.search);
    if (filters.minPaid) params.set("minPaid", String(filters.minPaid));
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.sortDir) params.set("sortDir", filters.sortDir);
    params.set("page", String(filters.page ?? 1));
    params.set("limit", String(filters.limit ?? 20));
    return api.get<PaginatedVendors>(`/vendors?${params.toString()}`);
  },
  get: (id: string) =>
    api.get<{ vendor: Vendor & { stats: Record<string, unknown> } }>(`/vendors/${id}`),
  top: (limit = 20) =>
    api.get<{ items: Vendor[] }>(`/vendors/top?limit=${limit}`),
  remove: (id: string) => api.delete<{ id: string }>(`/vendors/${id}`),
};

export function useVendors(filters: VendorFilters = {}) {
  return useQuery({
    queryKey: qk.vendors(filters),
    queryFn: () => vendorApi.list(filters),
    staleTime: 30_000,
  });
}

export function useVendor(id: string | undefined) {
  return useQuery({
    queryKey: qk.vendor(id ?? ""),
    queryFn: () => vendorApi.get(id!),
    enabled: !!id,
  });
}

export function useTopVendors(limit = 20) {
  return useQuery({
    queryKey: qk.topVendors(limit),
    queryFn: () => vendorApi.top(limit),
    staleTime: 60_000,
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: vendorApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendors"] }),
  });
}
