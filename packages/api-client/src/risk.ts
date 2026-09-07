/**
 * M8: Risk Analysis API client
 */
import type { ApiClient } from './client.js';
import type {
  RiskSignal,
  RiskFinding,
  RiskEvent,
  ProjectRiskSummary,
  RiskAnalysisResult,
  NationalRiskSummary,
  RiskTrend,
  RiskHotspot,
  RiskRule,
} from './types.js';

export function createRiskApi(client: ApiClient) {
  return {
    // ── Project-level ──────────────────────────────────────────

    /** Trigger full risk analysis for a project */
    analyze(projectId: string, options?: { forceNewRun?: boolean }) {
      return client.post<RiskAnalysisResult>(
        `/api/v1/projects/${projectId}/risk/analyze`,
        options ?? {}
      );
    },

    /** Get risk summary + signals + findings + events for a project */
    getRisk(projectId: string) {
      return client.get<ProjectRiskSummary>(
        `/api/v1/projects/${projectId}/risk`
      );
    },

    /** Get signals for a project */
    getSignals(projectId: string) {
      return client.get<{ signals: RiskSignal[]; total: number }>(
        `/api/v1/projects/${projectId}/risk/signals`
      );
    },

    /** Get findings for a project */
    getFindings(projectId: string, params?: { status?: string; severity?: string }) {
      return client.get<{ findings: RiskFinding[]; total: number }>(
        `/api/v1/projects/${projectId}/risk/findings`,
        params
      );
    },

    /** Get a specific finding with contributing signals */
    getFinding(projectId: string, findingId: string) {
      return client.get<{
        finding: RiskFinding;
        signals: RiskSignal[];
        project: { name: string; sector: string; status: string; approvedAmount: number; spentAmount: number };
      }>(`/api/v1/projects/${projectId}/risk/findings/${findingId}`);
    },

    /** Get risk event timeline for a project */
    getEvents(projectId: string) {
      return client.get<{ events: RiskEvent[] }>(
        `/api/v1/projects/${projectId}/risk/events`
      );
    },

    // ── National ──────────────────────────────────────────────

    /** National risk summary */
    getSummary() {
      return client.get<NationalRiskSummary>('/api/v1/risk/summary');
    },

    /** Global findings across all projects (national queue) */
    getAllFindings(params?: { status?: string; severity?: string; page?: number; limit?: number }) {
      return client.get<{ findings: RiskFinding[]; total: number }>(
        '/api/v1/risk/findings',
        params
      );
    },

    /** Risk trends over time */
    getTrends(params?: { days?: number }) {
      return client.get<{ trends: RiskTrend[] }>('/api/v1/risk/trends', params);
    },

    /** Geographic risk hotspots */
    getHotspots(params?: { minRiskScore?: number; limit?: number }) {
      return client.get<{ hotspots: RiskHotspot[] }>(
        '/api/v1/risk/hotspots',
        params
      );
    },

    /** Rule registry */
    getRules() {
      return client.get<{ rules: RiskRule[] }>('/api/v1/risk/rules');
    },

    // ── Workflow ──────────────────────────────────────────────

    /** Update finding status */
    updateFindingStatus(
      findingId: string,
      payload: { status: string; resolution?: string }
    ) {
      return client.patch<{
        id: string;
        status: RiskFinding['status'];
        acknowledgedById?: string | null;
        acknowledgedAt?: string | null;
        resolvedById?: string | null;
        resolvedAt?: string | null;
        resolution?: string | null;
      }>(
        `/api/v1/findings/${findingId}/status`,
        payload
      );
    },
  };
}
