'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createContractorApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';

const contractorApi = createContractorApi(apiClient);

// ── Dashboard ──────────────────────────────────────────────────────────────────

export function useContractorDashboard() {
  return useQuery({
    queryKey: ['contractor', 'dashboard'],
    queryFn: () => contractorApi.getDashboard(),
  });
}

// ── Projects ───────────────────────────────────────────────────────────────────

export function useContractorProjects(params?: { search?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['contractor', 'projects', params],
    queryFn: () => contractorApi.getProjects(params),
  });
}

export function useContractorProject(id: string | null | undefined) {
  return useQuery({
    queryKey: ['contractor', 'projects', id],
    queryFn: () => contractorApi.getProject(id!),
    enabled: !!id,
  });
}

// ── Milestones ─────────────────────────────────────────────────────────────────

export function useContractorMilestones(params?: { projectId?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['contractor', 'milestones', params],
    queryFn: () => contractorApi.getMilestones(params),
  });
}

export function useContractorMilestone(id: string | null | undefined) {
  return useQuery({
    queryKey: ['contractor', 'milestones', 'detail', id],
    queryFn: () => contractorApi.getMilestone(id!),
    enabled: !!id,
  });
}

export function useSubmitMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { title: string; description?: string; evidenceUrls?: string[] } }) =>
      contractorApi.submitMilestone(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractor', 'milestones'] });
      qc.invalidateQueries({ queryKey: ['contractor', 'dashboard'] });
    },
  });
}

export function useSubmitCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { correctionNote: string; evidenceUrls?: string[] } }) =>
      contractorApi.submitCorrection(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractor', 'milestones'] });
      qc.invalidateQueries({ queryKey: ['contractor', 'dashboard'] });
    },
  });
}

export function useRequestInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, payload }: { milestoneId: string; payload: { preferredDate?: string; notes?: string } }) =>
      contractorApi.requestInspection(milestoneId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractor', 'milestones'] });
      qc.invalidateQueries({ queryKey: ['contractor', 'inspections'] });
    },
  });
}

// ── Documents ─────────────────────────────────────────────────────────────────

export function useContractorDocuments(params?: { projectId?: string; milestoneId?: string; type?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['contractor', 'documents', params],
    queryFn: () => contractorApi.getDocuments(params),
  });
}

export function useContractorDocument(id: string | null | undefined) {
  return useQuery({
    queryKey: ['contractor', 'documents', 'detail', id],
    queryFn: () => contractorApi.getDocument(id!),
    enabled: !!id,
  });
}

export function useUploadContractorDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      projectId: string;
      milestoneId?: string;
      title: string;
      description?: string;
      type: string;
      fileUrl: string;
    }) => contractorApi.uploadDocument(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractor', 'documents'] });
      qc.invalidateQueries({ queryKey: ['contractor', 'dashboard'] });
    },
  });
}

// ── Payments ──────────────────────────────────────────────────────────────────

export function useContractorPayments(params?: { projectId?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['contractor', 'payments', params],
    queryFn: () => contractorApi.getPayments(params),
  });
}

export function useContractorPayment(id: string | null | undefined) {
  return useQuery({
    queryKey: ['contractor', 'payments', 'detail', id],
    queryFn: () => contractorApi.getPayment(id!),
    enabled: !!id,
  });
}

// ── Issues ────────────────────────────────────────────────────────────────────

export function useContractorIssues(params?: { projectId?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['contractor', 'issues', params],
    queryFn: () => contractorApi.getIssues(params),
  });
}

export function useContractorIssue(id: string | null | undefined) {
  return useQuery({
    queryKey: ['contractor', 'issues', 'detail', id],
    queryFn: () => contractorApi.getIssue(id!),
    enabled: !!id,
  });
}

export function useRespondToIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { response: string; documents?: string[] } }) =>
      contractorApi.respondToIssue(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractor', 'issues'] });
      qc.invalidateQueries({ queryKey: ['contractor', 'dashboard'] });
    },
  });
}

// ── Responses ─────────────────────────────────────────────────────────────────

export function useContractorResponses(params?: { projectId?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['contractor', 'responses', params],
    queryFn: () => contractorApi.getResponses(params),
  });
}

export function useContractorResponse(id: string | null | undefined) {
  return useQuery({
    queryKey: ['contractor', 'responses', 'detail', id],
    queryFn: () => contractorApi.getResponse(id!),
    enabled: !!id,
  });
}

export function useSubmitContractorResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { response: string; documents?: string[]; evidenceUrls?: string[] } }) =>
      contractorApi.submitResponse(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractor', 'responses'] });
      qc.invalidateQueries({ queryKey: ['contractor', 'dashboard'] });
    },
  });
}

// ── Work Diary ────────────────────────────────────────────────────────────────

export function useWorkDiary(projectId: string | null | undefined, params?: { startDate?: string; endDate?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['contractor', 'work-diary', projectId, params],
    queryFn: () => contractorApi.getWorkDiary(projectId!, params),
    enabled: !!projectId,
  });
}

export function useSubmitWorkDiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: {
      date: string;
      workdone: string;
      workersPresent: number;
      materialsUsed?: string;
      equipmentUsed?: string;
      notes?: string;
    } }) => contractorApi.submitWorkDiary(projectId, payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['contractor', 'work-diary', variables.projectId] });
    },
  });
}

// ── Inspections ───────────────────────────────────────────────────────────────

export function useContractorInspections(params?: { projectId?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['contractor', 'inspections', params],
    queryFn: () => contractorApi.getInspections(params),
  });
}
