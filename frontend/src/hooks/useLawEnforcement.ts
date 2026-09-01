import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  lawEnforcementApi,
  type LawAuthority,
  type EscalationResult,
  type LawEscalationList,
  type LawEnforcementStats,
} from "@/services/lawEnforcementApi";

// ── Queries ──────────────────────────────────────────────────────────────────

export function useLawEnforcementAuthorities() {
  return useQuery({
    queryKey: ["law-enforcement", "authorities"],
    queryFn: () => lawEnforcementApi.getAuthorities(),
    staleTime: Infinity,
  });
}

export function useLawEnforcementStats() {
  return useQuery<LawEnforcementStats>({
    queryKey: ["law-enforcement", "stats"],
    queryFn: () => lawEnforcementApi.getStats(),
    staleTime: 60_000,
  });
}

export function useLawEscalations(params?: {
  authority?: LawAuthority;
  page?: number;
  limit?: number;
}) {
  return useQuery<LawEscalationList>({
    queryKey: ["law-enforcement", "escalations", params],
    queryFn: () => lawEnforcementApi.getEscalations(params),
    staleTime: 30_000,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useEscalateAnomaly() {
  const qc = useQueryClient();
  return useMutation<
    EscalationResult,
    Error,
    {
      anomalyId: string;
      authority: LawAuthority;
      notes?: string;
      notifyAllAdmins?: boolean;
    }
  >({
    mutationFn: ({ anomalyId, authority, notes, notifyAllAdmins }) =>
      lawEnforcementApi.escalate(anomalyId, { authority, notes, notifyAllAdmins }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["law-enforcement"] });
      qc.invalidateQueries({ queryKey: ["anomalies"] });
    },
  });
}

export function useAcknowledgeReferral() {
  const qc = useQueryClient();
  return useMutation<
    { success: true; referenceNo: string; acknowledgedAt: string },
    Error,
    string
  >({
    mutationFn: (referenceNo) => lawEnforcementApi.acknowledgeReferral(referenceNo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["law-enforcement"] });
      qc.invalidateQueries({ queryKey: ["anomalies"] });
    },
  });
}

export function useAutoEscalate() {
  const qc = useQueryClient();
  return useMutation<
    { autoEscalated: number; minRiskScore: number },
    Error,
    number | undefined
  >({
    mutationFn: (minRiskScore) => lawEnforcementApi.autoEscalate(minRiskScore),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["law-enforcement"] });
      qc.invalidateQueries({ queryKey: ["anomalies"] });
    },
  });
}
