import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { qk } from "./query-keys";
import type { HealthStatus } from "@/types";

export function useHealth() {
  return useQuery<HealthStatus>({
    queryKey: qk.health(),
    queryFn: () => api.get<HealthStatus>("/health"),
    staleTime: 30_000,
    retry: 2,
  });
}
