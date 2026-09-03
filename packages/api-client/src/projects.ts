import type { ApiClient } from './client';
import type { PaginatedResponse } from './types';
import type { ProjectStatus, ProjectSector } from '@vojas/shared';

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

export interface ProjectEvidence {
  id: string;
  type: string;
  url: string;
  caption?: string;
  capturedAt?: string;
  source?: string;
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
      return client.get<ProjectEvidence[]>(`/projects/${id}/evidence`);
    },
    findNearby(params: { latitude: number; longitude: number; radiusKm?: number }) {
      return client.get<Project[]>('/projects/nearby', params);
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
  processingStatus: 'PROCESSING' | 'IDLE' | 'PENDING';
  jobId: string | null;
  providerStatus: 'CONFIGURED' | 'NOT_CONFIGURED';
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
