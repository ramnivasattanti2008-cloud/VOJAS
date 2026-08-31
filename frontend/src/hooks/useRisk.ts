import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { riskApi, type RiskStats, type PaginatedRisks, type ProjectRisk, type RiskLevel } from "@/services/risk-api";
import { qk } from "./query-keys";

export interface RiskFilters {
  riskLevel?: RiskLevel;
  sortBy?: "overallScore" | "riskLevel" | "updatedAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export function useRiskStats() {
  return useQuery<RiskStats>({
    queryKey: qk.riskStats(),
    queryFn: () => riskApi.stats(),
    staleTime: 60_000,
  });
}

export function useRiskList(filters: RiskFilters = {}) {
  return useQuery<PaginatedRisks>({
    queryKey: qk.risk(filters),
    queryFn: () => riskApi.list(filters),
    staleTime: 30_000,
  });
}

export function useProjectRisk(projectId: string | undefined) {
  return useQuery<ProjectRisk>({
    queryKey: qk.projectRisk(projectId ?? ""),
    queryFn: () => riskApi.get(projectId!),
    enabled: !!projectId,
  });
}

export function useRecalculateAllRisk() {
  const qc = useQueryClient();
  return useMutation<
    { message: string; count: number; projects: ProjectRisk[] },
    Error,
    void
  >({
    mutationFn: () => riskApi.recalculateAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["risk"] });
    },
  });
}

export function useRecalculateOneRisk() {
  const qc = useQueryClient();
  return useMutation<ProjectRisk, Error, string>({
    mutationFn: (projectId) => riskApi.recalculateOne(projectId),
    onSuccess: (risk) => {
      qc.invalidateQueries({ queryKey: ["risk"] });
      qc.invalidateQueries({ queryKey: qk.projectRisk(risk.projectId) });
    },
  });
}
