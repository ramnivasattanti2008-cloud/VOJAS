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

export type UserRole = "ADMIN" | "OFFICER" | "REVIEWER" | "ANALYST" | "VIEWER";

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
