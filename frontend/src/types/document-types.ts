// ── Document Types ────────────────────────────────────────────────────────────

export type DocumentType =
  | "SANCTION_ORDER"
  | "TENDER"
  | "CONTRACT"
  | "WORK_ORDER"
  | "INVOICE"
  | "RECEIPT"
  | "COMPLETION_CERT"
  | "INSPECTION_REPORT"
  | "PHOTOGRAPH"
  | "ENVIRONMENTAL_CLEARANCE"
  | "OTHER";

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "REQUIRES_INFO";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  SANCTION_ORDER: "Sanction Order",
  TENDER: "Tender",
  CONTRACT: "Contract",
  WORK_ORDER: "Work Order",
  INVOICE: "Invoice",
  RECEIPT: "Receipt",
  COMPLETION_CERT: "Completion Certificate",
  INSPECTION_REPORT: "Inspection Report",
  PHOTOGRAPH: "Photograph",
  ENVIRONMENTAL_CLEARANCE: "Environmental Clearance",
  OTHER: "Other",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  PENDING: "Pending Review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  REQUIRES_INFO: "Requires Info",
};

export const VERIFICATION_STATUS_COLORS: Record<VerificationStatus, string> = {
  PENDING: "amber",
  VERIFIED: "emerald",
  REJECTED: "red",
  REQUIRES_INFO: "blue",
};

export interface DocumentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  type: DocumentType;
  title: string;
  description: string | null;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  status: VerificationStatus;
  verifiedById: string | null;
  verifiedAt: string | null;
  verificationNote: string | null;
  uploadedById: string | null;
  uploadedAt: string;
  updatedAt: string;
  uploadedBy?: DocumentUser | null;
  verifiedBy?: DocumentUser | null;
  aiAnalysis?: string | null;
  aiAnalyzedAt?: string | null;
}

export interface DocumentListResult {
  items: ProjectDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DocumentStats {
  total: number;
  byStatus: Record<string, number>;
  verified: number;
  pending: number;
  rejected: number;
  requiresInfo: number;
}

export interface DocumentFilters {
  type?: DocumentType;
  status?: VerificationStatus;
  search?: string;
  page?: number;
  limit?: number;
}
