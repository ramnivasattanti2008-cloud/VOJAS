// Extended types for Phase 16+ VOJAS features
// Phase 16: Public Asset Health
export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  district: string;
  state: string;
  latitude?: number;
  longitude?: number;
  healthScore: number;
  lastInspectionDate?: Date;
  photos?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type AssetType = "ROAD" | "BRIDGE" | "BUILDING" | "DRAINAGE" | "WATER_SUPPLY" | "ELECTRICITY" | "OTHER";
export type AssetStatus = "HEALTHY" | "FAIR" | "POOR" | "CRITICAL" | "UNDER_REPAIR";

// Phase 17: Development Requests
export interface DevelopmentRequest {
  id: string;
  title: string;
  description: string;
  sector: string;
  requestType: string;
  district: string;
  state: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  status: DevelopmentRequestStatus;
  priority: number;
  submittedBy?: string;
  submittedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  supportCount?: number;
}

export type DevelopmentRequestStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "IMPLEMENTED";

export interface DevelopmentPriority {
  id: string;
  district: string;
  state: string;
  sector: string;
  score: number;
  factors: string;
  computedAt: Date;
}

// Phase 20: Field Inspections
export interface FieldInspection {
  id: string;
  projectId?: string;
  assetId?: string;
  inspectorId: string;
  inspectorName: string;
  status: InspectionStatus;
  scheduledDate: Date;
  completedDate?: Date;
  result?: InspectionResult;
  checklist?: Record<string, boolean>;
  photos?: string[];
  notes?: string;
  evidenceUrls?: string[];
  createdAt: Date;
}

export type InspectionStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type InspectionResult = "PASSED" | "FAILED" | "PARTIAL" | "DEFERRED";

// Phase 21: Case Management
export interface Case {
  id: string;
  title: string;
  description: string;
  type: CaseType;
  priority: CasePriority;
  status: CaseStatus;
  district: string;
  state: string;
  projectId?: string;
  assignedTo?: string;
  reporterId?: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

export type CaseType = "FRAUD" | "NEGLIGENCE" | "CORRUPTION" | "SAFETY" | "ENVIRONMENTAL" | "FINANCIAL" | "OTHER";
export type CaseStatus = "OPEN" | "INVESTIGATING" | "ESCALATED" | "CLOSED" | "REOPENED";
export type CasePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface CaseStatusLog {
  id: string;
  caseId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  note?: string;
  changedAt: Date;
}

// Phase 27-35: Contractor Portal
export interface ContractorProfile {
  id: string;
  userId: string;
  companyName: string;
  registrationNo?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  specialization?: string[];
  completedProjects: number;
  activeProjects: number;
  rating: number;
  createdAt: Date;
}

export interface ContractorProject {
  id: string;
  contractorId: string;
  projectId: string;
  contractNo?: string;
  contractAmount?: number;
  startDate?: Date;
  endDate?: Date;
  status: ContractorProjectStatus;
  completion: number;
}

export type ContractorProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "TERMINATED";

export interface ContractorMilestone {
  id: string;
  contractorProjectId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  amount?: number;
  status: MilestoneStatus;
  completedAt?: Date;
}

export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";

export interface ContractorWorkDiary {
  id: string;
  contractorProjectId: string;
  date: Date;
  workDone: string;
  workersPresent?: number;
  materialsUsed?: string;
  issues?: string;
  photos?: string[];
}

export interface ContractorDefect {
  id: string;
  contractorProjectId: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: DefectStatus;
  reportedAt: Date;
  response?: string;
  closedAt?: Date;
}

export type DefectStatus = "OPEN" | "RESPONDED" | "RESOLVED" | "CLOSED";

export interface ContractorPayment {
  id: string;
  contractorProjectId: string;
  amount: number;
  status: PaymentStatus;
  invoiceNo?: string;
  submittedAt: Date;
  approvedAt?: Date;
  paidAt?: Date;
  notes?: string;
}

export type PaymentStatus = "PENDING" | "SUBMITTED" | "APPROVED" | "PAID" | "REJECTED";

export interface ContractorDocument {
  id: string;
  contractorId: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
}

// Phase 40: Procurement Network
export interface ProcurementRelationship {
  id: string;
  fromVendorId: string;
  toVendorId: string;
  relationshipType: string;
  strength: number;
  projectId?: string;
  createdAt: Date;
}

// Phase 41: Legislative Audit
export interface Guideline {
  id: string;
  title: string;
  description?: string;
  category: string;
  referenceNo?: string;
  issuingBody?: string;
  url?: string;
  content?: string;
  sector?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuidelineCheck {
  id: string;
  projectId: string;
  guidelineId: string;
  isCompliant?: boolean;
  nonComplianceNote?: string;
  checkedById?: string;
  checkedAt: Date;
  guideline?: Guideline;
}

// Phase 42: Data Quality Engine
export interface DataQualityIssue {
  id: string;
  entityType: string;
  entityId: string;
  issueType: DataQualityIssueType;
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
  status: DataQualityIssueStatus;
  detectedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export type DataQualityIssueType =
  | "MISSING_LOCATION" | "DUPLICATE" | "STALE_DATA"
  | "INVALID_VALUE" | "INCONSISTENCY" | "OUTLIER";

export type DataQualityIssueStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";

export interface DataSource {
  id: string;
  name: string;
  type: string;
  url?: string;
  apiKey?: string;
  status: DataSourceStatus;
  lastSyncAt?: Date;
  recordCount?: number;
  createdAt: Date;
}

export type DataSourceStatus = "ACTIVE" | "INACTIVE" | "ERROR" | "PENDING";

// Phase 49: Accountability Chain
export interface AccountabilityChain {
  id: string;
  projectId: string;
  actor: string;
  action: string;
  role: string;
  timestamp: Date;
  details?: string;
}

// Phase 50: Authority Referral
export interface Referral {
  id: string;
  caseId?: string;
  projectId?: string;
  anomalyId?: string;
  authority: ReferralAuthority;
  referredTo: string;
  referredBy: string;
  status: ReferralStatus;
  referredAt: Date;
  respondedAt?: Date;
  response?: string;
  notes?: string;
}

export type ReferralAuthority = "CBI" | "ED" | "LOK_PAL" | "CVC" | "POLICE" | "NABARD" | "AG" | "OTHER";
export type ReferralStatus = "PENDING" | "ACKNOWLEDGED" | "INVESTIGATING" | "ACTION_TAKEN" | "CLOSED";

// Phase 51: Evidence Package
export interface EvidencePackage {
  id: string;
  caseId?: string;
  projectId?: string;
  type: string;
  generatedBy: string;
  generatedAt: Date;
  fileUrl?: string;
  content?: Record<string, unknown>;
  status: string;
}

// Phase 52: Police/Safety
export interface SafetyReport {
  id: string;
  projectId?: string;
  incidentType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  location?: string;
  reportedBy?: string;
  status: SafetyReportStatus;
  createdAt: Date;
  resolvedAt?: Date;
}

export type SafetyReportStatus = "REPORTED" | "INVESTIGATING" | "RESOLVED" | "CLOSED";

// Phase 65: Whistleblower
export interface WhistleblowerReport {
  id: string;
  category: string;
  title: string;
  description: string;
  encryptedData?: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "INVESTIGATED" | "DISMISSED" | "ACTION_TAKEN";
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

// Phase 62: Dynamic Policy/Risk Engine
export interface PolicyConfig {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  updatedAt: Date;
  updatedBy?: string;
}
