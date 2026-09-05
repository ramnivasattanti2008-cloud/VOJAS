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

// ── Risk (M8) ─────────────────────────────────────────────

export type RiskSignal = {
  id: string;
  projectId: string;
  signalType: string;
  sourceType: string;
  sourceId?: string;
  detectedAt: string;
  observationDate?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  value?: number;
  expectedValue?: number;
  deviation?: number;
  explanation?: string;
  evidenceReferences?: string[];
  algorithmVersion: string;
};

export type RiskFinding = {
  id: string;
  projectId: string;
  type: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'NEW' | 'ACKNOWLEDGED' | 'UNDER_REVIEW' | 'VERIFICATION_REQUIRED' | 'RESOLVED' | 'DISMISSED' | 'ESCALATED';
  recommendedAction?: string;
  limitations?: string;
  signalIds?: string[];
  algorithmVersion: string;
  firstObservedAt?: string;
  lastObservedAt?: string;
  detectedAt: string;
  acknowledgedById?: string;
  acknowledgedAt?: string;
  resolvedById?: string;
  resolvedAt?: string;
  resolution?: string;
  project?: { id: string; name: string; state: string; district: string };
};

export type RiskEvent = {
  id: string;
  projectId: string;
  eventType: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore?: number;
  findingId?: string;
  createdAt: string;
};

export type ProjectRiskSummary = {
  projectId: string;
  project: { name: string; sector: string; status: string; approvedAmount: number; spentAmount: number };
  risk: {
    score: number;
    level: string;
    confidence: string;
    primaryDriver?: string;
    signalsCount: number;
    findingsCount: number;
    sourceDiversity: number;
    computedAt: string;
    algorithmVersion: string;
  } | null;
  signals: {
    total: number;
    byType: Record<string, number>;
    recent: RiskSignal[];
  };
  findings: {
    total: number;
    bySeverity: Record<string, number>;
    active: number;
    recent: RiskFinding[];
  };
  events: RiskEvent[];
};

export type RiskAnalysisResult = {
  projectId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'INSUFFICIENT_DATA';
  riskScore: number;
  riskLevel: string;
  confidence: string;
  signalsCount: number;
  findingsCount: number;
  sourceDiversity: number;
  methodology: string;
  dataQuality: {
    sourcesAvailable: boolean;
    sourceCount: number;
    completenessScore: number;
    overallPass: boolean;
    reasons: string[];
  };
  computedAt: string;
  processingTimeMs: number;
  algorithmVersion: string;
};

export type NationalRiskSummary = {
  totalProjects: number;
  totalFindings: number;
  riskDistribution: Record<string, number>;
  highRiskProjects: number;
  delayedProjects: number;
  unresolvedFindings: number;
  averageRiskScore: number;
};

export type RiskTrend = {
  date: string;
  newFindings: number;
  resolvedFindings: number;
  averageRiskScore: number;
  highRiskProjects: number;
};

export type RiskHotspot = {
  latitude: number;
  longitude: number;
  projectCount: number;
  findingsCount: number;
  averageRiskScore: number;
  district: string;
  state: string;
};

export type RiskRule = {
  id: string;
  name: string;
  category: string;
  version: string;
  status: string;
  enabled: boolean;
  lastRun?: string;
  matchCount: number;
};
