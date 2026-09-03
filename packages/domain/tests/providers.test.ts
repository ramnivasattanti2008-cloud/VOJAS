import { describe, it, expect } from 'vitest';
import {
  NullSatelliteProvider,
  NullGovernmentDataProvider,
  NullMapsProvider,
  NullAIProvider,
  NullDocumentProvider,
  NullStorageProvider,
} from '../src/providers/nullProviders.js';
import {
  createSatelliteProvider,
  createGovernmentDataProvider,
  createMapsProvider,
  createAIProvider,
  createDocumentProvider,
  createStorageProvider,
} from '../src/providers/factory.js';

describe('Null providers return missing_credentials', () => {
  it('NullSatelliteProvider.getStatus()', () => {
    expect(new NullSatelliteProvider().getStatus()).toBe('missing_credentials');
  });
  it('NullGovernmentDataProvider.getStatus()', () => {
    expect(new NullGovernmentDataProvider().getStatus()).toBe('missing_credentials');
  });
  it('NullMapsProvider.getStatus()', () => {
    expect(new NullMapsProvider().getStatus()).toBe('missing_credentials');
  });
  it('NullAIProvider.getStatus()', () => {
    expect(new NullAIProvider().getStatus()).toBe('missing_credentials');
  });
  it('NullDocumentProvider.getStatus()', () => {
    expect(new NullDocumentProvider().getStatus()).toBe('missing_credentials');
  });
  it('NullStorageProvider.getStatus()', () => {
    expect(new NullStorageProvider().getStatus()).toBe('missing_credentials');
  });
});

describe('Null provider methods throw or return safely', () => {
  it('NullSatelliteProvider.findScenes throws', async () => {
    const provider = new NullSatelliteProvider();
    await expect(
      provider.findScenes({
        bbox: [0, 0, 1, 1],
        startDate: new Date(),
        endDate: new Date(),
      })
    ).rejects.toThrow(/not configured/i);
  });

  it('NullSatelliteProvider.getSceneMetadata returns null', async () => {
    const provider = new NullSatelliteProvider();
    const result = await provider.getSceneMetadata('abc');
    expect(result).toBeNull();
  });

  it('NullSatelliteProvider.getTileUrl returns null', () => {
    const provider = new NullSatelliteProvider();
    expect(provider.getTileUrl('abc', 'RGB')).toBeNull();
    expect(provider.getTileUrl('abc', 'NDVI')).toBeNull();
  });

  it('NullGovernmentDataProvider.fetchProjects throws', async () => {
    await expect(new NullGovernmentDataProvider().fetchProjects()).rejects.toThrow(
      /not configured/i
    );
  });

  it('NullMapsProvider.geocode returns null', async () => {
    expect(await new NullMapsProvider().geocode('123 Main St')).toBeNull();
  });

  it('NullMapsProvider.reverseGeocode returns null', async () => {
    expect(await new NullMapsProvider().reverseGeocode(0, 0)).toBeNull();
  });

  it('NullAIProvider.analyzeDocument throws', async () => {
    await expect(
      new NullAIProvider().analyzeDocument('text', 'INVOICE')
    ).rejects.toThrow(/not configured/i);
  });

  it('NullAIProvider.explainAnomaly throws', async () => {
    await expect(
      new NullAIProvider().explainAnomaly({ title: 'x', description: 'y' })
    ).rejects.toThrow(/not configured/i);
  });

  it('NullAIProvider.classifyProjectSector throws', async () => {
    await expect(new NullAIProvider().classifyProjectSector('x')).rejects.toThrow(
      /not configured/i
    );
  });

  it('NullDocumentProvider.upload throws', async () => {
    await expect(
      new NullDocumentProvider().upload(Buffer.from('x'), 'x.pdf', 'application/pdf')
    ).rejects.toThrow(/not configured/i);
  });

  it('NullDocumentProvider.delete throws', async () => {
    await expect(new NullDocumentProvider().delete('https://x')).rejects.toThrow(
      /not configured/i
    );
  });

  it('NullDocumentProvider.getDownloadUrl throws', async () => {
    await expect(
      new NullDocumentProvider().getDownloadUrl('https://x')
    ).rejects.toThrow(/not configured/i);
  });

  it('NullStorageProvider.upload throws', async () => {
    await expect(
      new NullStorageProvider().upload('key', Buffer.from('x'), 'application/pdf')
    ).rejects.toThrow(/not configured/i);
  });

  it('NullStorageProvider.download throws', async () => {
    await expect(new NullStorageProvider().download('key')).rejects.toThrow(
      /not configured/i
    );
  });

  it('NullStorageProvider.delete throws', async () => {
    await expect(new NullStorageProvider().delete('key')).rejects.toThrow(
      /not configured/i
    );
  });

  it('NullStorageProvider.getSignedUrl throws', async () => {
    await expect(new NullStorageProvider().getSignedUrl('key')).rejects.toThrow(
      /not configured/i
    );
  });

  it('NullStorageProvider.list returns empty array', async () => {
    const result = await new NullStorageProvider().list('prefix/');
    expect(result).toEqual([]);
  });
});

describe('Provider factory returns null providers by default', () => {
  it('createSatelliteProvider returns NullSatelliteProvider', () => {
    expect(createSatelliteProvider()).toBeInstanceOf(NullSatelliteProvider);
  });
  it('createGovernmentDataProvider returns NullGovernmentDataProvider', () => {
    expect(createGovernmentDataProvider()).toBeInstanceOf(NullGovernmentDataProvider);
  });
  it('createMapsProvider returns NullMapsProvider', () => {
    expect(createMapsProvider()).toBeInstanceOf(NullMapsProvider);
  });
  it('createAIProvider returns NullAIProvider', () => {
    expect(createAIProvider()).toBeInstanceOf(NullAIProvider);
  });
  it('createDocumentProvider returns NullDocumentProvider', () => {
    expect(createDocumentProvider()).toBeInstanceOf(NullDocumentProvider);
  });
  it('createStorageProvider returns NullStorageProvider', () => {
    expect(createStorageProvider()).toBeInstanceOf(NullStorageProvider);
  });
});
