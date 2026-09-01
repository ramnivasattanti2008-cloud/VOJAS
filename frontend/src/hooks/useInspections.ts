import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inspectionsApi } from "../services/inspectionsApi";

export const useInspections = (params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: ["inspections", params], queryFn: () => inspectionsApi.list(params) });

export const useInspection = (id: string) =>
  useQuery({ queryKey: ["inspection", id], queryFn: () => inspectionsApi.get(id), enabled: !!id });

export const useMyInspections = () =>
  useQuery({ queryKey: ["my-inspections"], queryFn: () => inspectionsApi.my() });

export const useInspectionStats = () =>
  useQuery({ queryKey: ["inspection-stats"], queryFn: () => inspectionsApi.stats() });

export const useCreateInspection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inspectionsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspections"] }),
  });
};

export const useAssignInspection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, inspectorId, scheduledDate }: { id: string; inspectorId: string; scheduledDate: string }) =>
      inspectionsApi.assign(id, inspectorId, scheduledDate),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspections"] }),
  });
};

export const useCompleteInspection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inspectionsApi.complete(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspections"] }),
  });
};
