// ── Expenditure Types ─────────────────────────────────────────────────────────

export type ExpenditureCategory =
  | "MATERIAL"
  | "LABOR"
  | "EQUIPMENT"
  | "CONSULTANCY"
  | "ADMINISTRATIVE"
  | "CONTINGENCY"
  | "OTHER";

export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "REJECTED"
  | "REVERSED";

export interface Expenditure {
  id: string;
  projectId: string;
  amount: number;
  category: ExpenditureCategory;
  description: string;
  vendor: string | null;
  invoiceNo: string | null;
  paidOn: string | null;
  status: PaymentStatus;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string; email: string } | null;
  project?: { id: string; name: string; district: string; state: string; approvedAmount: number; spentAmount: number } | null;
}

export interface PaginatedExpenditures {
  items: Expenditure[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Financial Overview ────────────────────────────────────────────────────────

export interface CategoryBreakdown {
  category: ExpenditureCategory;
  count: number;
  total: number;
}

export interface StatusBreakdown {
  status: PaymentStatus;
  count: number;
  total: number;
}

export interface ProjectFinancials {
  project: {
    id: string;
    name: string;
    approvedAmount: number;
    spentAmount: number;
  };
  approved: number;
  spent: number;
  authorized: number;
  pending: number;
  committed: number;
  remaining: number;
  utilization: number;   // percentage
  overrun: boolean;
  count: number;
  byCategory: Record<string, { count: number; total: number }>;
  byStatus: Record<string, { count: number; total: number }>;
}

export interface ProjectBreakdown {
  projectId: string;
  name: string;
  district: string;
  state: string;
  status: string;
  approved: number;
  spent: number;
  committed: number;
  remaining: number;
  utilization: number;
  expenditureCount: number;
}

export interface SchemeFinancials {
  projectCount: number;
  totalBudget: number;
  totalRecordedSpent: number;
  totalSpent: number;
  totalAuthorized: number;
  totalPending: number;
  committed: number;
  remaining: number;
  utilization: number;
  expenditureCount: number;
  byCategory: CategoryBreakdown[];
  byStatus: StatusBreakdown[];
  topProjects: ProjectBreakdown[];
}

// ── UI Helpers ────────────────────────────────────────────────────────────────

export const EXPENDITURE_CATEGORIES: { value: ExpenditureCategory; label: string }[] = [
  { value: "MATERIAL",       label: "Material" },
  { value: "LABOR",          label: "Labor" },
  { value: "EQUIPMENT",      label: "Equipment" },
  { value: "CONSULTANCY",    label: "Consultancy" },
  { value: "ADMINISTRATIVE", label: "Administrative" },
  { value: "CONTINGENCY",    label: "Contingency" },
  { value: "OTHER",          label: "Other" },
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string; bg: string; text: string; dot: string }[] = [
  { value: "PENDING",    label: "Pending",    bg: "bg-saffron-500/10", text: "text-saffron-400", dot: "bg-saffron-400" },
  { value: "AUTHORIZED", label: "Authorized",  bg: "bg-blue-500/10",   text: "text-blue-400",   dot: "bg-blue-400" },
  { value: "PAID",      label: "Paid",        bg: "bg-green-500/10",  text: "text-green-400",  dot: "bg-green-400" },
  { value: "REJECTED",  label: "Rejected",   bg: "bg-red-500/10",    text: "text-red-400",    dot: "bg-red-400" },
  { value: "REVERSED",  label: "Reversed",   bg: "bg-slate-500/10",  text: "text-slate-400",  dot: "bg-slate-400" },
];

export const CATEGORY_COLORS: Record<ExpenditureCategory, string> = {
  MATERIAL:       "bg-cyan-500/10 text-cyan-400",
  LABOR:          "bg-amber-500/10 text-amber-400",
  EQUIPMENT:      "bg-purple-500/10 text-purple-400",
  CONSULTANCY:    "bg-blue-500/10 text-blue-400",
  ADMINISTRATIVE: "bg-slate-500/10 text-slate-400",
  CONTINGENCY:    "bg-saffron-500/10 text-saffron-400",
  OTHER:          "bg-green-500/10 text-green-400",
};

export const STATUS_COLORS: Record<PaymentStatus, { bg: string; text: string; dot: string }> = {
  PENDING:    { bg: "bg-saffron-500/10", text: "text-saffron-400", dot: "bg-saffron-400" },
  AUTHORIZED: { bg: "bg-blue-500/10",   text: "text-blue-400",   dot: "bg-blue-400" },
  PAID:       { bg: "bg-green-500/10",  text: "text-green-400",  dot: "bg-green-400" },
  REJECTED:   { bg: "bg-red-500/10",   text: "text-red-400",   dot: "bg-red-400" },
  REVERSED:   { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-400" },
};

export function getCategoryLabel(v: ExpenditureCategory): string {
  return EXPENDITURE_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

export function getStatusLabel(v: PaymentStatus): string {
  return PAYMENT_STATUSES.find((s) => s.value === v)?.label ?? v;
}

export function getCategoryStyle(v: ExpenditureCategory): string {
  return CATEGORY_COLORS[v] ?? "bg-slate-500/10 text-slate-400";
}

export function getPaymentStatusStyle(v: PaymentStatus): string {
  const s = STATUS_COLORS[v];
  if (!s) return "bg-slate-500/10 text-slate-400 border border-slate-500/30";
  return `${s.bg} ${s.text} border border-slate-500/30`;
}

export function getPaymentStatusLabel(v: PaymentStatus): string {
  return getStatusLabel(v);
}
