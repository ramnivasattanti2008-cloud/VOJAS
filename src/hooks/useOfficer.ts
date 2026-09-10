'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createOfficerApi, type OfficerCase, type Evidence, type ContractorResponse, type FieldInspection, type OfficerDashboardStats } from '@vojas/api-client';
import { apiClient } from '@/lib/api';

const officerApi = createOfficerApi(apiClient);

// ── Dashboard ────────────────────────────────────────────────

export function useOfficerDashboardStats() {
  return useQuery<OfficerDashboardStats, Error>({
    queryKey: ['officer', 'dashboard', 'stats'],
    queryFn: () => officerApi.getDashboardStats(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ── Cases / Queue ────────────────────────────────────────────

export function useOfficerCases(filters?: {
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
  return useQuery({
    queryKey: ['officer', 'cases', filters],
    queryFn: () => officerApi.getCases(filters),
  });
}

export function useOfficerCase(caseId: string | null | undefined) {
  return useQuery({
    queryKey: ['officer', 'cases', caseId],
    queryFn: () => officerApi.getCase(caseId!),
    enabled: !!caseId,
  });
}

export function useOfficerCaseHistory(caseId: string | null | undefined) {
  return useQuery({
    queryKey: ['officer', 'cases', caseId, 'history'],
    queryFn: () => officerApi.getCaseHistory(caseId!),
    enabled: !!caseId,
  });
}

// ── Case Actions ─────────────────────────────────────────────

export function useOfficerAssignCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, officerId }: { caseId: string; officerId: string }) =>
      officerApi.assignCase(caseId, officerId),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'cases', caseId] });
      qc.invalidateQueries({ queryKey: ['officer', 'dashboard'] });
    },
  });
}

export function useOfficerReassignCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, officerId, notes }: { caseId: string; officerId: string; notes?: string }) =>
      officerApi.reassignCase(caseId, officerId, notes),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'cases', caseId] });
      qc.invalidateQueries({ queryKey: ['officer', 'dashboard'] });
    },
  });
}

export function useOfficerAcknowledgeCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (caseId: string) => officerApi.acknowledgeCase(caseId),
    onSuccess: (_, caseId) => {
      qc.invalidateQueries({ queryKey: ['officer', 'cases', caseId] });
      qc.invalidateQueries({ queryKey: ['officer', 'dashboard'] });
    },
  });
}

export function useOfficerReviewCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, notes }: { caseId: string; notes?: string }) =>
      officerApi.reviewCase(caseId, notes),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'cases', caseId] });
    },
  });
}

export function useOfficerRequestInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, infoType, notes }: { caseId: string; infoType: string; notes?: string }) =>
      officerApi.requestInfo(caseId, infoType, notes),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'cases', caseId] });
    },
  });
}

export function useOfficerRequestInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, reason }: { caseId: string; reason?: string }) =>
      officerApi.requestInspection(caseId, reason),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'cases', caseId] });
      qc.invalidateQueries({ queryKey: ['officer', 'dashboard'] });
    },
  });
}

export function useOfficerRequestContractorResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, contractorId, deadline }: { caseId: string; contractorId?: string; deadline?: string }) =>
      officerApi.requestContractorResponse(caseId, contractorId, deadline),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'cases', caseId] });
      qc.invalidateQueries({ queryKey: ['officer', 'dashboard'] });
    },
  });
}

export function useOfficerAddEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, evidence }: { caseId: string; evidence: { type: string; title: string; description?: string; url?: string; source: string } }) =>
      officerApi.addEvidence(caseId, evidence),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'cases', caseId] });
      qc.invalidateQueries({ queryKey: ['officer', 'evidence'] });
    },
  });
}

export function useOfficerAddNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, notes }: { caseId: string; notes: string }) =>
      officerApi.addNotes(caseId, notes),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'cases', caseId] });
      qc.invalidateQueries({ queryKey: ['officer', 'cases', caseId, 'history'] });
    },
  });
}

export function useOfficerVerifyCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, verified, notes }: { caseId: string; verified: boolean; notes?: string }) =>
      officerApi.verifyCase(caseId, verified, notes),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'cases', caseId] });
    },
  });
}

export function useOfficerDismissCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, reason }: { caseId: string; reason: string }) =>
      officerApi.dismissCase(caseId, reason),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'cases', caseId] });
      qc.invalidateQueries({ queryKey: ['officer', 'dashboard'] });
    },
  });
}

