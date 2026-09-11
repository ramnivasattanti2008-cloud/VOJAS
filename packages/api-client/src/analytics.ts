/**
 * M16: Analytics API Client
 * Advanced analytics, forecasting, benchmarking, and scenario analysis
 */

import type { ApiClient } from './client.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProjectAnalytics {
  projectId: string;
  projectName: string;
  sector: string;
  status: string;
  sanctionedAmount: number;
  spentAmount: number;
  utilizationPct: number;
  reportedProgressPct: number;
  riskScore: number;
  riskLevel: string;
  openFindingsCount: number;
  unresolvedFindingsCount: number;
  plannedEndDate: string | null;
  elapsedDays: number;
  delayDays: number;
  observationCount: number;
  latestObservationDate: string | null;
  latestChangeClassification: string | null;
  satelliteConsistent: boolean;
  citizenReportCount: number;
  openCitizenReports: number;
  documentCount: number;
  documentVerifiedCount: number;
  dataQuality: string;
  coverage: Record<string, number>;
  computedAt: string;
  modelVersion: string;
}

export interface AggregatedMetrics {
  entityType: string;
  entityId: string;
  entityName: string;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  delayedProjects: number;
  totalSanctioned: number;
  totalSpent: number;
  avgUtilization: number;
  avgRiskScore: number;
  highRiskCount: number;
  criticalRiskCount: number;
  openFindings: number;
  openAnomalyCount: number;
  anomalyDensity: number;
  citizenReportCount: number;
  riskTrend: string;
  utilizationTrend: string;
  delayTrend: string;
  dataQuality: string;
  satelliteCoverage: number;
  computedAt: string;
}

export interface BenchmarkDistribution {
  metricType: string;
  min: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  max: number;
  mean: number;
  stdDev: number | null;
  count: number;
}

export interface ProjectBenchmark {
  projectId: string;
  projectName: string;
  metricValue: number;
  percentile: number;
  band: 'BELOW_PEER' | 'WITHIN_PEER' | 'ABOVE_PEER';
  distribution: BenchmarkDistribution;
  confidence: string;
  comparison: string;
}

export interface CrossSignalPattern {
  signals: string[];
  description: string;
  correlation: number;
  riskLevel: string;
  evidence: string[];
}

export interface Hotspot {
  state: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  projectCount: number;
  avgRiskScore: number;
  highRiskCount: number;
  findingsCount: number;
}

export interface ScenarioResult {
  name: string;
  description: string;
  scenarioType: string;
  baselineValue: number;
  scenarioValue: number;
  difference: number;
  differencePct: number;
  confidence: string;
  assumptions: string[];
  limitations: string;
}

export interface DelayForecast {
  forecastType: 'DELAY';
  value: number;
  lowerBound: number;
  upperBound: number;
  confidence: string;
  modelType: string;
  horizonDays: number;
  observationCount: number;
  explanation: string;
  expectedCompletionDate: string;
  plannedCompletionDate: string;
  estimatedDelayDays: number;
  delayRangeDays: [number, number];
  probabilityOfDelay: number;
  probabilityOfPlannedCompletion: number;
}

export interface CostForecast {
  forecastType: 'COST';
  value: number;
  lowerBound: number;
  upperBound: number;
  confidence: string;
  modelType: string;
  observationCount: number;
  explanation: string;
  expectedFinalExpenditure: number;
  sanctionedAmount: number;
  expectedUtilizationPct: number;
  potentialOverrunPct: number;
}

export interface RiskForecast {
  forecastType: 'RISK';
  value: number;
  confidence: string;
  modelType: string;
  currentRiskScore: number;
  expectedRiskScore: number;
  riskTrajectory: string;
  probabilityOfIncrease: number;
}

// ── API Factory ───────────────────────────────────────────────────────────────

