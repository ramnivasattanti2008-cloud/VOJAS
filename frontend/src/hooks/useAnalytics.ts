import { useQuery } from "@tanstack/react-query";
import { analyticsApi, type AnalyticsSummary } from "@/services/analytics-api";
import { qk } from "./query-keys";

export function useAnalyticsSummary() {
  return useQuery<AnalyticsSummary>({
    queryKey: qk.analyticsSummary(),
    queryFn: () => analyticsApi.getSummary(),
    staleTime: 5 * 60_000,
  });
}
