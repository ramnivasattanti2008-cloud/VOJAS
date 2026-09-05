import type { ApiClient } from './client';
import type {
  FundLifecycle,
  FinancialObservation,
  ReconciliationResult,
  PeerBenchmark,
  FinancialRiskSignals,
  CrossSourceCorrelation,
} from './types';

export function createFinancialApi(client: ApiClient) {
  return {
    /**
     * GET /projects/:id/financial — list all financial observations
     */
    list: (projectId: string): Promise<FinancialObservation[]> =>
      client.get<FinancialObservation[]>(`/projects/${projectId}/financial`),

    /**
     * GET /projects/:id/financial/summary — fund lifecycle tracking
     */
    getSummary: (projectId: string): Promise<FundLifecycle> =>
      client.get<FundLifecycle>(`/projects/${projectId}/financial/summary`),

    /**
     * GET /projects/:id/financial/reconciliation — cross-source reconciliation
     */
    getReconciliation: (projectId: string): Promise<ReconciliationResult> =>
      client.get<ReconciliationResult>(`/projects/${projectId}/financial/reconciliation`),

    /**
     * GET /projects/:id/financial/benchmarks — peer benchmarking
     * scope: 'sector' | 'district' | 'state' | 'national'
     */
    getBenchmarks: (
      projectId: string,
      scope: 'sector' | 'district' | 'state' | 'national' = 'sector'
    ): Promise<PeerBenchmark> =>
      client.get<PeerBenchmark>(
        `/projects/${projectId}/financial/benchmarks?scope=${scope}`
      ),

    /**
     * GET /projects/:id/financial/signals — financial risk signals
     */
    getSignals: (projectId: string): Promise<FinancialRiskSignals> =>
      client.get<FinancialRiskSignals>(`/projects/${projectId}/financial/signals`),

    /**
     * GET /projects/:id/financial/correlation — cross-source correlation
     */
    getCorrelation: (projectId: string): Promise<CrossSourceCorrelation> =>
      client.get<CrossSourceCorrelation>(`/projects/${projectId}/financial/correlation`),

    /**
     * GET /projects/:id/financial/timeline — financial timeline for Time Machine
     */
    getTimeline: (projectId: string): Promise<Array<{
      id: string;
      date: string;
      type: string;
      description: string;
      amount: number;
      vendor: string | null;
      status: string;
      evidence: string[];
    }>> => client.get(`/projects/${projectId}/financial/timeline`),
  };
}
