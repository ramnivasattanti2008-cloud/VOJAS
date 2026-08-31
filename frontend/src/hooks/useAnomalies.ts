import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { anomalyApi, type AnomalyFilters, type AnomalyStats, type ScanResult } from "@/services/anomaly-api";
import type { Anomaly, AnomalyRule } from "@/types";
import { qk } from "./query-keys";

// ── Queries ──────────────────────────────────────────────────────────────────

export function useAnomalies(filters: AnomalyFilters = {}) {
  return useQuery({
    queryKey: qk.anomalies(filters),
    queryFn: () => anomalyApi.list(filters),
    staleTime: 30_000,
  });
}

export function useAnomalyStats() {
  return useQuery<AnomalyStats>({
    queryKey: qk.anomalyStats(),
    queryFn: () => anomalyApi.stats(),
    staleTime: 60_000,
  });
}

export function useAnomaly(id: string | undefined) {
  return useQuery<Anomaly>({
    queryKey: qk.anomaly(id ?? ""),
    queryFn: () => anomalyApi.get(id!),
    enabled: !!id,
  });
}

export function useAnomalyRules() {
  return useQuery<AnomalyRule[]>({
    queryKey: qk.anomalyRules(),
    queryFn: () => anomalyApi.listRules(),
    staleTime: 5 * 60_000,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useScanAnomalies() {
  const qc = useQueryClient();
  return useMutation<ScanResult, Error, void>({
    mutationFn: () => anomalyApi.scan(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["anomalies"] });
      qc.invalidateQueries({ queryKey: qk.anomalyStats() });
    },
  });
}

export function useAcknowledgeAnomaly() {
  const qc = useQueryClient();
  return useMutation<Anomaly, Error, string>({
    mutationFn: (id) => anomalyApi.acknowledge(id),
    onSuccess: (anomaly) => {
      qc.invalidateQueries({ queryKey: ["anomalies"] });
      qc.invalidateQueries({ queryKey: qk.anomaly(anomaly.id) });
    },
  });
}

export function useResolveAnomaly() {
  const qc = useQueryClient();
  return useMutation<Anomaly, Error, { id: string; resolution: string }>({
    mutationFn: ({ id, resolution }) => anomalyApi.resolve(id, resolution),
    onSuccess: (anomaly) => {
      qc.invalidateQueries({ queryKey: ["anomalies"] });
      qc.invalidateQueries({ queryKey: qk.anomaly(anomaly.id) });
    },
  });
}

export function useUpdateAnomalyRule() {
  const qc = useQueryClient();
  return useMutation<AnomalyRule, Error, { id: string; enabled: boolean }>({
    mutationFn: ({ id, enabled }) => anomalyApi.updateRule(id, enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.anomalyRules() });
    },
  });
}
