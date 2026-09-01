import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataQualityApi } from "../services/dataQualityApi";

export const useDataQualityIssues = (params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: ["data-quality-issues", params], queryFn: () => dataQualityApi.issues(params) });

export const useDataQualityIssue = (id: string) =>
  useQuery({ queryKey: ["data-quality-issue", id], queryFn: () => dataQualityApi.issue(id), enabled: !!id });

export const useDataQualityStats = () =>
  useQuery({ queryKey: ["data-quality-stats"], queryFn: () => dataQualityApi.stats() });

export const useScanDataQuality = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entityType?: string) => dataQualityApi.scan(entityType),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-quality-issues"] }),
  });
};

export const useResolveDataQuality = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => dataQualityApi.resolve(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-quality-issues"] }),
  });
};

export const useDismissDataQuality = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => dataQualityApi.dismiss(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-quality-issues"] }),
  });
};
