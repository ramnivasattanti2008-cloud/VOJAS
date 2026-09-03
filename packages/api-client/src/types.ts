// Core types matching Prisma schema + API responses

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ── Anomalies ──────────────────────────────────────────────

export type Anomaly = {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  riskScore: number;
  status: string;
  ruleCode?: string;
  projectId?: string;
  reportId?: string;
  evidence?: unknown;
  acknowledgedById?: string;
  acknowledgedAt?: string;
  resolvedById?: string;
  resolvedAt?: string;
  resolution?: string;
  lawEscalation: boolean;
  lawAuthority?: string;
  lawReferenceNo?: string;
  lawEscalatedAt?: string;
  lawAcknowledged: boolean;
  aiExplanation?: string;
  aiConfidence?: number;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; state: string; district: string };
};

export type AnomalyStats = {
  byStatus: Array<{ status: string; _count: { _all: number } }>;
  bySeverity: Array<{ severity: string; _count: { _all: number } }>;
  byCategory: Array<{ category: string; _count: { _all: number } }>;
  last7Days: number;
};

// ── Reports ────────────────────────────────────────────────

export type Report = {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  isAnonymous: boolean;
  locationDesc?: string;
  latitude?: number;
  longitude?: number;
  projectId?: string;
  assignedToId?: string;
  resolution?: string;
  resolvedAt?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; state: string; district: string };
  assignedTo?: { id: string; name: string; email: string };
};

// ── Vendors ────────────────────────────────────────────────

export type Vendor = {
  id: string;
  name: string;
  nameNormalized: string;
  udyamRegNo?: string;
  pan?: string;
  gstin?: string;
  district?: string;
  state?: string;
  totalContracts: number;
  totalValue: number;
  flagged: boolean;
  status: string;
  riskScore: number;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
};

// ── Notifications ─────────────────────────────────────────

export type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  resource?: string;
  resourceId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
};

export type NotificationCount = {
  unreadCount: number;
};

// ── MPs ────────────────────────────────────────────────────

export type MP = {
  id: string;
  name: string;
  house: string;
  constituency: string;
  state: string;
  party?: string;
  email?: string;
  phone?: string;
  createdAt: string;
};

// ── Documents ──────────────────────────────────────────────

export type Document = {
  id: string;
  projectId: string;
  type: string;
  title: string;
  description?: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  verified: boolean;
  verifiedAt?: string;
  createdAt: string;
  project?: { id: string; name: string };
  uploadedBy?: { id: string; name: string; email: string };
};

// ── Risk ──────────────────────────────────────────────────

export type ProjectRisk = {
  id: string;
  projectId: string;
  riskLevel: string;
  riskScore: number;
  financialScore: number;
  anomalyScore: number;
  reportScore: number;
  satelliteScore: number;
  primaryDriver?: string;
  drivers?: unknown;
  computedAt: string;
};

export type RiskDashboard = {
  byLevel: Array<{ riskLevel: string; _count: { _all: number } }>;
  bySeverity: Array<{ severity: string; _count: { _all: number } }>;
  topRiskProjects: Array<{
    riskLevel: string;
    riskScore: number;
    project: { id: string; name: string; state: string; district: string };
  }>;
};
