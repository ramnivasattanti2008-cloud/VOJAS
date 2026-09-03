// Re-export provider interfaces and types
export type { ProviderStatus, ProviderConfig } from './types.js';
export type {
  SatelliteProvider,
  SatelliteScene,
  SatelliteFilters,
} from './satelliteProvider.js';
export type {
  GovernmentDataProvider,
  GovernmentProjectRecord,
} from './governmentDataProvider.js';
export type { MapsProvider, GeocodeResult } from './mapsProvider.js';
export type {
  AIProvider,
  AIDocumentAnalysis,
  AIAnomalyExplanation,
  DocumentType,
} from './aiProvider.js';
export type { DocumentProvider, DocumentUploadResult } from './documentProvider.js';
export type { StorageProvider, StorageObject } from './storageProvider.js';

// Re-export null providers
export {
  NullSatelliteProvider,
  NullGovernmentDataProvider,
  NullMapsProvider,
  NullAIProvider,
  NullDocumentProvider,
  NullStorageProvider,
} from './nullProviders.js';

// Re-export factory
export {
  createSatelliteProvider,
  createGovernmentDataProvider,
  createMapsProvider,
  createAIProvider,
  createDocumentProvider,
  createStorageProvider,
} from './factory.js';
