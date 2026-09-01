import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { casesApi } from "../services/casesApi";

export const useCases = (params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: ["cases", params], queryFn: () => casesApi.list(params) });

export const useCase = (id: string) =>
  useQuery({ queryKey: ["case", id], queryFn: () => casesApi.get(id), enabled: !!id });

export const useCaseTimeline = (id: string) =>
  useQuery({ queryKey: ["case-timeline", id], queryFn: () => casesApi.timeline(id), enabled: !!id });

export const useCaseStats = () =>
  useQuery({ queryKey: ["case-stats"], queryFn: () => casesApi.stats() });

export const useCreateCase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => casesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });
};

export const useAssignCase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string }) =>
      casesApi.assign(id, assigneeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });
};

export const useTransitionCase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      casesApi.transition(id, status, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });
};

export const useEscalateCase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, authority, notes }: { id: string; authority: string; notes?: string }) =>
      casesApi.escalate(id, authority, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });
};

export const useAddCaseEvidence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      casesApi.addEvidence(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case"] }),
  });
};
