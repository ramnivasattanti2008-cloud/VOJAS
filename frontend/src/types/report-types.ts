// ── Report Types ────────────────────────────────────────────────────────────────

export type ReportStatus =
  | "SUBMITTED"
  | "ACKNOWLEDGED"
  | "UNDER_REVIEW"
  | "RESOLVED"
  | "REJECTED"
  | "CLOSED";

export type ReportCategory =
  | "QUALITY"
  | "DELAY"
  | "CORRUPTION"
  | "SAFETY"
  | "ENVIRONMENT"
  | "FINANCIAL"
  | "DOCUMENTATION"
  | "OTHER";

export type ReportSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Reporter {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  isAnonymous: boolean;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  severity: ReportSeverity;
  status: ReportStatus;
  /**
   * Reporter PII fields are REDACTED by the backend for any requester
   * whose role is not ADMIN. Expect the literal string "[REDACTED]" or null.
   * Use `hasReporterContact` to know whether the reporter self-identified.
   * Original data is only accessible via the audit-only /reports/:id/original
   * endpoint (ADMIN/REVIEWER + investigation context).
   */
  reporterName: string | null;
  reporterEmail: string | null;
  reporterPhone: string | null;
  hasReporterContact?: boolean;
  isAnonymous: boolean;
  locationDesc: string | null;
  latitude: number | null;
  longitude: number | null;
  projectId: string | null;
  assignedToId: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  // Phase 11 — AI analysis on submission
  aiAnalysis?: string | null;
  aiAnalyzedAt?: string | null;
  project?: {
    id: string;
    name: string;
    district: string;
    state: string;
    status: string;
    sector: string;
  } | null;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  statusLogs?: ReportStatusLog[];
  attachments?: ReportAttachment[];
  _count?: {
    statusLogs: number;
    attachments: number;
  };
}

export interface ReportStatusLog {
  id: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  changedById: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ReportAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface PaginatedReports {
  items: Report[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReportStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  unassigned: number;
  criticalOpen: number;
  last7Days: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const REPORT_STATUSES: { value: ReportStatus; label: string; description: string }[] = [
  { value: "SUBMITTED",    label: "Submitted",    description: "Report received, pending acknowledgment" },
  { value: "ACKNOWLEDGED", label: "Acknowledged", description: "Report acknowledged by officer" },
  { value: "UNDER_REVIEW",  label: "Under Review", description: "Investigation in progress" },
  { value: "RESOLVED",      label: "Resolved",    description: "Issue addressed and resolved" },
  { value: "REJECTED",      label: "Rejected",    description: "Report found invalid or out of scope" },
  { value: "CLOSED",        label: "Closed",      description: "Case closed" },
];

export const REPORT_CATEGORIES: { value: ReportCategory; label: string; description: string }[] = [
  { value: "QUALITY",       label: "Quality",           description: "Poor workmanship, substandard materials" },
  { value: "DELAY",         label: "Delay",             description: "Project delays, timeline violations" },
  { value: "CORRUPTION",    label: "Corruption",        description: "Fraud, embezzlement, bribery indicators" },
  { value: "SAFETY",        label: "Safety",            description: "Safety violations, hazardous conditions" },
  { value: "ENVIRONMENT",   label: "Environment",       description: "Environmental damage, illegal disposal" },
  { value: "FINANCIAL",     label: "Financial",         description: "Financial irregularities, over-pricing" },
  { value: "DOCUMENTATION", label: "Documentation",     description: "Fake or forged documents" },
  { value: "OTHER",         label: "Other",             description: "Issues not covered by other categories" },
];

export const REPORT_SEVERITIES: { value: ReportSeverity; label: string; color: string; bg: string; dot: string }[] = [
  { value: "LOW",      label: "Low",      color: "text-slate-400", bg: "bg-slate-500/10", dot: "bg-slate-400" },
  { value: "MEDIUM",   label: "Medium",   color: "text-saffron-400", bg: "bg-saffron-500/10", dot: "bg-saffron-400" },
  { value: "HIGH",     label: "High",     color: "text-orange-400", bg: "bg-orange-500/10", dot: "bg-orange-400" },
  { value: "CRITICAL", label: "Critical", color: "text-red-400",   bg: "bg-red-500/10",   dot: "bg-red-400" },
];

export const REPORT_STATUS_COLORS: Record<ReportStatus, { bg: string; text: string; dot: string }> = {
  SUBMITTED:    { bg: "bg-slate-500/10",   text: "text-slate-400",   dot: "bg-slate-400" },
  ACKNOWLEDGED: { bg: "bg-blue-500/10",   text: "text-blue-400",    dot: "bg-blue-400" },
  UNDER_REVIEW:  { bg: "bg-saffron-500/10",text: "text-saffron-400", dot: "bg-saffron-400" },
  RESOLVED:     { bg: "bg-green-500/10",   text: "text-green-400",   dot: "bg-green-400" },
  REJECTED:     { bg: "bg-red-500/10",    text: "text-red-400",     dot: "bg-red-400" },
  CLOSED:       { bg: "bg-slate-700/10",  text: "text-slate-500",   dot: "bg-slate-500" },
};

export const REPORT_CATEGORY_COLORS: Record<ReportCategory, string> = {
  QUALITY:       "bg-purple-500/10 text-purple-400",
  DELAY:         "bg-amber-500/10 text-amber-400",
  CORRUPTION:    "bg-red-500/10 text-red-400",
  SAFETY:        "bg-orange-500/10 text-orange-400",
  ENVIRONMENT:   "bg-teal-500/10 text-teal-400",
  FINANCIAL:     "bg-yellow-500/10 text-yellow-400",
  DOCUMENTATION: "bg-cyan-500/10 text-cyan-400",
  OTHER:         "bg-slate-500/10 text-slate-400",
};

export const STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  SUBMITTED:    ["ACKNOWLEDGED", "UNDER_REVIEW", "REJECTED", "CLOSED"],
  ACKNOWLEDGED: ["UNDER_REVIEW", "REJECTED", "CLOSED"],
  UNDER_REVIEW: ["RESOLVED", "REJECTED", "CLOSED"],
  RESOLVED:     ["CLOSED", "UNDER_REVIEW"],
  REJECTED:     ["CLOSED"],
  CLOSED:       [],
};
