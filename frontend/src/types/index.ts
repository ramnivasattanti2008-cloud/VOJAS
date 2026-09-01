// Shared types for VOJAS frontend

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
  meta: {
    timestamp: string;
  };
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  environment: string;
  uptime: number;
  database: string;
  timestamp: string;
}

export type UserRole = "ADMIN" | "OFFICER" | "REVIEWER" | "ANALYST" | "VIEWER" | "MP";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type NavItem = {
  label: string;
  path: string;
  icon: string;
  badge?: number;
};

// ── Project Types ──────────────────────────────────────────────────────────────

export type ProjectStatus =
  | "PROPOSED"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "VERIFIED"
  | "CANCELLED";

export type ProjectSector =
  | "PUBLIC_INFRASTRUCTURE"
  | "WATER_SANITATION"
  | "EDUCATION"
  | "HEALTH"
  | "AGRICULTURE"
  | "ENVIRONMENT"
  | "TRANSPORT"
  | "ENERGY"
  | "HOUSING"
  | "RURAL_DEVELOPMENT"
  | "SOCIAL_WELFARE"
  | "PUBLIC_ADMIN"
  | "FINANCE_PROCUREMENT"
  | "JUSTICE"
  | "LEGISLATIVE"
  | "PUBLIC_SAFETY";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  sector: ProjectSector;
  district: string;
  constituency: string | null;
  state: string;
  approvedAmount: number;
  spentAmount: number;
  contractor: string | null;
  startDate: string | null;
  expectedEndDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  // Open data fields
  mpId?: string | null;
  mpName?: string | null;
  house?: string | null;
  term?: string | null;
  implementingAgency?: string | null;
  recommendedDate?: string | null;
  source?: string | null;
  sourceWorkId?: string | null;
  // Relations
  mp?: MP | null;
  locations?: Location[];
  reports?: any[];
  expenditures?: any[];
  anomalies?: any[];
  risk?: any;
  documents?: any[];
}

export interface PaginatedProjects {
  items: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProjectStats {
  total: number;
  byStatus: Record<string, number>;
  bySector: Record<string, number>;
  totalBudget: number;
  totalSpent: number;
}

// ── Expenditure & Budget Types (re-exported from financial-types) ───────────────
export * from "./financial-types";

// ── Location Types ───────────────────────────────────────────────────────────

export interface Location {
  id: string;
  projectId: string;
  latitude: number;
  longitude: number;
  label: string | null;
  address: string | null;
  landmark: string | null;
  isPrimary: boolean;
  verified: boolean;
  verifiedById: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    district: string;
    state: string;
    status: ProjectStatus;
    sector: ProjectSector;
  } | null;
}

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  label: string | null;
  isPrimary: boolean;
  verified: boolean;
  project: {
    id: string;
    name: string;
    status: ProjectStatus;
    district: string;
    state: string;
    sector: ProjectSector;
    approvedAmount: number;
    startDate: string | null;
    expectedEndDate: string | null;
  };
}

export interface MapOverview {
  total: number;
  stateCounts?: Record<string, number>;
  /** Keyed by canonical "STATE|DISTRICT" (uppercased) — see locationService.ts */
  districtCounts?: Record<string, number>;
  markers: MapMarker[];
}

// ── Sector & Status Helpers ─────────────────────────────────────────────────

