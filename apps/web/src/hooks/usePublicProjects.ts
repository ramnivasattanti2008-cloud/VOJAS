'use client';

import { useQuery } from '@tanstack/react-query';
import { createProjectsApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import type { PublicProjectFilters } from '@vojas/api-client';

const projectsApi = createProjectsApi(apiClient);

/** Anonymous, no-auth project discovery — never triggers the 401 login redirect. */
export function usePublicProjects(filters?: PublicProjectFilters) {
  return useQuery({
    queryKey: ['public-projects', filters],
    queryFn: () => projectsApi.public.list(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicProject(id: string | null | undefined) {
  return useQuery({
    queryKey: ['public-projects', id],
    queryFn: () => projectsApi.public.getById(id!),
    enabled: !!id,
  });
}

export function usePublicProjectTimeline(id: string | null | undefined) {
  return useQuery({
    queryKey: ['public-projects', id, 'timeline'],
    queryFn: () => projectsApi.public.getTimeline(id!, { limit: 50 }),
    enabled: !!id,
  });
}

export function usePublicProjectRisk(id: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['public-projects', id, 'risk'],
    queryFn: () => projectsApi.public.getRiskSummary(id!),
    enabled: !!id && enabled,
  });
}

/** Unified evidence feed (documents, satellite, verifications, etc.), public-safe subset only. */
export function usePublicProjectEvidence(id: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['public-projects', id, 'evidence'],
    queryFn: () => projectsApi.public.getEvidence(id!),
    enabled: !!id && enabled,
  });
}
