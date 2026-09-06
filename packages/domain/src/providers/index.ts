// Re-export provider interfaces and types
export type { ProviderStatus, ProviderConfig } from './types';
export type {
  SatelliteProvider,
  SatelliteScene,
  SatelliteFilters,
} from './satelliteProvider';
export type {
  GovernmentDataProvider,
  GovernmentProjectRecord,
} from './governmentDataProvider';
export type { MapsProvider, GeocodeResult } from './mapsProvider';
export type {
  AIProvider,
  AIDocumentAnalysis,
  AIAnomalyExplanation,
  AIDocumentType,
} from './aiProvider';
export type { DocumentProvider, DocumentUploadResult } from './documentProvider';
export type { StorageProvider, StorageObject } from './storageProvider';

// Re-export null providers
export {
  NullSatelliteProvider,
  NullGovernmentDataProvider,
  NullMapsProvider,
  NullAIProvider,
  NullDocumentProvider,
  NullStorageProvider,
} from './nullProviders';

// Re-export factory
export {
  createSatelliteProvider,
  createGovernmentDataProvider,
  createMapsProvider,
  createAIProvider,
  createDocumentProvider,
  createStorageProvider,
} from './factory';
