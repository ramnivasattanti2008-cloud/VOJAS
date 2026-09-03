export type ProviderStatus = 'configured' | 'missing_credentials' | 'error';

export interface ProviderConfig {
  status: ProviderStatus;
  lastError?: string;
  lastChecked?: Date;
}
