import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { qk } from "./query-keys";
import type { MP, PaginatedMPs } from "@/types";

export interface MPFilters {
  house?: string;
  term?: string;
  state?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const mpApi = {
  list: (filters: MPFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.house) params.set("house", filters.house);
    if (filters.term) params.set("term", filters.term);
    if (filters.state) params.set("state", filters.state);
    if (filters.search) params.set("search", filters.search);
    params.set("page", String(filters.page ?? 1));
    params.set("limit", String(filters.limit ?? 20));
    return api.get<PaginatedMPs>(`/mps?${params.toString()}`);
  },
  get: (id: string) =>
    api.get<{ mp: MP & { stats: Record<string, unknown> } }>(`/mps/${id}`).then((res: any) => res),
  getProjects: (id: string, page: number = 1) =>
    api.get<{ items: any[]; total: number; page: number; limit: number; totalPages: number }>(
      `/mps/${id}/projects?page=${page}&limit=20`
    ),
  create: (data: Partial<MP>) => api.post<{ mp: MP }>(`/mps`, data),
  update: (id: string, data: Partial<MP>) =>
    api.patch<{ mp: MP }>(`/mps/${id}`, data),
  remove: (id: string) => api.delete<{ id: string }>(`/mps/${id}`),
};

export function useMPs(filters: MPFilters = {}) {
  return useQuery({
    queryKey: qk.mps(filters),
    queryFn: () => mpApi.list(filters),
    staleTime: 30_000,
  });
}

export function useMP(id: string | undefined) {
  return useQuery({
    queryKey: qk.mp(id ?? ""),
    queryFn: () => mpApi.get(id!),
    enabled: !!id,
  });
}

export function useMPDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["mp-detail", id],
    queryFn: () => mpApi.get(id!).then((res: any) => res.mp ?? res),
    enabled: !!id,
  });
}

export function useMPStats(id: string | undefined) {
  return useQuery({
    queryKey: ["mp-stats", id],
    queryFn: () =>
      mpApi.get(id!).then((res: any) => {
        const mp = res.mp ?? res;
        return mp?.stats;
      }),
    enabled: !!id,
  });
}

export function useMPProjects(id: string | undefined, page: number = 1) {
  return useQuery({
    queryKey: ["mp-projects", id, page],
    queryFn: () => mpApi.getProjects(id!, page),
    enabled: !!id,
  });
}

export function useCreateMP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mpApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mps"] }),
  });
}

export function useUpdateMP(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MP>) => mpApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mps"] });
      qc.invalidateQueries({ queryKey: qk.mp(id) });
    },
  });
}

export function useDeleteMP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mpApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mps"] }),
  });
}
