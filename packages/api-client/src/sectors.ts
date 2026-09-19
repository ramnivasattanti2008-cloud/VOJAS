/**
 * Sectors API Client — M13 16-Sector Framework
 */

import type { ApiClient } from './client.js';
import type { ProjectSector } from '@vojas/shared';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SectorIndicator {
  id: string;
  name: string;
  description: string;
  unit: string;
  type: 'DIRECT' | 'DERIVED' | 'SATELLITE' | 'AI_INTERPRETED' | 'HUMAN_VERIFIED';
  source: string;
  frequency: string;
  calculation?: string;
  dataAvailability: string;
  dataNote?: string;
}

export interface SectorRiskRule {
  id: string;
  name: string;
  description: string;
  signals: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dataRequirements: string[];
  dataAvailability: string;
}

export interface SectorMapLayer {
  id: string;
  name: string;
  type: string;
  description: string;
  color: string;
  dataAvailability: string;
  dataNote?: string;
}

export interface SectorDataSource {
  id: string;
  name: string;
  officialSource: string;
  dataset: string;
  url?: string;
  department: string;
  updateFrequency: string;
  apiAvailable: boolean;
  dataAvailability: string;
  accessMethod: string;
  dataNote?: string;
}

export interface SectorSection {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface SectorAIContext {
  description: string;
  keyQuestions: string[];
  availableMetrics: string[];
  typicalAlerts: string[];
}

export interface SectorDataQuality {
  name: string;
  description: string;
  applicable: boolean;
  dataAvailability: string;
}

export interface SectorConfig {
  code: ProjectSector;
  name: string;
  shortName: string;
  description: string;
  color: string;
  icon: string;
  sections: SectorSection[];
  indicators: SectorIndicator[];
  riskRules: SectorRiskRule[];
  mapLayers: SectorMapLayer[];
  dataSources: SectorDataSource[];
  aiContext: SectorAIContext;
  dataQualityDimensions: SectorDataQuality[];
}

export interface SectorProjectStats {
  sector: ProjectSector;
  total: number;
  completed: number;
  inProgress: number;
  delayed: number;
  totalAmount: number;
  spentAmount: number;
}

export interface SectorSummary {
  sectors: SectorConfig[];
  projectStats: SectorProjectStats[];
}

/** Matches the projection returned by GET /sectors/projects — see Project in schema.prisma. */
export interface SectorProjectListItem {
  id: string;
  name: string;
  status: string;
  sector: ProjectSector;
  state: string;
  district: string;
  approvedAmount: number;
  spentAmount: number;
  updatedAt: string;
}

/** Matches the projection returned by GET /sectors/alerts — see Anomaly in schema.prisma. */
export interface SectorAlertItem {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  riskScore: number;
  status: string;
  aiExplanation: string | null;
  aiConfidence: number | null;
  createdAt: string;
  project: { id: string; name: string; sector: string; state: string; district: string } | null;
}

/** Matches the projection returned by GET /sectors/reports — see Report in schema.prisma. */
export interface SectorReportItem {
  id: string;
  reportReference: string;
  title: string;
  category: string;
  status: string;
  createdAt: string;
  project: { id: string; name: string; state: string; district: string } | null;
}

/** Matches the payload returned by GET /sectors/analytics. */
export interface SectorAnalytics {
  sector: ProjectSector;
  sectorName: string;
  projectCount: number;
  reportCount: number;
  anomalyCount: number;
  financial: {
    totalAmount: number;
    spentAmount: number;
    utilizationRate: number;
  };
  statusBreakdown: Record<string, number>;
  indicators: Array<SectorIndicator & { currentValue: null }>;
  dataSources: SectorDataSource[];
  dataQualityDimensions: SectorDataQuality[];
}

// ── API Functions ────────────────────────────────────────────────────────────

export function createSectorsApi(client: ApiClient) {
  return {
    /**
     * GET /sectors — all sector configurations
     */
    getAll(): Promise<SectorConfig[]> {
      return client.get('/sectors');
    },

    /**
     * GET /sectors/config/:code — single sector config
     */
    getConfig(code: ProjectSector): Promise<SectorConfig> {
      return client.get(`/sectors/config/${code}`);
    },

    /**
     * GET /sectors/summary — sector project stats
     */
    getSummary(): Promise<SectorProjectStats[]> {
      return client.get('/sectors/summary');
    },

    /**
     * GET /sectors/overview — full overview
     */
    getOverview(): Promise<SectorSummary> {
      return client.get('/sectors/overview');
    },

    /**
     * GET /sectors/projects?code=X — projects for a sector
     */
    getProjects(code: ProjectSector, params?: { status?: string; limit?: number }): Promise<SectorProjectListItem[]> {
      return client.get('/sectors/projects', { code, ...params });
    },

    /**
     * GET /sectors/alerts?code=X — risk alerts for a sector
     */
    getAlerts(code: ProjectSector): Promise<SectorAlertItem[]> {
      return client.get('/sectors/alerts', { code });
    },

    /**
     * GET /sectors/reports?code=X — citizen reports for a sector
     */
    getReports(code: ProjectSector, params?: { status?: string; limit?: number }): Promise<SectorReportItem[]> {
      return client.get('/sectors/reports', { code, ...params });
    },

    /**
     * GET /sectors/analytics?code=X — sector analytics
     */
    getAnalytics(code: ProjectSector): Promise<SectorAnalytics> {
      return client.get('/sectors/analytics', { code });
    },
  };
}