export const PROJECT_SECTORS: { value: ProjectSector; label: string }[] = [
  { value: "PUBLIC_INFRASTRUCTURE", label: "Public Infrastructure" },
  { value: "WATER_SANITATION", label: "Water & Sanitation" },
  { value: "EDUCATION", label: "Education" },
  { value: "HEALTH", label: "Health" },
  { value: "AGRICULTURE", label: "Agriculture" },
  { value: "ENVIRONMENT", label: "Environment" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "ENERGY", label: "Energy" },
  { value: "HOUSING", label: "Housing" },
  { value: "RURAL_DEVELOPMENT", label: "Rural Development" },
  { value: "SOCIAL_WELFARE", label: "Social Welfare" },
  { value: "PUBLIC_ADMIN", label: "Public Admin" },
  { value: "FINANCE_PROCUREMENT", label: "Finance & Procurement" },
  { value: "JUSTICE", label: "Justice" },
  { value: "LEGISLATIVE", label: "Legislative" },
  { value: "PUBLIC_SAFETY", label: "Public Safety" },
];

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "PROPOSED", label: "Proposed" },
  { value: "APPROVED", label: "Approved" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "VERIFIED", label: "Verified" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string; dot: string }> = {
  PROPOSED:     { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-400" },
  APPROVED:     { bg: "bg-blue-500/10",  text: "text-blue-400",  dot: "bg-blue-400" },
  IN_PROGRESS:  { bg: "bg-saffron-500/10", text: "text-saffron-400", dot: "bg-saffron-400" },
  COMPLETED:    { bg: "bg-green-500/10", text: "text-green-400", dot: "bg-green-400" },
  VERIFIED:     { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  CANCELLED:    { bg: "bg-red-500/10",   text: "text-red-400",   dot: "bg-red-400" },
};

export const SECTOR_COLORS: Record<ProjectSector, string> = {
  PUBLIC_INFRASTRUCTURE: "bg-purple-500/10 text-purple-400",
  WATER_SANITATION:     "bg-cyan-500/10 text-cyan-400",
  EDUCATION:             "bg-amber-500/10 text-amber-400",
  HEALTH:                "bg-rose-500/10 text-rose-400",
  AGRICULTURE:           "bg-green-500/10 text-green-400",
  ENVIRONMENT:           "bg-teal-500/10 text-teal-400",
  TRANSPORT:             "bg-orange-500/10 text-orange-400",
  ENERGY:                "bg-yellow-500/10 text-yellow-400",
  HOUSING:               "bg-indigo-500/10 text-indigo-400",
  RURAL_DEVELOPMENT:     "bg-lime-500/10 text-lime-400",
  SOCIAL_WELFARE:        "bg-pink-500/10 text-pink-400",
  PUBLIC_ADMIN:          "bg-slate-500/10 text-slate-400",
  FINANCE_PROCUREMENT:   "bg-amber-500/10 text-amber-400",
  JUSTICE:               "bg-violet-500/10 text-violet-400",
  LEGISLATIVE:           "bg-fuchsia-500/10 text-fuchsia-400",
  PUBLIC_SAFETY:         "bg-red-500/10 text-red-400",
};

// ── Anomaly Types ─────────────────────────────────────────────────────────────

export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AnomalyStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "UNDER_INVESTIGATION"
  | "RESOLVED"
  | "ESCALATED"
  | "DISMISSED";
export type AnomalyCategory =
  | "DUPLICATE"
  | "COST_OUTLIER"
  | "TIMELINE"
  | "BUDGET_OVERRUN"
  | "STALLED"
  | "GEOGRAPHIC"
  | "COMPLIANCE"
  | "FINANCIAL";

export interface Anomaly {
  id: string;
  title: string;
  description: string;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  riskScore: number;
  status: AnomalyStatus;
  ruleCode: string | null;
  evidence: string | null;
  projectId: string | null;
  reportId: string | null;
  acknowledgedById: string | null;
  acknowledgedAt: string | null;
  resolvedById: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  // Phase 11 — AI explanation
  aiExplanation: string | null;
  aiConfidence: number | null;
  project?: {
    id: string;
    name: string;
    district: string;
    state: string;
    status: ProjectStatus;
    sector: ProjectSector;
  } | null;
  acknowledgedBy?: { id: string; name: string } | null;
  resolvedBy?: { id: string; name: string } | null;
}

export interface AnomalyRule {
  id: string;
  code: string;
  name: string;
  description: string;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  enabled: boolean;
  priority: number;
  lastRun: string | null;
  matchCount: number;
}

export interface AnomalyStats {
  total: number;
  open: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byCategory: { category: AnomalyCategory; _count: { id: number } }[];
}

// ── Anomaly Helpers ───────────────────────────────────────────────────────────

export const ANOMALY_CATEGORIES: { value: AnomalyCategory; label: string; color: string }[] = [
  { value: "DUPLICATE", label: "Duplicate Project", color: "text-purple-400" },
  { value: "COST_OUTLIER", label: "Cost Outlier", color: "text-amber-400" },
  { value: "TIMELINE", label: "Timeline Anomaly", color: "text-orange-400" },
  { value: "BUDGET_OVERRUN", label: "Budget Overrun", color: "text-red-400" },
  { value: "STALLED", label: "Stalled Project", color: "text-yellow-400" },
  { value: "GEOGRAPHIC", label: "Geographic", color: "text-cyan-400" },
  { value: "COMPLIANCE", label: "Compliance", color: "text-slate-400" },
  { value: "FINANCIAL", label: "Financial", color: "text-green-400" },
];

export const ANOMALY_STATUSES: { value: AnomalyStatus; label: string; color: string }[] = [
  { value: "OPEN", label: "Open", color: "text-slate-400" },
  { value: "ACKNOWLEDGED", label: "Acknowledged", color: "text-blue-400" },
  { value: "UNDER_INVESTIGATION", label: "Under Investigation", color: "text-saffron-400" },
  { value: "RESOLVED", label: "Resolved", color: "text-green-400" },
  { value: "ESCALATED", label: "Escalated", color: "text-red-400" },
  { value: "DISMISSED", label: "Dismissed", color: "text-slate-500" },
];

export const SEVERITY_COLORS: Record<AnomalySeverity, { bg: string; text: string; dot: string }> = {
  LOW:      { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-400" },
  MEDIUM:   { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-400" },
  HIGH:     { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400" },
  CRITICAL: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
};

export function getSeverityLabel(v: AnomalySeverity): string {
  return v;
}

export function getAnomalyCategoryLabel(v: AnomalyCategory): string {
  return ANOMALY_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

export function getStatusLabel(v: AnomalyStatus): string {
  return ANOMALY_STATUSES.find((s) => s.value === v)?.label ?? v;
}

export function getRiskLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Critical", color: "text-red-400" };
  if (score >= 60) return { label: "High", color: "text-orange-400" };
  if (score >= 40) return { label: "Medium", color: "text-yellow-400" };
  return { label: "Low", color: "text-slate-400" };
}

export interface AIExplanation {
  explanation: string;
  confidence: number;
  contributingFactors: { factor: string; weight: number }[];
  recommendation: string;
}

// ── Open-Data Types (Vonter / dataful / opencity / LGD) ─────────────────────

export type House = "LOK_SABHA" | "RAJYA_SABHA";
export type LokSabhaTerm = "FIFTEENTH" | "SIXTEENTH" | "SEVENTEENTH" | "EIGHTEENTH";
export type IdaApproval = "PENDING" | "APPROVED" | "REJECTED";

/** MP master record — sourced from MPLADS portal / open data */
export interface MP {
  id: string;
  name: string;
  house: House;
  state: string;
  constituency: string;
  term: LokSabhaTerm;
  termStart: string | null;
  termEnd: string | null;
  party: string | null;
  attendance: string | null;
  lgdCode: string | null;
  // MPLADS spending (OpenCity.in data, in Crore)
  mpladEntitlement: number | null;
  mpladFundReceived: number | null;
  mpladWorksCost: number | null;
  mpladExpenditure: number | null;
  mpladUtilization: number | null;
  mpladUnspentBalance: number | null;
  createdAt: string;
  updatedAt: string;
  projects?: Project[];
  stats?: MPStats;
}

export interface MPStats {
  totalProjects: number;
  totalApproved: number;
  totalSpent: number;
  utilization: number;
  anomalyCount: number;
  byStatus: Record<string, number>;
  bySector: Record<string, number>;
  byState: Record<string, number>;
}

/** Vendor master — deduplicated across all MPLADS data sources */
export interface Vendor {
  id: string;
  name: string;
  nameNormalized: string;
  udyamRegNo: string | null;
  district: string | null;
  state: string | null;
  totalPaid: number;
  projectCount: number;
  constituencyCount: number;
  createdAt: string;
  updatedAt: string;
}

/** LGD master reference — canonical Indian administrative geography */
export interface LGDLocation {
  id: string;
  lgdCode: string;
  entityType: "STATE" | "DISTRICT" | "BLOCK" | "VILLAGE" | "GP" | "ULB";
  name: string;
  nameCanonical: string;
  parentCode: string | null;
  stateName: string | null;
  districtName: string | null;
  blockName: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

// ── Extended Project (with open-data fields) ─────────────────────────────────

export type ProjectOpenDataSource =
  | "MPLADS_PORTAL"
  | "VONTER"
  | "DATAFUL"
  | "OPENCITY"
  | "MANUAL";

export interface ProjectOpenDataFields {
  mpId: string | null;
  mpName: string | null;
  house: House | null;
  term: LokSabhaTerm | null;
  implementingAgency: string | null;
  idaApproval: IdaApproval | null;
  recommendedDate: string | null;
  lgdDistrictCode: string | null;
  lgdStateCode: string | null;
  source: ProjectOpenDataSource | null;
  sourceWorkId: string | null;
  sourceRef: string | null; // JSON string
}

/** Full Project type — includes open-data fields */
export type FullProject = Project & Partial<ProjectOpenDataFields>;

/** Paginated MP list */
export interface PaginatedMPs {
  items: MP[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Paginated Vendor list */
export interface PaginatedVendors {
  items: Vendor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const HOUSE_LABELS: Record<House, string> = {
  LOK_SABHA: "Lok Sabha",
  RAJYA_SABHA: "Rajya Sabha",
};

export const TERM_LABELS: Record<LokSabhaTerm, string> = {
  FIFTEENTH: "15th Lok Sabha (2009–2014)",
  SIXTEENTH: "16th Lok Sabha (2014–2019)",
  SEVENTEENTH: "17th Lok Sabha (2019–2024)",
  EIGHTEENTH: "18th Lok Sabha (2024–2029)",
};

export const IDA_APPROVAL_LABELS: Record<IdaApproval, string> = {
  PENDING: "Action Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function getTermLabel(term: LokSabhaTerm): string {
  return TERM_LABELS[term] ?? term;
}

export function getHouseLabel(house: House): string {
  return HOUSE_LABELS[house] ?? house;
}
