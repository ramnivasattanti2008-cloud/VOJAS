import { ProviderStatus } from './types.js';

export interface GovernmentProjectRecord {
  source: string;
  sourceWorkId: string;
  name: string;
  description?: string;
  state: string;
  district: string;
  constituency?: string;
  approvedAmount: number;
  sector?: string;
  status?: string;
  rawPayload?: Record<string, unknown>;
}

export interface GovernmentDataProvider {
  /**
   * Fetch projects from a government data source.
   */
  fetchProjects(filters?: {
    state?: string;
    district?: string;
    since?: Date;
  }): Promise<GovernmentProjectRecord[]>;
  getStatus(): ProviderStatus;
}
