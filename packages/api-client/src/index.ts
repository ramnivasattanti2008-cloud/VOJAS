export * from './types';
export * from './client';
export * from './auth';
export * from './projects';
export * from './anomalies';
export * from './reports';
export * from './vendors';
export * from './notifications';
export * from './changeAnalysis';
export * from './risk';
// ./mps conflicts with ./mp for createMpApi/MpApi; re-export with rename
export { createMpApi as createMpsApi, type MpApi as MpsApi } from './mps';
export * from './documents';
export * from './financial';
export * from './citizenReports';
export * from './sectors';
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
} from './admin';
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
} from './contractor';
// Selective exports from officer to avoid ContractorResponse conflict with ./contractor
export {
  createOfficerApi,
  type OfficerApi,
  type OfficerCase,
  type OfficerDashboardStats,
  type Evidence,
  type FieldInspection,
  type CaseAction,
} from './officer';
export * from './citizen';

// Selective export from ./mp (avoids createMpApi conflict with ./mps)
export { createMpApi as createMPCommandApi, type MPApi as MPCommandApi, type MPConstituencySummary, type MPFinancialSummary, type MPDemandCluster, type MPCitizenSignal } from './mp';

// Re-export constants from types for convenience
export { PRIVACY_LABELS, REPORT_CATEGORY_LABELS, REPORT_STATUS_LABELS } from './types';

// Re-export payload types from citizenReports
export type {
  SubmitReportPayload,
  UpdateReportPayload,
  ReportFilters,
  NearbyReportsParams,
  CitizenReportsApi,
} from './citizenReports';

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
} from './types';
