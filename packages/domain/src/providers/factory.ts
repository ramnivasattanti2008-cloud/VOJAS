/**
 * Provider factory. Reads env vars to determine which provider implementation to use.
 * Falls back to NullProviders if no real provider is configured.
 *
 * To add a real provider:
 * 1. Create packages/integrations/ (later milestone)
 * 2. Implement the interface
 * 3. Update factory to detect and return it
 */
import type { SatelliteProvider } from './satelliteProvider.js';
import type { GovernmentDataProvider } from './governmentDataProvider.js';
import type { MapsProvider } from './mapsProvider.js';
import type { AIProvider } from './aiProvider.js';
import type { DocumentProvider } from './documentProvider.js';
import type { StorageProvider } from './storageProvider.js';
import {
  NullSatelliteProvider,
  NullGovernmentDataProvider,
  NullMapsProvider,
  NullAIProvider,
  NullDocumentProvider,
  NullStorageProvider,
} from './nullProviders.js';

export function createSatelliteProvider(): SatelliteProvider {
  // Example: const provider = process.env.SATELLITE_PROVIDER;
  //          if (provider === 'cdse') return new CdseSatelliteProvider();
  return new NullSatelliteProvider();
}

export function createGovernmentDataProvider(): GovernmentDataProvider {
  return new NullGovernmentDataProvider();
}

export function createMapsProvider(): MapsProvider {
  return new NullMapsProvider();
}

export function createAIProvider(): AIProvider {
  return new NullAIProvider();
}

export function createDocumentProvider(): DocumentProvider {
  return new NullDocumentProvider();
}

export function createStorageProvider(): StorageProvider {
  return new NullStorageProvider();
}
