'use client';

import { useQuery } from '@tanstack/react-query';
import { createProjectsApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import type { Project } from '@vojas/api-client';
import type {
  PublicProject,
  ProjectSummary,
  StateSummary,
  DistrictSummary,
  ProjectCluster,
} from '@vojas/api-client';

const projectsApi = createProjectsApi(apiClient);

export interface PublicProjectFilters {
  state?: string;
  district?: string;
  sector?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function usePublicProjects(filters?: PublicProjectFilters) {
  return useQuery({
    queryKey: ['public-projects', filters],
    queryFn: () => projectsApi.list(filters as any),
  });
}

export function usePublicProject(id: string | null | undefined) {
  return useQuery({
    queryKey: ['public-project', id],
    queryFn: () => projectsApi.getById(id!),
    enabled: !!id,
  });
}

export function usePublicProjectSummary() {
  return useQuery({
    queryKey: ['public-project-summary'],
    queryFn: () => projectsApi.public.getSummary(),
  });
}

export function usePublicStateSummaries() {
  return useQuery({
    queryKey: ['public-state-summaries'],
    queryFn: () => projectsApi.public.getStateSummaries(),
  });
}

export function usePublicDistrictSummaries(state: string | null | undefined) {
  return useQuery({
    queryKey: ['public-district-summaries', state],
    queryFn: () => projectsApi.public.getDistrictSummaries(state!),
    enabled: !!state,
  });
}

export function usePublicProjectCluster(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['public-project-cluster', projectId],
    queryFn: () => projectsApi.public.getProjectCluster(projectId!),
    enabled: !!projectId,
  });
}
