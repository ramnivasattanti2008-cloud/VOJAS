/**
 * Phase 4: Investigation Dossier + Enforcement Referral API client
 */
import type { ApiClient } from './client.js';
import type { PaginatedResponse } from './types.js';
import type { ProjectIntelligence } from './projects.js';

export interface InvestigationCase {
  id: string;
  projectId: string;
  project?: { id: string; name: string; state?: string; district?: string };
  findingId?: string | null;
  finding?: { id: string; title: string; severity: string; status: string } | null;
  type: string;
  status: 'OPEN' | 'ASSIGNED' | 'UNDER_REVIEW' | 'CLOSED' | 'REOPENED';
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string } | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralAuthority {
  code: string;
  label: string;
  prefix: string;
}

export type ReferralStatus =
  | 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REFERRED'
  | 'ACKNOWLEDGED' | 'UNDER_REVIEW' | 'ACTION_TAKEN' | 'RESOLVED' | 'CLOSED';

export interface Referral {
  id: string;
  caseId: string;
  projectId: string;
  project?: { id: string; name: string };
  case?: { id: string; type: string; status: string };
  findingId?: string | null;
  destinationAuthority: string;
  referenceNo: string;
  reason: string;
  status: ReferralStatus;
  dossier: unknown;
  notes?: string | null;
  preparedById: string;
  preparedBy?: { id: string; name: string };
  approvedById?: string | null;
  approvedBy?: { id: string; name: string } | null;
  approvedAt?: string | null;
  referredAt?: string | null;
  acknowledgedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationDossier {
  caseId: string;
  caseType: string;
  caseStatus: string;
  casePriority: string;
  caseNotes: string | null;
  responsibleOfficer: { id: string; name: string } | null;
  intelligence: ProjectIntelligence;
  fieldVerifications: Array<{
    id: string;
    locationDesc: string | null;
    scheduledDate: string | null;
    completedDate: string | null;
    result: string;
    notes: string | null;
  }>;
  contractorSubmissions: Array<{
    id: string; updateType: string; title: string; description: string; status: string; submittedAt: string;
  }>;
  citizenReports: Array<{
    id: string; reportReference: string; title: string; category: string; severity: string;
    status: string; isAnonymous: boolean; submittedAt: string;
  }>;
  evidence: Array<{
    id: string; evidenceType: string; title: string; url: string | null;
    capturedAt: string; verificationStatus: string; evidenceLevel: string;
  }>;
  generatedAt: string;
}

export interface ReferralHistoryEvent {
  id: string;
  action: string;
  performedById: string;
  performedBy?: { id: string; name: string };
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

export function createInvestigationsApi(client: ApiClient) {
  return {
    create(payload: { projectId: string; findingId?: string; type: string; priority?: string; notes?: string }) {
      return client.post<InvestigationCase>('/investigations', payload);
    },
    list(filters?: { status?: string; projectId?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<InvestigationCase>>('/investigations', filters as Record<string, any>);
    },
    getById(id: string) {
      return client.get<InvestigationCase>(`/investigations/${id}`);
    },
    getDossier(id: string) {
      return client.get<InvestigationDossier>(`/investigations/${id}/dossier`);
    },
    getAuthorities() {
      return client.get<{ authorities: ReferralAuthority[] }>('/investigations/meta/authorities');
    },
    createReferral(caseId: string, payload: { destinationAuthority: string; reason: string }) {
      return client.post<Referral>(`/investigations/${caseId}/referrals`, payload);
    },
    getCaseReferrals(caseId: string) {
      return client.get<{ data: Referral[]; total: number }>(`/investigations/${caseId}/referrals`);
    },
  };
}

export function createReferralsApi(client: ApiClient) {
  return {
    list(filters?: { status?: string; projectId?: string; destinationAuthority?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<Referral>>('/referrals', filters as Record<string, any>);
    },
    getById(id: string) {
      return client.get<Referral>(`/referrals/${id}`);
    },
    getHistory(id: string) {
      return client.get<{ events: ReferralHistoryEvent[] }>(`/referrals/${id}/history`);
    },
    approve(id: string) {
      return client.post<Referral>(`/referrals/${id}/approve`);
    },
    reject(id: string, notes: string) {
      return client.post<Referral>(`/referrals/${id}/reject`, { notes });
    },
    updateStatus(id: string, status: ReferralStatus, notes?: string) {
      return client.patch<Referral>(`/referrals/${id}/status`, { status, notes });
    },
  };
}

export type InvestigationsApi = ReturnType<typeof createInvestigationsApi>;
export type ReferralsApi = ReturnType<typeof createReferralsApi>;