export function createAnalyticsApi(client: ApiClient) {
  return {
    // ── Project Analytics ────────────────────────────────────────────────
    getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
      return client.get(`/analytics/projects/${projectId}/analytics`);
    },

    // ── Aggregated Metrics ────────────────────────────────────────────────
    getAggregatedMetrics(params: {
      entityType: string;
      entityId: string;
      state?: string;
      sector?: string;
      districtId?: string;
    }): Promise<AggregatedMetrics> {
      return client.get('/analytics/aggregated', params);
    },

    // ── Benchmarks ───────────────────────────────────────────────────────
    getBenchmarkDistribution(
      metricType: string,
      peerCriteria?: Record<string, unknown>
    ): Promise<BenchmarkDistribution> {
      return client.get('/analytics/benchmarks/' + metricType, {
        peerCriteria: peerCriteria ? JSON.stringify(peerCriteria) : undefined,
      });
    },

    getProjectBenchmark(projectId: string, metricType: string): Promise<ProjectBenchmark> {
      return client.get(`/analytics/projects/${projectId}/benchmark/${metricType}`);
    },

    // ── Patterns & Hotspots ──────────────────────────────────────────────
    getCrossProjectPatterns(params?: {
      sector?: string;
      state?: string;
      districtId?: string;
    }): Promise<{ patterns: CrossSignalPattern[] }> {
      return client.get('/analytics/cross-project-patterns', params);
    },

    getHotspots(params?: {
      minRiskScore?: number;
      minFindings?: number;
      limit?: number;
    }): Promise<{ hotspots: Hotspot[] }> {
      return client.get('/analytics/hotspot', params);
    },

    // ── Forecasting ──────────────────────────────────────────────────────
    getDelayForecast(projectId: string, horizonDays?: number): Promise<DelayForecast> {
      return client.get(`/analytics/projects/${projectId}/forecast/delay`, {
        horizonDays,
      });
    },

    getCostForecast(projectId: string): Promise<CostForecast> {
      return client.get(`/analytics/projects/${projectId}/forecast/cost`);
    },

    getRiskForecast(projectId: string): Promise<RiskForecast> {
      return client.get(`/analytics/projects/${projectId}/forecast/risk`);
    },

    // ── Scenarios ────────────────────────────────────────────────────────
    runScenario(
      projectId: string,
      params: {
        scenarioType: string;
        baselineValue: number;
        changeRate?: number;
        horizonDays?: number;
      }
    ): Promise<ScenarioResult> {
      return client.post(`/analytics/projects/${projectId}/scenario`, params);
    },

    getComparativeScenarios(params: {
      entityType: string;
      entityId: string;
      scenarioType: string;
      changeRate: number;
    }): Promise<{ scenarios: ScenarioResult[] }> {
      return client.get('/analytics/scenarios/comparative', params);
    },

    // ── Snapshots ────────────────────────────────────────────────────────
    getSnapshots(params?: {
      entityType?: string;
      entityId?: string;
      page?: number;
      limit?: number;
    }): Promise<{
      snapshots: Array<{
        id: string;
        entityType: string;
        entityId: string;
        metrics: any;
        computedAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }> {
      return client.get('/analytics/snapshots', params);
    },

    createSnapshot(data: {
      entityType: string;
      entityId: string;
      metrics: any;
    }): Promise<{
      id: string;
      entityType: string;
      entityId: string;
      metrics: any;
      computedAt: string;
    }> {
      return client.post('/analytics/snapshots', data);
    },

    // ── Insights ─────────────────────────────────────────────────────────
    getInsights(params?: {
      entityType?: string;
      entityId?: string;
      severity?: string;
      page?: number;
      limit?: number;
    }): Promise<{
      insights: Array<{
        id: string;
        entityType: string;
        entityId: string;
        insightType: string;
        title: string;
        description: string;
        severity: string;
        confidence: string;
        dataQuality: string;
        createdAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }> {
      return client.get('/analytics/insights', params);
    },

    // ── Model Versions ───────────────────────────────────────────────────
    getModelVersions(active?: boolean): Promise<{
      models: Array<{
        id: string;
        name: string;
        version: string;
        modelType: string;
        description: string | null;
        isActive: boolean;
        accuracy: number | null;
        createdAt: string;
        updatedAt: string;
      }>;
    }> {
      return client.get('/analytics/models', { active: active !== undefined ? String(active) : undefined });
    },
  };
}

export type AnalyticsApi = ReturnType<typeof createAnalyticsApi>;
