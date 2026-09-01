import { api } from "./api";

export type LawAuthority =
  | "ACB_OFFICE"
  | "POLICE_OFFICE"
  | "CVC"
  | "LOKAYUKTA"
  | "VIGILANCE"
  | "COMPTROLLER";

export interface LawAuthorityOption {
  code: LawAuthority;
  label: string;
}

export interface EscalationResult {
  success: true;
  anomalyId: string;
  authority: LawAuthority;
  authorityLabel: string;
  lawReferenceNo: string;
  escalatedAt: string;
  escalatedById: string;
  notifiedAdmins: number;
  caseId?: string;
}

export interface LawEscalationSummary {
  id: string;
  title: string;
  description: string;
  severity: string;
  riskScore: number;
  category: string;
  status: string;
  lawAuthority: string | null;
  lawAuthorityLabel: string | null;
  lawReferenceNo: string | null;
  lawEscalatedAt: string | null;
  lawAcknowledged: boolean;
  lawNotes: string | null;
  escalatedBy: { id: string; name: string; email: string; role: string } | null;
  project: {
    id: string;
    name: string;
    state: string;
    district: string;
    constituency: string | null;
    mpName: string | null;
    approvedAmount: number;
    spentAmount: number;
  } | null;
}

export interface LawEscalationList {
  items: LawEscalationSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LawEnforcementStats {
  total: number;
  acknowledged: number;
  pending: number;
  byAuthority: Array<{
    authority: string;
    label: string;
    count: number;
  }>;
  recent: Array<{
    id: string;
    title: string;
    lawReferenceNo: string | null;
    lawAuthority: string | null;
    lawEscalatedAt: string | null;
    severity: string;
  }>;
}

// ── Wire types ────────────────────────────────────────────────────────────────
// `api.get<T>(...)` already unwraps the envelope and returns T directly.

export const lawEnforcementApi = {
  listAuthorities() {
    return api.get<{ authorities: LawAuthorityOption[] }>(
      "/law-enforcement/authorities",
    );
  },

  getAuthorities(): Promise<LawAuthorityOption[]> {
    return this.listAuthorities() as unknown as Promise<LawAuthorityOption[]>;
  },

  escalate(
    anomalyId: string,
    input: { authority: LawAuthority; notes?: string; notifyAllAdmins?: boolean },
  ): Promise<EscalationResult> {
    return api.post<EscalationResult>(
      `/law-enforcement/anomalies/${anomalyId}/escalate`,
      input,
    );
  },

  acknowledgeReferral(
    referenceNo: string,
    notes?: string,
  ): Promise<{ success: true; referenceNo: string; acknowledgedAt: string }> {
    return api.post<{ success: true; referenceNo: string; acknowledgedAt: string }>(
      `/law-enforcement/referrals/${encodeURIComponent(referenceNo)}/acknowledge`,
      notes ? { notes } : {},
    );
  },

  listEscalations(params?: {
    authority?: LawAuthority;
    page?: number;
    limit?: number;
  }) {
    const p = new URLSearchParams();
    if (params?.authority) p.set("authority", params.authority);
    p.set("page", String(params?.page ?? 1));
    p.set("limit", String(params?.limit ?? 20));
    return api.get<LawEscalationList>(
      `/law-enforcement/escalations?${p.toString()}`,
    );
  },

  getEscalations(params?: {
    authority?: LawAuthority;
    page?: number;
    limit?: number;
  }): Promise<LawEscalationList> {
    return this.listEscalations(params) as unknown as Promise<LawEscalationList>;
  },

  getStats(): Promise<LawEnforcementStats> {
    return api.get<LawEnforcementStats>("/law-enforcement/stats");
  },

  autoEscalate(minRiskScore?: number): Promise<{ autoEscalated: number; minRiskScore: number }> {
    return api.post<{ autoEscalated: number; minRiskScore: number }>(
      "/law-enforcement/auto-escalate",
      minRiskScore != null ? { minRiskScore } : {},
    );
  },
};
