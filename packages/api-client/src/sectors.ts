/**
 * Sectors API Client — M13 16-Sector Framework
 */

import type { ApiClient } from './client';
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
    getProjects(code: ProjectSector, params?: { status?: string; limit?: number }): Promise<any[]> {
      return client.get('/sectors/projects', { code, ...params });
    },

    /**
     * GET /sectors/alerts?code=X — risk alerts for a sector
     */
    getAlerts(code: ProjectSector): Promise<any[]> {
      return client.get('/sectors/alerts', { code });
    },

    /**
     * GET /sectors/reports?code=X — citizen reports for a sector
     */
    getReports(code: ProjectSector, params?: { status?: string; limit?: number }): Promise<any[]> {
      return client.get('/sectors/reports', { code, ...params });
    },

    /**
     * GET /sectors/analytics?code=X — sector analytics
     */
    getAnalytics(code: ProjectSector): Promise<any> {
      return client.get('/sectors/analytics', { code });
    },
  };
}
