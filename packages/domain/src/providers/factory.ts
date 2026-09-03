/**
 * Provider factory. Reads env vars to determine which provider implementation to use.
 * Falls back to NullProviders if no real provider is configured.
 *
 * To add a real provider:
 * 1. Create packages/integrations/ (later milestone)
 * 2. Implement the interface
 * 3. Update factory to detect and return it
 */
import { SatelliteProvider } from './satelliteProvider.js';
import { GovernmentDataProvider } from './governmentDataProvider.js';
import { MapsProvider } from './mapsProvider.js';
import { AIProvider } from './aiProvider.js';
import { DocumentProvider } from './documentProvider.js';
import { StorageProvider } from './storageProvider.js';
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
