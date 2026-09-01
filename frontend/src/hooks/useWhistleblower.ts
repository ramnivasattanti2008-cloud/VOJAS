import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { whistleblowerApi } from "../services/whistleblowerApi";

export const useWhistleblowerReports = (params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: ["whistleblower", params], queryFn: () => whistleblowerApi.list(params) });

export const useWhistleblower = (id: string) =>
  useQuery({ queryKey: ["whistleblower", id], queryFn: () => whistleblowerApi.get(id), enabled: !!id });

export const useWhistleblowerStats = () =>
  useQuery({ queryKey: ["whistleblower-stats"], queryFn: () => whistleblowerApi.stats() });

export const useSubmitWhistleblower = () =>
  useMutation({ mutationFn: (data: Record<string, unknown>) => whistleblowerApi.submit(data) });

export const useReviewWhistleblower = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: string; note?: string }) =>
      whistleblowerApi.review(id, action, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whistleblower"] }),
  });
};
