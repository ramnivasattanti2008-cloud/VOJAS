/**
 * M14: Government Officer Command Center API client
 */
import type { ApiClient } from './client.js';
import type { PaginatedResponse } from './types.js';

export interface OfficerCase {
  id: string;
  reference: string;
  type: 'ANOMALY' | 'RISK_FINDING' | 'CITIZEN_REPORT' | 'FIELD_INSPECTION';
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'NEW' | 'ASSIGNED' | 'UNDER_REVIEW' | 'VERIFICATION_REQUIRED' | 'RESOLVED' | 'DISMISSED' | 'ESCALATED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedToId?: string;
  assignedTo?: { id: string; name: string; email: string };
  projectId?: string;
  project?: { id: string; name: string; state: string; district: string };
  sector?: string;
  district?: string;
  state?: string;
  createdAt: string;
  updatedAt: string;
  age?: number; // days since creation
  evidenceCount?: number;
  notesCount?: number;
  lastActivity?: string;
}

export interface OfficerDashboardStats {
  totalCases: number;
  criticalCases: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  newFindings: number;
  overdueCases: number;
  pendingInspections: number;
  contractorResponsesAwaiting: number;
  unresolvedCases: number;
  recentEvidenceAdded: number;
  systemDataIssues: number;
}

export interface Evidence {
  id: string;
  type: 'SATELLITE' | 'DOCUMENT' | 'CITIZEN' | 'FINANCIAL' | 'FIELD' | 'PHOTO' | 'VIDEO';
  title: string;
  description?: string;
  source: string;
  url?: string;
  projectId?: string;
  project?: { id: string; name: string };
  caseId?: string;
  uploadedById?: string;
  uploadedBy?: { id: string; name: string };
  capturedAt?: string;
  createdAt: string;
  verified: boolean;
  chainOfCustody?: string;
}

