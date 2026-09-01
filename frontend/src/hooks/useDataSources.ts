import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataSourcesApi } from "../services/dataSourcesApi";

export const useDataSources = () =>
  useQuery({ queryKey: ["data-sources"], queryFn: () => dataSourcesApi.list() });

export const useDataSource = (id: string) =>
  useQuery({ queryKey: ["data-source", id], queryFn: () => dataSourcesApi.get(id), enabled: !!id });

export const useDataSourceFreshness = (id: string) =>
  useQuery({ queryKey: ["data-source-freshness", id], queryFn: () => dataSourcesApi.freshness(id), enabled: !!id });

export const useDataSourceStats = () =>
  useQuery({ queryKey: ["data-source-stats"], queryFn: () => dataSourcesApi.stats() });

export const useCreateDataSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => dataSourcesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-sources"] }),
  });
};

export const useUpdateDataSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      dataSourcesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-sources"] }),
  });
};

export const useSyncDataSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dataSourcesApi.sync(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-sources"] }),
  });
};

export const useDeleteDataSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dataSourcesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-sources"] }),
  });
};
