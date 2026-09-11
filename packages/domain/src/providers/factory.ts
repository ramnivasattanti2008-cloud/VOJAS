/**
 * Provider factory — decides which concrete implementation of each
 * domain provider interface to hand callers.
 *
 * Every factory here is env-driven and honest: it returns a real
 * implementation only when that implementation actually exists in
 * this codebase AND its required env vars are present. Otherwise it
 * returns the corresponding Null* implementation, whose getStatus()
 * truthfully reports 'missing_credentials'. No factory ever reports a
 * provider as usable when it cannot actually serve real data — see
 * CLAUDE.md's "never fabricate civic data" rule.
 *
 * createSatelliteProvider is the only one with a real backing
 * implementation today: CdseSatelliteProvider, driven by
 * CDSE_CLIENT_ID / CDSE_CLIENT_SECRET. See cdseSatelliteProvider.ts
 * for why that implementation lives in packages/domain instead of
 * wrapping apps/api/src/services/cdseService.ts (short version:
 * packages/domain must never import from apps/api, and the DB
 * ingestion half of cdseService.ts doesn't belong in this interface).
 *
 * The other five (government data, maps, AI, document, storage) have
 * no real implementation anywhere in this codebase yet. For AI in
 * particular that's deliberate: no LLM SDK dependency has been added.
 * Each factory still names the env var that would drive a future real
 * implementation, so wiring one in later is a small, local change —
 * but until one exists, an env var being present is not sufficient to
 * honestly claim 'configured', so these keep returning their Null
 * implementation either way.
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
import { CdseSatelliteProvider } from './cdseSatelliteProvider.js';

export function createSatelliteProvider(): SatelliteProvider {
  const clientId = process.env.CDSE_CLIENT_ID;
  const clientSecret = process.env.CDSE_CLIENT_SECRET;
  if (clientId && clientSecret) {
    return new CdseSatelliteProvider(clientId, clientSecret);
  }
  return new NullSatelliteProvider();
}

export function createGovernmentDataProvider(): GovernmentDataProvider {
  // Reserved env var for a future real implementation: GOVERNMENT_DATA_API_KEY.
  // No client exists in this codebase yet. Read (not just referenced in a
  // comment) so presence/absence is honestly inert rather than silently
  // ignored, and so getStatus() never claims 'configured' for a provider
  // that cannot actually fetch government data.
  void process.env.GOVERNMENT_DATA_API_KEY;
  return new NullGovernmentDataProvider();
}

export function createMapsProvider(): MapsProvider {
  // Reserved env var for a future real implementation: MAPS_PROVIDER_API_KEY.
  // No client exists in this codebase yet — see createGovernmentDataProvider
  // for why this reads the env var without branching on it.
  void process.env.MAPS_PROVIDER_API_KEY;
  return new NullMapsProvider();
}

export function createAIProvider(): AIProvider {
  // Reserved env var for a future real implementation: AI_PROVIDER_API_KEY.
  // Per project policy, no LLM SDK dependency has been added and no real
  // analyzeDocument/explainAnomaly/classifyProjectSector implementation
  // exists yet. An API key alone would not make this provider capable of
  // serving real output, so it never reports 'configured' — it always
  // returns Null until a real implementation is wired in here.
  void process.env.AI_PROVIDER_API_KEY;
  return new NullAIProvider();
}

export function createDocumentProvider(): DocumentProvider {
  // Reserved env var for a future real implementation: DOCUMENT_PROVIDER_API_KEY.
  // No client exists in this codebase yet — see createGovernmentDataProvider
  // for why this reads the env var without branching on it.
  void process.env.DOCUMENT_PROVIDER_API_KEY;
  return new NullDocumentProvider();
}

export function createStorageProvider(): StorageProvider {
  // Reserved env var for a future real implementation: STORAGE_PROVIDER_API_KEY.
  // No client exists in this codebase yet — see createGovernmentDataProvider
  // for why this reads the env var without branching on it.
  void process.env.STORAGE_PROVIDER_API_KEY;
  return new NullStorageProvider();
}
