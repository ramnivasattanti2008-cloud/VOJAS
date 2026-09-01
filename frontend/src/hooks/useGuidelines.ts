import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { guidelinesApi } from "../services/guidelinesApi";

export const useGuidelines = (params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: ["guidelines", params], queryFn: () => guidelinesApi.list(params) });

export const useGuideline = (id: string) =>
  useQuery({ queryKey: ["guideline", id], queryFn: () => guidelinesApi.get(id), enabled: !!id });

export const useGuidelineSearch = (q: string, category?: string, sector?: string) =>
  useQuery({
    queryKey: ["guideline-search", q, category, sector],
    queryFn: () => guidelinesApi.search(q, category, sector),
    enabled: q.length > 0,
  });

export const useGuidelineCategories = () =>
  useQuery({ queryKey: ["guideline-categories"], queryFn: () => guidelinesApi.categories() });

export const useProjectCompliance = (projectId: string) =>
  useQuery({
    queryKey: ["project-compliance", projectId],
    queryFn: () => guidelinesApi.projectCompliance(projectId),
    enabled: !!projectId,
  });

export const useGuidelineStats = () =>
  useQuery({ queryKey: ["guideline-stats"], queryFn: () => guidelinesApi.stats() });

export const useCreateGuideline = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => guidelinesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guidelines"] }),
  });
};

export const useCheckCompliance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      guidelinesApi.checkCompliance(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-compliance"] }),
  });
};
