import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contractorsApi } from "../services/contractorsApi";

export const useContractorDashboard = () =>
  useQuery({ queryKey: ["contractor-dashboard"], queryFn: () => contractorsApi.dashboard() });

export const useContractorProfile = () =>
  useQuery({ queryKey: ["contractor-profile"], queryFn: () => contractorsApi.profile() });

export const useMyDocuments = () =>
  useQuery({ queryKey: ["my-contractor-documents"], queryFn: () => contractorsApi.getMyDocuments() });

export const useWorkDiaries = (contractorProjectId: string) =>
  useQuery({
    queryKey: ["work-diaries", contractorProjectId],
    queryFn: () => contractorsApi.getWorkDiaries(contractorProjectId),
    enabled: !!contractorProjectId,
  });

export const useUpdateContractorProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => contractorsApi.updateProfile(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contractor-profile"] }),
  });
};

export const useCreateMilestone = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => contractorsApi.createMilestone(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contractor-dashboard"] }),
  });
};

export const useCompleteMilestone = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contractorsApi.completeMilestone(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contractor-dashboard"] }),
  });
};

export const useCreateWorkDiary = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => contractorsApi.createWorkDiary(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-diaries"] }),
  });
};

export const useCreateDefect = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => contractorsApi.createDefect(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contractor-dashboard"] }),
  });
};

export const useRespondDefect = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      contractorsApi.respondDefect(id, response),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contractor-dashboard"] }),
  });
};

export const useSubmitPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => contractorsApi.submitPayment(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contractor-dashboard"] }),
  });
};

export const useUploadDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => contractorsApi.uploadDocument(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-contractor-documents"] }),
  });
};
