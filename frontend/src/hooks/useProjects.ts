import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { qk } from "./query-keys";
import type {
  Project,
  ProjectStats,
  PaginatedProjects,
  ProjectStatus,
  ProjectSector,
} from "@/types";

export interface ProjectFilters {
  search?: string;
  status?: ProjectStatus | "";
  sector?: ProjectSector | "";
  page?: number;
  limit?: number;
}

export const projectApi = {
  list: (filters: ProjectFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.sector) params.set("sector", filters.sector);
    params.set("page", String(filters.page ?? 1));
    params.set("limit", String(filters.limit ?? 12));
    return api.get<PaginatedProjects>(`/projects?${params.toString()}`);
  },
  stats: () => api.get<{ stats: ProjectStats }>(`/projects/stats`),
  get: (id: string) => api.get<{ project: Project }>(`/projects/${id}`),
  getDetail: (id: string) => api.get<{ detail: any }>(`/projects/${id}/detail`),
  create: (data: Partial<Project>) => api.post<{ project: Project }>(`/projects`, data),
  update: (id: string, data: Partial<Project>) =>
    api.put<{ project: Project }>(`/projects/${id}`, data),
  remove: (id: string) => api.delete<{ message: string }>(`/projects/${id}`),
};

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: qk.projects(filters),
    queryFn: () => projectApi.list(filters),
    staleTime: 30_000,
  });
}

export function useProjectStats() {
  return useQuery({
    queryKey: qk.projectStats(),
    queryFn: () => projectApi.stats(),
    staleTime: 60_000,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: qk.project(id ?? ""),
    queryFn: () => projectApi.get(id!),
    enabled: !!id,
  });
}

export function useProjectDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["project-detail", id],
    queryFn: () => projectApi.getDetail(id!).then((res: any) => res.detail ?? res),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Project>) => projectApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: qk.project(id) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
