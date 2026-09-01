import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { priorityApi } from "../services/priorityApi";

export const useTopPriorities = (limit = 20) =>
  useQuery({ queryKey: ["top-priorities", limit], queryFn: () => priorityApi.top(limit) });

export const usePriorityByDistrict = (district: string) =>
  useQuery({
    queryKey: ["priority-district", district],
    queryFn: () => priorityApi.byDistrict(district),
    enabled: !!district,
  });

export const usePriorityByArea = (state: string, district?: string) =>
  useQuery({
    queryKey: ["priority-area", state, district],
    queryFn: () => priorityApi.byArea(state, district),
    enabled: !!state,
  });

export const usePriorityStats = () =>
  useQuery({ queryKey: ["priority-stats"], queryFn: () => priorityApi.stats() });

export const useComputePriority = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => priorityApi.compute(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["top-priorities"] }),
  });
};

export const useRecomputeAll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => priorityApi.recomputeAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["top-priorities"] }),
  });
};
