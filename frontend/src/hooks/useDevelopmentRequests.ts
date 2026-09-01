import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { developmentRequestsApi } from "../services/developmentRequestsApi";

export const useDevelopmentRequests = (params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: ["dev-requests", params], queryFn: () => developmentRequestsApi.list(params) });

export const useDevelopmentRequest = (id: string) =>
  useQuery({ queryKey: ["dev-request", id], queryFn: () => developmentRequestsApi.get(id), enabled: !!id });

export const useRequestGroups = (sector?: string) =>
  useQuery({ queryKey: ["dev-request-groups", sector], queryFn: () => developmentRequestsApi.groups(sector) });

export const useRequestPriority = (district: string) =>
  useQuery({ queryKey: ["dev-request-priority", district], queryFn: () => developmentRequestsApi.priority(district), enabled: !!district });

export const useRequestStats = () =>
  useQuery({ queryKey: ["dev-request-stats"], queryFn: () => developmentRequestsApi.stats() });

export const useCreateRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => developmentRequestsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dev-requests"] }),
  });
};

export const useUpdateRequestStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, resolution }: { id: string; status: string; resolution?: string }) =>
      developmentRequestsApi.updateStatus(id, status, resolution),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dev-requests"] }),
  });
};

export const useSupportRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      developmentRequestsApi.support(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dev-requests"] }),
  });
};
