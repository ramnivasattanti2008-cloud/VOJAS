import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  financialApi,
  type CreateExpenditurePayload,
  type UpdateExpenditurePayload,
  type ExpenditureFilters,
} from "@/services/financial-api";
import type {
  Expenditure,
  PaginatedExpenditures,
  ProjectFinancials,
  SchemeFinancials,
  PaymentStatus,
} from "@/types/financial-types";
import { qk } from "./query-keys";

export function useExpenditures(projectId: string, filters: ExpenditureFilters = {}) {
  return useQuery<PaginatedExpenditures>({
    queryKey: qk.expenditures(projectId, filters),
    queryFn: () => financialApi.list(projectId, filters),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useProjectFinancials(projectId: string) {
  return useQuery<ProjectFinancials>({
    queryKey: qk.projectFinancials(projectId),
    queryFn: () => financialApi.projectFinancials(projectId),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useSchemeFinancials() {
  return useQuery<SchemeFinancials>({
    queryKey: qk.schemeFinancials(),
    queryFn: () => financialApi.schemeFinancials(),
    staleTime: 5 * 60_000,
  });
}

export function useCreateExpenditure(projectId: string) {
  const qc = useQueryClient();
  return useMutation<{ expenditure: Expenditure }, Error, CreateExpenditurePayload>({
    mutationFn: (data) => financialApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financials", "expenditures", projectId] });
      qc.invalidateQueries({ queryKey: qk.projectFinancials(projectId) });
    },
  });
}

export function useUpdateExpenditure(projectId: string) {
  const qc = useQueryClient();
  return useMutation<{ expenditure: Expenditure }, Error, { id: string; data: UpdateExpenditurePayload }>({
    mutationFn: ({ id, data }) => financialApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financials", "expenditures", projectId] });
      qc.invalidateQueries({ queryKey: qk.projectFinancials(projectId) });
    },
  });
}

export function useDeleteExpenditure(projectId: string) {
  const qc = useQueryClient();
  return useMutation<{ message: string }, Error, string>({
    mutationFn: (id) => financialApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financials", "expenditures", projectId] });
      qc.invalidateQueries({ queryKey: qk.projectFinancials(projectId) });
    },
  });
}

export function useTransitionExpenditure(projectId: string) {
  const qc = useQueryClient();
  return useMutation<{ expenditure: Expenditure }, Error, { id: string; status: PaymentStatus }>({
    mutationFn: ({ id, status }) => financialApi.transition(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financials", "expenditures", projectId] });
      qc.invalidateQueries({ queryKey: qk.projectFinancials(projectId) });
    },
  });
}
