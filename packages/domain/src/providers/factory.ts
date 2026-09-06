/**
 * Provider factory. Reads env vars to determine which provider implementation to use.
 * Falls back to NullProviders if no real provider is configured.
 *
 * To add a real provider:
 * 1. Create packages/integrations/ (later milestone)
 * 2. Implement the interface
 * 3. Update factory to detect and return it
 */
import { SatelliteProvider } from './satelliteProvider';
import { GovernmentDataProvider } from './governmentDataProvider';
import { MapsProvider } from './mapsProvider';
import { AIProvider } from './aiProvider';
import { DocumentProvider } from './documentProvider';
import { StorageProvider } from './storageProvider';
import {
  NullSatelliteProvider,
  NullGovernmentDataProvider,
  NullMapsProvider,
  NullAIProvider,
  NullDocumentProvider,
  NullStorageProvider,
} from './nullProviders';

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
