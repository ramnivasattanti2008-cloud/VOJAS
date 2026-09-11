import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  NullSatelliteProvider,
  NullGovernmentDataProvider,
  NullMapsProvider,
  NullAIProvider,
  NullDocumentProvider,
  NullStorageProvider,
} from '../src/providers/nullProviders';
import { CdseSatelliteProvider } from '../src/providers/cdseSatelliteProvider';
import {
  createSatelliteProvider,
  createGovernmentDataProvider,
  createMapsProvider,
  createAIProvider,
  createDocumentProvider,
  createStorageProvider,
} from '../src/providers/factory';

const ENV_KEYS = [
  'CDSE_CLIENT_ID',
  'CDSE_CLIENT_SECRET',
  'GOVERNMENT_DATA_API_KEY',
  'MAPS_PROVIDER_API_KEY',
  'AI_PROVIDER_API_KEY',
  'DOCUMENT_PROVIDER_API_KEY',
  'STORAGE_PROVIDER_API_KEY',
] as const;

// Snapshot and restore every env var these factories read, so this suite
// never leaks state into other test files or depends on the ambient shell.
const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
});

describe('createSatelliteProvider', () => {
  it('returns NullSatelliteProvider reporting missing_credentials when CDSE creds are absent', () => {
    const provider = createSatelliteProvider();
    expect(provider).toBeInstanceOf(NullSatelliteProvider);
    expect(provider.getStatus()).toBe('missing_credentials');
  });

  it('returns NullSatelliteProvider when only CDSE_CLIENT_ID is set', () => {
    process.env.CDSE_CLIENT_ID = 'test-client-id';
    const provider = createSatelliteProvider();
    expect(provider).toBeInstanceOf(NullSatelliteProvider);
    expect(provider.getStatus()).toBe('missing_credentials');
  });

  it('returns a real CdseSatelliteProvider when both CDSE credentials are present', () => {
    process.env.CDSE_CLIENT_ID = 'test-client-id';
    process.env.CDSE_CLIENT_SECRET = 'test-client-secret';
    const provider = createSatelliteProvider();
    expect(provider).toBeInstanceOf(CdseSatelliteProvider);
    expect(provider).not.toBeInstanceOf(NullSatelliteProvider);
    // Credentials are present, so the provider reports itself configured
    // (readiness, not a live-verified token — see cdseSatelliteProvider.ts).
    expect(provider.getStatus()).toBe('configured');
  });

  it('CdseSatelliteProvider only serves tile/thumbnail URLs once a token is cached', () => {
    process.env.CDSE_CLIENT_ID = 'test-client-id';
    process.env.CDSE_CLIENT_SECRET = 'test-client-secret';
    const provider = createSatelliteProvider();
    // No network call has happened yet, so there is no cached token — the
    // provider must not fabricate a tile URL without one.
    expect(provider.getTileUrl('S2A_MSIL2A_TEST', 'RGB')).toBeNull();
    expect(provider.getThumbnailUrl('S2A_MSIL2A_TEST')).toBeNull();
    // Unverified WMS layers are refused even in principle, regardless of
    // token state.
    expect(provider.getTileUrl('S2A_MSIL2A_TEST', 'NDVI')).toBeNull();
  });
});

describe('Provider factories return Null implementations reporting missing_credentials when unconfigured', () => {
  it('createGovernmentDataProvider', () => {
    const provider = createGovernmentDataProvider();
    expect(provider).toBeInstanceOf(NullGovernmentDataProvider);
    expect(provider.getStatus()).toBe('missing_credentials');
  });

  it('createMapsProvider', () => {
    const provider = createMapsProvider();
    expect(provider).toBeInstanceOf(NullMapsProvider);
    expect(provider.getStatus()).toBe('missing_credentials');
  });

  it('createAIProvider', () => {
    const provider = createAIProvider();
    expect(provider).toBeInstanceOf(NullAIProvider);
    expect(provider.getStatus()).toBe('missing_credentials');
  });

  it('createDocumentProvider', () => {
    const provider = createDocumentProvider();
    expect(provider).toBeInstanceOf(NullDocumentProvider);
    expect(provider.getStatus()).toBe('missing_credentials');
  });

  it('createStorageProvider', () => {
    const provider = createStorageProvider();
    expect(provider).toBeInstanceOf(NullStorageProvider);
    expect(provider.getStatus()).toBe('missing_credentials');
  });

  it('AI/government/maps/document/storage providers stay Null even if their reserved env var is set (no real implementation exists yet)', () => {
    process.env.AI_PROVIDER_API_KEY = 'some-key';
    process.env.GOVERNMENT_DATA_API_KEY = 'some-key';
    process.env.MAPS_PROVIDER_API_KEY = 'some-key';
    process.env.DOCUMENT_PROVIDER_API_KEY = 'some-key';
    process.env.STORAGE_PROVIDER_API_KEY = 'some-key';

    expect(createAIProvider()).toBeInstanceOf(NullAIProvider);
    expect(createAIProvider().getStatus()).toBe('missing_credentials');
    expect(createGovernmentDataProvider()).toBeInstanceOf(NullGovernmentDataProvider);
    expect(createMapsProvider()).toBeInstanceOf(NullMapsProvider);
    expect(createDocumentProvider()).toBeInstanceOf(NullDocumentProvider);
    expect(createStorageProvider()).toBeInstanceOf(NullStorageProvider);
  });
});