export interface ContractorResponse {
  id: string;
  findingId?: string;
  findingTitle?: string;
  contractorId?: string;
  contractorName?: string;
  projectId?: string;
  projectName?: string;
  responseText: string;
  documents?: Array<{ name: string; url: string }>;
  submittedAt: string;
  deadline?: string;
  status: 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'CLARIFICATION_REQUESTED';
  reviewedById?: string;
  reviewedBy?: { id: string; name: string };
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface FieldInspection {
  id: string;
  projectId: string;
  projectName: string;
  location: string;
  assignedOfficerId?: string;
  assignedOfficer?: { id: string; name: string };
  scheduledDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  checklist: Array<{
    item: string;
    completed: boolean;
    notes?: string;
    photoUrl?: string;
  }>;
  notes?: string;
  photos?: string[];
  completedAt?: string;
  createdAt: string;
}

export interface CaseAction {
  id: string;
  caseId: string;
  action: string;
  performedById: string;
  performedBy?: { id: string; name: string };
  notes?: string;
  createdAt: string;
}

export function createOfficerApi(client: ApiClient) {
  return {
    // ── Dashboard ─────────────────────────────────────────────
    getDashboardStats() {
      return client.get<OfficerDashboardStats>('/api/v1/officer/dashboard/stats');
    },

    // ── Cases / Queue ─────────────────────────────────────────
    getCases(params?: {
      priority?: string;
      status?: string;
      assigned?: string;
      sector?: string;
      district?: string;
      age?: number;
      sortBy?: 'age' | 'priority' | 'confidence';
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }) {
      return client.get<PaginatedResponse<OfficerCase>>('/api/v1/officer/cases', params);
    },

    getCase(caseId: string) {
      return client.get<OfficerCase>(`/api/v1/officer/cases/${caseId}`);
    },

    // ── Case Actions ──────────────────────────────────────────
    assignCase(caseId: string, officerId: string) {
      return client.post<OfficerCase>(`/api/v1/officer/cases/${caseId}/assign`, { officerId });
    },

    reassignCase(caseId: string, officerId: string, notes?: string) {
      return client.post<OfficerCase>(`/api/v1/officer/cases/${caseId}/reassign`, { officerId, notes });
    },

    acknowledgeCase(caseId: string) {
      return client.post<OfficerCase>(`/api/v1/officer/cases/${caseId}/acknowledge`);
    },

    reviewCase(caseId: string, notes?: string) {
      return client.post<OfficerCase>(`/api/v1/officer/cases/${caseId}/review`, { notes });
    },

    requestInfo(caseId: string, infoType: string, notes?: string) {
      return client.post<OfficerCase>(`/api/v1/officer/cases/${caseId}/request-info`, { infoType, notes });
    },

    requestInspection(caseId: string, reason?: string) {
      return client.post<OfficerCase>(`/api/v1/officer/cases/${caseId}/request-inspection`, { reason });
    },

    requestContractorResponse(caseId: string, contractorId?: string, deadline?: string) {
      return client.post<OfficerCase>(`/api/v1/officer/cases/${caseId}/request-contractor-response`, {
        contractorId,
        deadline,
      });
    },

    addEvidence(caseId: string, evidence: { type: string; title: string; description?: string; url?: string; source: string }) {
      return client.post<Evidence>(`/api/v1/officer/cases/${caseId}/evidence`, evidence);
    },

    addNotes(caseId: string, notes: string) {
      return client.post<CaseAction>(`/api/v1/officer/cases/${caseId}/notes`, { notes });
    },

    verifyCase(caseId: string, verified: boolean, notes?: string) {
      return client.post<OfficerCase>(`/api/v1/officer/cases/${caseId}/verify`, { verified, notes });
    },

    dismissCase(caseId: string, reason: string) {
      return client.post<OfficerCase>(`/api/v1/officer/cases/${caseId}/dismiss`, { reason });
    },

    resolveCase(caseId: string, resolution: string) {
      return client.post<OfficerCase>(`/api/v1/officer/cases/${caseId}/resolve`, { resolution });
    },

    reopenCase(caseId: string, reason: string) {
      return client.post<OfficerCase>(`/api/v1/officer/cases/${caseId}/reopen`, { reason });
    },

    escalateCase(caseId: string, authority: string, reason?: string) {
      return client.post<OfficerCase>(`/api/v1/officer/cases/${caseId}/escalate`, { authority, reason });
    },

    getCaseHistory(caseId: string) {
      return client.get<{ actions: CaseAction[] }>(`/api/v1/officer/cases/${caseId}/history`);
    },

    // ── Evidence ──────────────────────────────────────────────
    getEvidence(params?: {
      type?: string;
      projectId?: string;
      caseId?: string;
      source?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    }) {
      return client.get<PaginatedResponse<Evidence>>('/api/v1/officer/evidence', params);
    },

    getEvidenceById(evidenceId: string) {
      return client.get<Evidence>(`/api/v1/officer/evidence/${evidenceId}`);
    },

    verifyEvidence(evidenceId: string, verified: boolean, notes?: string) {
      return client.patch<Evidence>(`/api/v1/officer/evidence/${evidenceId}`, { verified, notes });
    },

    linkEvidenceToCase(evidenceId: string, caseId: string) {
      return client.post<Evidence>(`/api/v1/officer/evidence/${evidenceId}/link`, { caseId });
    },

    // ── Contractor Responses ──────────────────────────────────
    getContractorResponses(params?: {
      findingId?: string;
      contractorId?: string;
      status?: string;
      page?: number;
      limit?: number;
    }) {
      return client.get<PaginatedResponse<ContractorResponse>>('/api/v1/officer/contractor-responses', params);
    },

    reviewContractorResponse(responseId: string, status: 'ACCEPTED' | 'REJECTED' | 'CLARIFICATION_REQUESTED', notes?: string) {
      return client.patch<ContractorResponse>(`/api/v1/officer/contractor-responses/${responseId}`, {
        status,
        reviewNotes: notes,
      });
    },

    // ── Field Inspections ────────────────────────────────────
    getFieldInspections(params?: {
      officerId?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    }) {
      return client.get<PaginatedResponse<FieldInspection>>('/api/v1/officer/field-inspections', params);
    },

    getFieldInspection(inspectionId: string) {
      return client.get<FieldInspection>(`/api/v1/officer/field-inspections/${inspectionId}`);
    },

    updateFieldInspection(
      inspectionId: string,
      updates: {
        checklist?: FieldInspection['checklist'];
        notes?: string;
        photos?: string[];
        status?: string;
      }
    ) {
      return client.patch<FieldInspection>(`/api/v1/officer/field-inspections/${inspectionId}`, updates);
    },

    submitFieldInspection(inspectionId: string, data: {
      checklist: FieldInspection['checklist'];
      notes?: string;
      photos?: string[];
    }) {
      return client.post<FieldInspection>(`/api/v1/officer/field-inspections/${inspectionId}/submit`, data);
    },

    // ── Map Data ──────────────────────────────────────────────
    getMapLayers(params?: {
      projects?: boolean;
      riskFindings?: boolean;
      cases?: boolean;
      citizenSignals?: boolean;
      satelliteEvidence?: boolean;
      fieldInspections?: boolean;
      sector?: string;
      district?: string;
      state?: string;
    }) {
      return client.get<{
        projects: Array<{ id: string; name: string; lat: number; lng: number; sector: string; status: string }>;
        riskFindings: Array<{ id: string; title: string; lat: number; lng: number; severity: string; projectId: string }>;
        cases: Array<{ id: string; title: string; lat: number; lng: number; priority: string; status: string }>;
        citizenSignals: Array<{ id: string; category: string; lat: number; lng: number; severity: string }>;
        satelliteEvidence: Array<{ id: string; type: string; lat: number; lng: number; capturedAt: string }>;
        fieldInspections: Array<{ id: string; projectName: string; lat: number; lng: number; status: string }>;
      }>('/api/v1/officer/map/layers', params);
    },
  };
}

export type OfficerApi = ReturnType<typeof createOfficerApi>;
