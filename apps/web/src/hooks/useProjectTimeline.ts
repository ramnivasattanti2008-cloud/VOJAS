'use client';

import { useQuery } from '@tanstack/react-query';
import { createProjectsApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import type { ProjectLocation, ProjectEvidence } from '@vojas/api-client';

const projectsApi = createProjectsApi(apiClient);

export function useProjectTimeline(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['project-timeline', projectId],
    queryFn: () => projectsApi.getTimeline(projectId!),
    enabled: !!projectId,
  });
}

export function useProjectLocations(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['project-locations', projectId],
    queryFn: () => projectsApi.getLocations(projectId!),
    enabled: !!projectId,
  });
}

export function useProjectEvidence(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['project-evidence', projectId],
    queryFn: () => projectsApi.getEvidence(projectId!),
    enabled: !!projectId,
  });
}