export function useOfficerResolveCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, resolution }: { caseId: string; resolution: string }) =>
      officerApi.resolveCase(caseId, resolution),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'cases', caseId] });
      qc.invalidateQueries({ queryKey: ['officer', 'dashboard'] });
    },
  });
}

export function useOfficerReopenCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, reason }: { caseId: string; reason: string }) =>
      officerApi.reopenCase(caseId, reason),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'cases', caseId] });
      qc.invalidateQueries({ queryKey: ['officer', 'dashboard'] });
    },
  });
}

export function useOfficerEscalateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, authority, reason }: { caseId: string; authority: string; reason?: string }) =>
      officerApi.escalateCase(caseId, authority, reason),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'cases', caseId] });
      qc.invalidateQueries({ queryKey: ['officer', 'dashboard'] });
    },
  });
}

// ── Evidence ─────────────────────────────────────────────────

export function useOfficerEvidence(filters?: {
  type?: string;
  projectId?: string;
  caseId?: string;
  source?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['officer', 'evidence', filters],
    queryFn: () => officerApi.getEvidence(filters),
  });
}

export function useOfficerEvidenceById(evidenceId: string | null | undefined) {
  return useQuery({
    queryKey: ['officer', 'evidence', evidenceId],
    queryFn: () => officerApi.getEvidenceById(evidenceId!),
    enabled: !!evidenceId,
  });
}

export function useOfficerVerifyEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ evidenceId, verified, notes }: { evidenceId: string; verified: boolean; notes?: string }) =>
      officerApi.verifyEvidence(evidenceId, verified, notes),
    onSuccess: (_, { evidenceId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'evidence'] });
      qc.invalidateQueries({ queryKey: ['officer', 'evidence', evidenceId] });
    },
  });
}

// ── Contractor Responses ──────────────────────────────────────

export function useContractorResponses(filters?: {
  findingId?: string;
  contractorId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['officer', 'contractor-responses', filters],
    queryFn: () => officerApi.getContractorResponses(filters),
  });
}

export function useReviewContractorResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ responseId, status, notes }: { responseId: string; status: 'ACCEPTED' | 'REJECTED' | 'CLARIFICATION_REQUESTED'; notes?: string }) =>
      officerApi.reviewContractorResponse(responseId, status, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['officer', 'contractor-responses'] });
      qc.invalidateQueries({ queryKey: ['officer', 'dashboard'] });
    },
  });
}

// ── Field Inspections ────────────────────────────────────────

export function useFieldInspections(filters?: {
  officerId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['officer', 'field-inspections', filters],
    queryFn: () => officerApi.getFieldInspections(filters),
  });
}

export function useFieldInspection(inspectionId: string | null | undefined) {
  return useQuery({
    queryKey: ['officer', 'field-inspections', inspectionId],
    queryFn: () => officerApi.getFieldInspection(inspectionId!),
    enabled: !!inspectionId,
  });
}

export function useUpdateFieldInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, updates }: { inspectionId: string; updates: { checklist?: FieldInspection['checklist']; notes?: string; photos?: string[]; status?: string } }) =>
      officerApi.updateFieldInspection(inspectionId, updates),
    onSuccess: (_, { inspectionId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'field-inspections', inspectionId] });
      qc.invalidateQueries({ queryKey: ['officer', 'field-inspections'] });
    },
  });
}

export function useSubmitFieldInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, data }: { inspectionId: string; data: { checklist: FieldInspection['checklist']; notes?: string; photos?: string[] } }) =>
      officerApi.submitFieldInspection(inspectionId, data),
    onSuccess: (_, { inspectionId }) => {
      qc.invalidateQueries({ queryKey: ['officer', 'field-inspections', inspectionId] });
      qc.invalidateQueries({ queryKey: ['officer', 'field-inspections'] });
      qc.invalidateQueries({ queryKey: ['officer', 'dashboard'] });
    },
  });
}

// ── Map Data ────────────────────────────────────────────────

export function useOfficerMapLayers(params?: {
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
  return useQuery({
    queryKey: ['officer', 'map', 'layers', params],
    queryFn: () => officerApi.getMapLayers(params),
    staleTime: 60 * 1000, // 1 minute
  });
}
