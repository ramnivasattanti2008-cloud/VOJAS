import type { ApiClient } from './client.js';
import type { PaginatedResponse } from './types.js';
import type { ProjectStatus, ProjectSector } from '@vojas/shared';

// ── Contractor Types ────────────────────────────────────────────────────────────

export interface ContractorProject {
  id: string;
  name: string;
  description?: string;
  sector: ProjectSector;
  status: ProjectStatus;
  state?: string;
  district?: string;
  block?: string;
  constituency?: string;
  sanctionedAmount?: number;
  releasedAmount?: number;
  utilizedAmount?: number;
  approvedAmount?: number;
  spentAmount?: number;
  progressPercent?: number;
  latitude?: number | null;
  longitude?: number | null;
  startDate?: string;
  endDate?: string;
  completionDate?: string;
  riskLevel?: string;
  anomalyCount?: number;
  reportCount?: number;
  createdAt?: string;
  updatedAt?: string;
  // Contractor-specific fields
  currentMilestone?: string;
  nextMilestoneDue?: string;
  pendingDocuments?: number;
  openIssues?: number;
}

export interface ContractorMilestone {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description?: string;
  status: 'UPCOMING' | 'CURRENT' | 'COMPLETED' | 'PENDING_VERIFICATION' | 'REJECTED' | 'CORRECTION_NEEDED';
  dueDate?: string;
  completedDate?: string;
  verifiedDate?: string;
  rejectionNote?: string;
  correctionNote?: string;
  amount?: number;
  progressPercent?: number;
  evidenceUrls?: string[];
  documents?: ContractorDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface ContractorDocument {
  id: string;
  projectId: string;
  projectName?: string;
  milestoneId?: string;
  milestoneTitle?: string;
  title: string;
  description?: string;
  type: string;
  url: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  uploadedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionNote?: string;
}

export interface ContractorPayment {
  id: string;
  projectId: string;
  projectName: string;
  milestoneId?: string;
  milestoneTitle?: string;
  approvedAmount: number;
  releasedAmount: number;
  utilizedAmount: number;
  status: 'PENDING' | 'APPROVED' | 'RELEASED' | 'UTILIZED';
  dueDate?: string;
  releasedDate?: string;
  verificationStatus: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  vojasVerified: boolean;
  authorizedPayment: boolean;
  paymentEligible: boolean;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractorIssue {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  type: 'QUALITY_DEFECT' | 'COMPLIANCE' | 'SAFETY' | 'ENVIRONMENTAL' | 'DELAY' | 'OTHER';
  reportedBy?: string;
  reportedAt: string;
  resolvedAt?: string;
  resolution?: string;
  history?: IssueHistoryEntry[];
}

export interface IssueHistoryEntry {
  id: string;
  action: string;
  note?: string;
  performedBy?: string;
  performedAt: string;
}

export interface ContractorResponse {
  id: string;
  projectId: string;
  projectName: string;
  finding: string;
  reason?: string;
  evidenceReference?: string;
  deadline?: string;
  status: 'PENDING' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';
  submittedAt?: string;
  reviewedAt?: string;
  reviewerNote?: string;
  response?: string;
  documents?: ContractorDocument[];
}

export interface ContractorDashboard {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  upcomingMilestones: number;
  currentMilestones: number;
  pendingVerifications: number;
  pendingDocuments: number;
  openIssues: number;
  totalApproved: number;
  totalReleased: number;
  recentUpdates: ContractorUpdate[];
}

export interface ContractorUpdate {
  id: string;
  projectId: string;
  projectName: string;
  updateType: 'PERFORMANCE' | 'MILESTONE' | 'PAYMENT' | 'STATUS';
  title: string;
  description?: string;
  submittedAt: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';
}

export interface Inspection {
  id: string;
  projectId: string;
  projectName: string;
  scheduledDate: string;
  type: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  inspector?: string;
  findings?: string;
  reportUrl?: string;
  createdAt: string;
}

export interface WorkDiaryEntry {
  id: string;
  projectId: string;
  date: string;
  workdone: string;
  workersPresent: number;
  materialsUsed?: string;
  equipmentUsed?: string;
  notes?: string;
  submittedAt: string;
}

// ── API Functions ──────────────────────────────────────────────────────────────

export function createContractorApi(client: ApiClient) {
  return {
    // Dashboard
    getDashboard() {
      return client.get<ContractorDashboard>('/contractor/dashboard');
    },

    // Projects (contractor's own projects only)
    getProjects(params?: { search?: string; status?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<ContractorProject>>('/contractor/projects', params as Record<string, any>);
    },
    getProject(id: string) {
      return client.get<ContractorProject>(`/contractor/projects/${id}`);
    },

    // Milestones
    getMilestones(params?: { projectId?: string; status?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<ContractorMilestone>>('/contractor/milestones', params as Record<string, any>);
    },
    getMilestone(id: string) {
      return client.get<ContractorMilestone>(`/contractor/milestones/${id}`);
    },
    submitMilestone(id: string, payload: { title: string; description?: string; evidenceUrls?: string[] }) {
      return client.post<ContractorMilestone>(`/contractor/milestones/${id}/submit`, payload);
    },
    submitCorrection(id: string, payload: { correctionNote: string; evidenceUrls?: string[] }) {
      return client.post<ContractorMilestone>(`/contractor/milestones/${id}/correct`, payload);
    },
    requestInspection(milestoneId: string, payload: { preferredDate?: string; notes?: string }) {
      return client.post<Inspection>(`/contractor/milestones/${milestoneId}/request-inspection`, payload);
    },

    // Documents
    getDocuments(params?: { projectId?: string; milestoneId?: string; type?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<ContractorDocument>>('/contractor/documents', params as Record<string, any>);
    },
    getDocument(id: string) {
      return client.get<ContractorDocument>(`/contractor/documents/${id}`);
    },
    uploadDocument(payload: {
      projectId: string;
      milestoneId?: string;
      title: string;
      description?: string;
      type: string;
      fileUrl: string;
    }) {
      return client.post<ContractorDocument>('/contractor/documents', payload);
    },

    // Payments
    getPayments(params?: { projectId?: string; status?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<ContractorPayment>>('/contractor/payments', params as Record<string, any>);
    },
    getPayment(id: string) {
      return client.get<ContractorPayment>(`/contractor/payments/${id}`);
    },

    // Issues
    getIssues(params?: { projectId?: string; status?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<ContractorIssue>>('/contractor/issues', params as Record<string, any>);
    },
    getIssue(id: string) {
      return client.get<ContractorIssue>(`/contractor/issues/${id}`);
    },
    respondToIssue(id: string, payload: { response: string; documents?: string[] }) {
      return client.post<ContractorIssue>(`/contractor/issues/${id}/respond`, payload);
    },

    // Responses / Findings
    getResponses(params?: { projectId?: string; status?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<ContractorResponse>>('/contractor/responses', params as Record<string, any>);
    },
    getResponse(id: string) {
      return client.get<ContractorResponse>(`/contractor/responses/${id}`);
    },
    submitResponse(id: string, payload: {
      response: string;
      documents?: string[];
      evidenceUrls?: string[];
    }) {
      return client.post<ContractorResponse>(`/contractor/responses/${id}`, payload);
    },

    // Work Diary
    getWorkDiary(projectId: string, params?: { startDate?: string; endDate?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<WorkDiaryEntry>>(`/contractor/projects/${projectId}/work-diary`, params as Record<string, any>);
    },
    submitWorkDiary(projectId: string, payload: {
      date: string;
      workdone: string;
      workersPresent: number;
      materialsUsed?: string;
      equipmentUsed?: string;
      notes?: string;
    }) {
      return client.post<WorkDiaryEntry>(`/contractor/projects/${projectId}/work-diary`, payload);
    },

    // Inspections
    getInspections(params?: { projectId?: string; status?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<Inspection>>('/contractor/inspections', params as Record<string, any>);
    },
  };
}

export type ContractorApi = ReturnType<typeof createContractorApi>;
