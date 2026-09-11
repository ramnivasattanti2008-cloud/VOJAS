import type { ProjectSector, ProjectStatus } from '@vojas/shared';
import type { ApiClient } from './client.js';
import type { PaginatedResponse } from './types.js';

// ── Public-safe types ──────────────────────────────────────────────────────────

export interface ProjectSummary {
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  delayedProjects: number;
  totalSanctioned: number;
  totalSpent: number;
  lastUpdated: string;
}

export interface StateSummary {
  state: string;
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  delayedProjects: number;
  totalSanctioned: number;
  totalSpent: number;
}

export interface DistrictSummary {
  state: string;
  district: string;
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  delayedProjects: number;
  totalSanctioned: number;
  totalSpent: number;
}

export interface PublicProject {
  id: string;
  name: string;
  sector: string;
  status: string;
  state: string;
  district: string;
  constituency?: string;
  approvedAmount?: number;
  spentAmount?: number;
  progressPercent?: number;
  startDate?: string;
  expectedEndDate?: string;
  completionDate?: string;
  sectorLabel: string;
  statusLabel: string;
  sourceDataSource?: string;
  dataQuality?: string;
  lastUpdated?: string;
}

// ── Public project discovery (no auth) — matches GET /projects/public and
// GET /projects/public/:id in apps/api/src/routes/publicProjects.ts. This is
// a deliberately narrower shape than `Project` below: only fields real
// enough and safe enough to show an anonymous citizen. Never widen this to
// include internal attribution (createdById, assignedToId, etc.).
export interface PublicProjectListItem {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  sector: ProjectSector;
  state: string;
  district: string;
  constituency?: string | null;
  approvedAmount: number;
  spentAmount: number;
  contractor?: string | null;
  startDate?: string | null;
  expectedEndDate?: string | null;
  completedAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source: string;
  sourceWorkId?: string | null;
  createdAt: string;
  updatedAt: string;
  mp?: PublicProjectMP | null;
  projectRisk?: PublicProjectRiskInfo | null;
}

export interface PublicProjectRiskInfo {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  confidence: string;
  primaryDriver?: string | null;
  financialScore?: number;
  progressScore?: number;
  satelliteScore?: number;
  contractorScore?: number;
  geographicScore?: number;
}

export interface PublicProjectMP {
  id: string;
  name: string;
  house: string;
  constituency: string;
  state: string;
  party?: string | null;
  term: string;
}

export interface PublicCitizenReportItem {
  id: string;
  reportReference: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  submittedAt: string;
  incidentDate?: string | null;
  locationDesc?: string | null;
  mediaCount?: number;
  claimsCount?: number;
}

export interface PublicProjectDetail extends PublicProjectListItem {
  reportCount: number;
}

export interface PublicProjectFilters {
  state?: string;
  district?: string;
  constituency?: string;
  sector?: ProjectSector;
  status?: ProjectStatus;
  completion?: 'DONE' | 'NOT_DONE';
  showcase?: boolean;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  hasCoordinates?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'approvedAmount' | 'spentAmount' | 'createdAt' | 'status' | 'riskScore';
  sortOrder?: 'asc' | 'desc';
}

export interface PublicProjectEvent {
  id: string;
  eventType: string;
  eventDate: string;
  source: string;
  sourceUrl?: string | null;
  dataset?: string | null;
  description: string;
  evidenceUrls?: unknown;
  confidence?: string | null;
}

export interface PublicRiskFinding {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: string;
  status: string;
  recommendedAction?: string | null;
  limitations?: string | null;
  detectedAt: string;
  lastObservedAt?: string | null;
}

export interface PublicRiskSummary {
  projectId: string;
  totalFindings: number;
  bySeverity: Record<string, number>;
  findings: PublicRiskFinding[];
  disclaimer: string;
}

export interface ProjectCluster {
  id: string;
  type: 'state' | 'district' | 'constituency' | 'project';
  name: string;
  state?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  projectCount: number;
  completedCount: number;
  delayedCount: number;
  totalSanctioned: number;
  totalSpent: number;
}

export interface ProjectLocation {
  id: string;
  latitude: number;
  longitude: number;
  state?: string;
  district?: string;
  block?: string;
  village?: string;
  address?: string;
}

