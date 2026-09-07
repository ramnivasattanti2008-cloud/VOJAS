export * from './types.js';
export * from './client.js';
export * from './auth.js';
export * from './projects.js';
export * from './anomalies.js';
export * from './reports.js';
export * from './vendors.js';
export * from './notifications.js';
export * from './changeAnalysis.js';
export * from './risk.js';
// ./mps conflicts with ./mp for createMpApi/MpApi; re-export with rename
export { createMpApi as createMpsApi, type MpApi as MpsApi } from './mps.js';
export * from './documents.js';
export * from './financial.js';
export * from './citizenReports.js';
export * from './sectors.js';
// Selective exports from admin to avoid RiskRule conflict with ./types
export {
  createAdminApi,
  type AdminApi,
  type AdminStats,
  type AuditEvent,
  type AnomalyAlert,
  type AdminActivity,
  type AdminUser,
  type UserWithPermissions,
  type Role,
  type RoleChangeAudit,
  type DataSource,
  type DataSourceSyncResult,
  type RiskRule as AdminRiskRule,
  type RuleChangeAudit,
  type AIProvider,
  type SatelliteProvider,
  type BackgroundJob,
  type HealthCheck,
  type HealthStatus,
  type SecurityEvent,
  type SystemOverview,
} from './admin.js';
// Selective exports from contractor (ContractorResponse lives here)
export {
  createContractorApi,
  type ContractorApi,
  type ContractorProject,
  type ContractorMilestone,
  type ContractorDocument,
  type ContractorPayment,
  type ContractorIssue,
  type IssueHistoryEntry,
  type ContractorResponse,
  type ContractorDashboard,
  type ContractorUpdate,
  type Inspection,
  type WorkDiaryEntry,
} from './contractor.js';
// Selective exports from officer to avoid ContractorResponse conflict with ./contractor
export {
  createOfficerApi,
  type OfficerApi,
  type OfficerCase,
  type OfficerDashboardStats,
  type Evidence,
  type FieldInspection,
  type CaseAction,
} from './officer.js';
export * from './citizen.js';
export * from './analytics.js';

// Selective export from ./mp (avoids createMpApi conflict with ./mps)
export { createMpApi as createMPCommandApi, type MPApi as MPCommandApi, type MPConstituencySummary, type MPFinancialSummary, type MPDemandCluster, type MPCitizenSignal } from './mp.js';

// Re-export constants from types for convenience
export { PRIVACY_LABELS, REPORT_CATEGORY_LABELS, REPORT_STATUS_LABELS } from './types.js';

// Re-export payload types from citizenReports
export type {
  SubmitReportPayload,
  UpdateReportPayload,
  ReportFilters,
  NearbyReportsParams,
  CitizenReportsApi,
} from './citizenReports.js';

// Re-export M10 types
export type {
  CitizenReport,
  ReportMedia,
  CitizenClaim,
  ReportModeration,
  AITriageResult,
  ReportPrivacyLevel,
  ReportTriageStatus,
  ReportEvidenceQuality,
  CitizenClaimType,
  ModerationAction,
} from './types.js';
