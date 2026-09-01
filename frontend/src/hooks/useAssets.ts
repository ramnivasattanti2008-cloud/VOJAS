import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assetsApi } from "../services/assetsApi";

export const useAssets = (params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: ["assets", params], queryFn: () => assetsApi.list(params) });

export const useAsset = (id: string) =>
  useQuery({ queryKey: ["asset", id], queryFn: () => assetsApi.get(id), enabled: !!id });

export const useAssetHealth = (id: string) =>
  useQuery({ queryKey: ["asset-health", id], queryFn: () => assetsApi.health(id), enabled: !!id });

export const useAssetInspections = (id: string) =>
  useQuery({ queryKey: ["asset-inspections", id], queryFn: () => assetsApi.inspections(id), enabled: !!id });

export const useAssetProblems = (id: string) =>
  useQuery({ queryKey: ["asset-problems", id], queryFn: () => assetsApi.problems(id), enabled: !!id });

export const useAssetStats = () =>
  useQuery({ queryKey: ["asset-stats"], queryFn: () => assetsApi.stats() });

export const useCreateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => assetsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
};

export const useUpdateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => assetsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
};

export const useReportAssetProblem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title: string; description: string; severity?: string } }) =>
      assetsApi.reportProblem(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["asset-problems"] }),
  });
};