export interface ProjectTimelineEvent {
  id: string;
  eventType: string;
  description: string;
  occurredAt: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

// Matches EvidenceItem in packages/domain/src/services/evidenceService.ts.
// A normalized read-side pointer into a real evidence-bearing table
// (Document, SatelliteObservation, SatelliteAnalysis, FieldVerification,
// ContractorUpdate, ReportMedia, ProjectEvent, RiskFinding) — never a
// fabricated or synthesized record.
export type EvidenceType =
  | 'DOCUMENT'
  | 'SATELLITE_OBSERVATION'
  | 'SATELLITE_ANALYSIS'
  | 'INSPECTION'
  | 'CITIZEN_MEDIA'
  | 'CONTRACTOR_SUBMISSION'
  | 'AI_FINDING'
  | 'PROJECT_EVENT';

export type EvidenceVerificationStatus =
  | 'VERIFIED'
  | 'NOT_VERIFIED'
  | 'REJECTED'
  | 'REQUIRES_INFO'
  | 'NOT_APPLICABLE';

export type EvidenceAccessLevel = 'PUBLIC' | 'CONTRACTOR' | 'GOVERNMENT' | 'INVESTIGATOR' | 'ADMIN';

export interface ProjectEvidence {
  id: string;
  projectId: string;
  caseId: string | null;
  evidenceType: EvidenceType;
  sourceTable: string;
  sourceId: string;
  title: string;
  description: string | null;
  url: string | null;
  creatorId: string | null;
  capturedAt: string;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  verificationStatus: EvidenceVerificationStatus;
  confidence: string | null;
  evidenceLevel: string;
  accessLevel: EvidenceAccessLevel;
  metadata: Record<string, unknown> | null;
}

export interface ProjectEvidenceFeed {
  projectId: string;
  total: number;
  items: ProjectEvidence[];
}

// Matches ProjectIntelligence in packages/domain/src/services/projectIntelligenceService.ts
export type SignalCardStatus = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNAVAILABLE';
export type FreshnessStatus = 'FRESH' | 'STALE' | 'UNAVAILABLE';

export interface FreshnessInfo {
  status: FreshnessStatus;
  ageDays: number | null;
  referenceDate: string | null;
}

export interface SignalCard {
  key: 'FINANCIAL' | 'PROGRESS' | 'TIMELINE' | 'INSPECTION' | 'CONTRACTOR' | 'CITIZEN' | 'SATELLITE';
  label: string;
  status: SignalCardStatus;
  summary: string;
  freshness: FreshnessInfo;
}

export interface CrossSignalFindingSummary {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  riskScore: number;
  confidence: string;
  status: string;
  recommendedAction: string | null;
  limitations: string | null;
  contributingSignalCount: number;
  detectedAt: string;
}

export interface ProjectIntelligence {
  projectId: string;
  project: {
    name: string;
    sector: string;
    status: string;
    state: string | null;
    district: string | null;
    constituency: string | null;
    mp: { id: string; name: string } | null;
    approvedAmount: number;
    spentAmount: number;
  };
  overallStatus: SignalCardStatus;
  risk: {
    score: number;
    level: string;
    confidence: string;
    primaryDriver: string | null;
    computedAt: string | null;
  } | null;
  signalCards: SignalCard[];
  crossSignalFindings: CrossSignalFindingSummary[];
  activeAnomalies: Array<{ id: string; category: string; severity: string; status: string; description: string }>;
  evidenceSummary: {
    total: number;
    byType: Record<string, number>;
    recent: Array<{ id: string; evidenceType: string; title: string; capturedAt: string; verificationStatus: string }>;
  };
  openInvestigation: { id: string; type: string; status: string; priority: string; assignedToId: string | null } | null;
  whyFlagged: string[];
  recommendedActions: string[];
  dataFreshness: {
    financial: FreshnessInfo;
    progress: FreshnessInfo;
    satellite: FreshnessInfo;
    inspection: FreshnessInfo;
  };
  computedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  sector: ProjectSector;
  status: ProjectStatus;
  state?: string;
  district?: string;
  block?: string;
  constituency?: string;
  mpId?: string;
  vendorId?: string;
  sanctionedAmount?: number;
  releasedAmount?: number;
  utilizedAmount?: number;
  approvedAmount?: number;
  spentAmount?: number;
  progressPercent?: number;
  latitude?: number | null;
  longitude?: number | null;
  startDate?: string;
  endDate?: string;
  completionDate?: string;
  riskLevel?: string;
  anomalyCount?: number;
  reportCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectFilters {
  state?: string;
  district?: string;
  sector?: ProjectSector;
  status?: ProjectStatus;
  mpId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  sector: ProjectSector;
  state?: string;
  district?: string;
  block?: string;
  constituency?: string;
  sanctionedAmount?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  sector?: ProjectSector;
  status?: ProjectStatus;
  state?: string;
  district?: string;
  block?: string;
  sanctionedAmount?: number;
  startDate?: string;
  endDate?: string;
  progressPercent?: number;
}

export function createProjectsApi(client: ApiClient) {
  return {
    list(filters?: ProjectFilters) {
      return client.get<PaginatedResponse<Project>>('/projects', filters as Record<string, any>);
    },
    getById(id: string) {
      return client.get<Project>(`/projects/${id}`);
    },
    create(payload: CreateProjectPayload) {
      return client.post<Project>('/projects', payload);
    },
    update(id: string, payload: UpdateProjectPayload) {
      return client.patch<Project>(`/projects/${id}`, payload);
    },
    delete(id: string) {
      return client.delete<{ success: boolean }>(`/projects/${id}`);
    },
    getTimeline(id: string) {
      return client.get<ProjectTimelineEvent[]>(`/projects/${id}/timeline`);
    },
    getLocations(id: string) {
      return client.get<ProjectLocation[]>(`/projects/${id}/locations`);
    },
    getEvidence(id: string) {
      return client.get<ProjectEvidenceFeed>(`/projects/${id}/evidence`);
    },
    getIntelligence(id: string) {
      return client.get<ProjectIntelligence>(`/projects/${id}/intelligence`);
    },
    findNearby(params: { latitude: number; longitude: number; radiusKm?: number }) {
      return client.get<Project[]>('/projects/nearby', params);
    },
    public: {
      getSummary() {
        return client.get<ProjectSummary>('/projects/public/summary');
      },
      getStateSummaries() {
        return client.get<StateSummary[]>('/projects/public/states');
      },
      getDistrictSummaries(state: string) {
        return client.get<DistrictSummary[]>('/projects/public/districts', { state });
      },
      getProjectCluster(projectId: string) {
        return client.get<ProjectCluster>(`/projects/public/cluster/${projectId}`);
      },
      list(filters?: PublicProjectFilters) {
        return client.get<PaginatedResponse<PublicProjectListItem>>('/projects/public', filters as Record<string, any>);
      },
      getById(id: string) {
        return client.get<PublicProjectDetail>(`/projects/public/${id}`);
      },
      getReports(id: string) {
        return client.get<{ projectId: string; total: number; reports: PublicCitizenReportItem[] }>(
          `/projects/public/${id}/reports`
        );
      },
      getTimeline(id: string, params?: { page?: number; limit?: number }) {
        return client.get<PaginatedResponse<PublicProjectEvent>>(`/projects/public/${id}/timeline`, params);
      },
      getRiskSummary(id: string) {
        return client.get<PublicRiskSummary>(`/projects/public/${id}/risk`);
      },
      getEvidence(id: string) {
        return client.get<ProjectEvidenceFeed>(`/projects/public/${id}/evidence`);
      },
    },
  };
}

// ── Satellite API ────────────────────────────────────────────────────────────────

export interface SatelliteObservation {
  id: string;
  sceneId: string | null;
  observationDate: string;
  targetDate: string | null;
  targetDifference: number | null;
  provider: string;
  satellite: string;
  sensor: string;
  dataset: string;
  cloudCover: number;
  resolution: number;
  bbox: { sw: [number, number]; ne: [number, number] } | null;
  tileUrl: string | null;
  thumbnailUrl: string | null;
  centerLat: number | null;
  centerLng: number | null;
  processingLevel: string | null;
  quality: string;
  selectionReason: string | null;
  ndvi: number | null;
  ndbi: number | null;
  bsi: number | null;
  constructionScore: number | null;
  sourceUrl: string | null;
  sourceName: string | null;
  createdAt: string;
}

export interface TimelineEntry {
  targetDate: string;
  observationId: string | null;
  observationDate: string | null;
  availability: 'AVAILABLE' | 'NO_USABLE_OBSERVATION' | 'UNKNOWN';
  reason: string | null;
  cloudCover: number | null;
  provider: string | null;
  satellite: string | null;
  sourceUrl: string | null;
  developmentScore: number | null;
  selectionReason: string | null;
  targetDifference: number | null;
  methodology: string;
}

export interface SatelliteStatus {
  availability: 'AVAILABLE' | 'NO_USABLE_OBSERVATION';
  reason?: string;
  message?: string;
  baseline: { observationId: string; observationDate: string; cloudCover: number; sourceUrl: string | null } | null;
  latest: { observationId: string; observationDate: string; cloudCover: number; sourceUrl: string | null } | null;
  observationCount: number;
  window: { start: string; end: string } | null;
  reliabilityState?: 'AVAILABLE' | 'PROCESSING' | 'NO_DATA' | 'PROVIDER_ERROR' | 'STALE';
  processingStatus: string;
  jobId: string | null;
  // CATALOG_ONLY: CDSE catalog search (dates, cloud cover, product ids,
  // quicklook imagery) is public and works with no credential — this is the
  // default local/dev state and is NOT a blocking condition. CONFIGURED means
  // CDSE_CLIENT_ID/SECRET are set, which additionally enables pixel-level
  // processing (NDVI/NDBI/BSI, AOI-cropped true-colour rendering).
  providerStatus: 'CONFIGURED' | 'CATALOG_ONLY';
  lastSyncAt?: string | null;
}

export interface SatelliteAnalysis {
  id: string;
  observationBeforeId: string;
  observationAfterId: string;
  analysisType: string;
  analysisDate: string;
  baselineDate: string | null;
  comparisonDate: string | null;
  changeClassification: 'NO_OBSERVABLE_CHANGE' | 'LOW_OBSERVABLE_CHANGE' | 'MODERATE_OBSERVABLE_CHANGE' | 'HIGH_OBSERVABLE_CHANGE';
  changeArea: number | null;
  changePercent: number | null;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  methodology: string;
  evidence: Record<string, unknown>;
  limitations: string | null;
  metadata: Record<string, unknown> | null;
}

export interface ProgressComparison {
  status: 'CONSISTENT' | 'POSSIBLY_INCONSISTENT' | 'INCONCLUSIVE' | 'INSUFFICIENT_DATA';
  reportedProgress: number;
  changeClassification: string;
  confidence: string;
  evidence: string;
  limitations: string;
  observationDates: { baseline?: string; latest?: string };
  analysisId: string;
  baselineDate: string | null;
  comparisonDate: string | null;
}

export interface SyncResult {
  status: 'STARTED' | 'COMPLETED' | 'ALREADY_RUNNING' | 'NO_COORDINATES' | 'NOT_CONFIGURED';
  jobId?: string;
  checkpointsGenerated?: number;
  observationsCreated?: number;
  analysesCreated?: number;
  message?: string;
}

export interface SatelliteJob {
  jobId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string | null;
  completedAt: string | null;
  result: SyncResult | null;
  error: string | null;
}

export function createSatelliteApi(client: ApiClient) {
  return {
    getStatus(projectId: string) {
      return client.get<SatelliteStatus>(`/projects/${projectId}/satellite`);
    },
    getTimeline(projectId: string) {
      return client.get<{ entries: TimelineEntry[] }>(`/projects/${projectId}/satellite/timeline`);
    },
    getObservations(projectId: string, limit = 50) {
      return client.get<{ observations: SatelliteObservation[] }>(
        `/projects/${projectId}/satellite/observations`,
        { limit }
      );
    },
    getBaseline(projectId: string) {
      return client.get<{
        status: 'AVAILABLE' | 'BASELINE_UNAVAILABLE';
        reason?: string;
        targetDate?: string | null;
        methodology?: string;
        observation?: { id: string; sceneId: string; observationDate: string; cloudCover: number; satellite: string; sourceUrl: string | null };
      }>(`/projects/${projectId}/satellite/baseline`);
    },
    getChange(projectId: string) {
      return client.get<{ comparisons: SatelliteAnalysis[] }>(`/projects/${projectId}/satellite/change`);
    },
    getComparison(projectId: string) {
      return client.get<ProgressComparison>(`/projects/${projectId}/satellite/comparison`);
    },
    triggerSync(projectId: string) {
      return client.post<SyncResult>(`/projects/${projectId}/satellite/sync`);
    },
    getJob(projectId: string, jobId: string) {
      return client.get<SatelliteJob>(`/projects/${projectId}/satellite/jobs/${jobId}`);
    },
  };
}

export type SatelliteApi = ReturnType<typeof createSatelliteApi>;

export type ProjectsApi = ReturnType<typeof createProjectsApi>;
