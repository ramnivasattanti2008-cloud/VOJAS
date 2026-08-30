import { api, ApiError } from "./api";
import type {
  Expenditure,
  PaginatedExpenditures,
  ProjectFinancials,
  SchemeFinancials,
  ExpenditureCategory,
  PaymentStatus,
} from "@/types/financial-types";

export interface CreateExpenditurePayload {
  projectId: string;
  amount: number;
  category: ExpenditureCategory;
  description: string;
  vendor?: string;
  invoiceNo?: string;
  paidOn?: string;
  notes?: string;
}

export interface UpdateExpenditurePayload {
  amount?: number;
  category?: ExpenditureCategory;
  description?: string;
  vendor?: string;
  invoiceNo?: string;
  paidOn?: string;
  status?: PaymentStatus;
  notes?: string;
}

export interface ExpenditureFilters {
  category?: ExpenditureCategory;
  status?: PaymentStatus;
  page?: number;
  limit?: number;
}

export const financialApi = {
  // ── Per-project listing ────────────────────────────────────────────────
  list: (projectId: string, filters?: ExpenditureFilters) =>
    api.get<PaginatedExpenditures>(
      `/projects/${projectId}/expenditures${buildQuery(filters)}`
    ),

  // ── Per-expenditure operations ─────────────────────────────────────────
  get: (id: string) =>
    api.get<{ expenditure: Expenditure }>(`/financials/${id}`),

  create: (data: CreateExpenditurePayload) =>
    api.post<{ expenditure: Expenditure }>("/financials", data),

  update: (id: string, data: UpdateExpenditurePayload) =>
    api.put<{ expenditure: Expenditure }>(`/financials/${id}`, data),

  remove: (id: string) =>
    api.delete<{ message: string }>(`/financials/${id}`),

  transition: (id: string, status: PaymentStatus) =>
    api.post<{ expenditure: Expenditure }>(`/financials/${id}/transition`, { status }),

  // ── Financial aggregations ─────────────────────────────────────────────
  projectFinancials: (projectId: string) =>
    api.get<ProjectFinancials>(`/projects/${projectId}/expenditures/financials`),

  schemeFinancials: () =>
    api.get<SchemeFinancials>("/financials/stats"),
};

function buildQuery(filters?: ExpenditureFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.status)   params.set("status",   filters.status);
  if (filters.page)     params.set("page",     String(filters.page));
  if (filters.limit)    params.set("limit",    String(filters.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export { ApiError };
