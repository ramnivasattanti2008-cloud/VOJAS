import { ProviderStatus } from './types.js';
import {
  SatelliteProvider,
  SatelliteFilters,
  SatelliteScene,
} from './satelliteProvider.js';
import {
  GovernmentDataProvider,
  GovernmentProjectRecord,
} from './governmentDataProvider.js';
import { MapsProvider, GeocodeResult } from './mapsProvider.js';
import {
  AIProvider,
  AIDocumentAnalysis,
  AIAnomalyExplanation,
  DocumentType,
} from './aiProvider.js';
import { DocumentProvider, DocumentUploadResult } from './documentProvider.js';
import { StorageProvider, StorageObject } from './storageProvider.js';

const NOT_CONFIGURED_MESSAGE =
  'Provider not configured. Set the corresponding env var to enable.';

export class NullSatelliteProvider implements SatelliteProvider {
  getStatus(): ProviderStatus {
    return 'missing_credentials';
  }
  async findScenes(_filters: SatelliteFilters): Promise<SatelliteScene[]> {
    throw new Error(
      `SatelliteProvider not configured. Set SATELLITE_PROVIDER env var. ${NOT_CONFIGURED_MESSAGE}`
    );
  }
  async getSceneMetadata(_sceneId: string): Promise<SatelliteScene | null> {
    return null;
  }
  getTileUrl(
    _sceneId: string,
    _layer: 'RGB' | 'NIR' | 'NDVI' | 'NDBI'
  ): string | null {
    return null;
  }
  getThumbnailUrl(_sceneId: string): string | null {
    return null;
  }
}

export class NullGovernmentDataProvider implements GovernmentDataProvider {
  getStatus(): ProviderStatus {
    return 'missing_credentials';
  }
  async fetchProjects(
    _filters?: { state?: string; district?: string; since?: Date }
  ): Promise<GovernmentProjectRecord[]> {
    throw new Error(
      `GovernmentDataProvider not configured. ${NOT_CONFIGURED_MESSAGE}`
    );
  }
}

export class NullMapsProvider implements MapsProvider {
  getStatus(): ProviderStatus {
    return 'missing_credentials';
  }
  async geocode(_address: string): Promise<GeocodeResult | null> {
    return null;
  }
  async reverseGeocode(
    _latitude: number,
    _longitude: number
  ): Promise<string | null> {
    return null;
  }
}

export class NullAIProvider implements AIProvider {
  getStatus(): ProviderStatus {
    return 'missing_credentials';
  }
  async analyzeDocument(
    _text: string,
    _type: DocumentType
  ): Promise<AIDocumentAnalysis> {
    throw new Error(`AIProvider not configured. ${NOT_CONFIGURED_MESSAGE}`);
  }
  async explainAnomaly(_anomaly: {
    title: string;
    description: string;
    ruleCode?: string;
  }): Promise<AIAnomalyExplanation> {
    throw new Error(`AIProvider not configured. ${NOT_CONFIGURED_MESSAGE}`);
  }
  async classifyProjectSector(_description: string): Promise<string> {
    throw new Error(`AIProvider not configured. ${NOT_CONFIGURED_MESSAGE}`);
  }
}

export class NullDocumentProvider implements DocumentProvider {
  getStatus(): ProviderStatus {
    return 'missing_credentials';
  }
  async upload(
    _buffer: Buffer,
    _filename: string,
    _mimeType: string
  ): Promise<DocumentUploadResult> {
    throw new Error(`DocumentProvider not configured. ${NOT_CONFIGURED_MESSAGE}`);
  }
  async delete(_url: string): Promise<void> {
    throw new Error(`DocumentProvider not configured. ${NOT_CONFIGURED_MESSAGE}`);
  }
  async getDownloadUrl(_url: string): Promise<string> {
    throw new Error(`DocumentProvider not configured. ${NOT_CONFIGURED_MESSAGE}`);
  }
}

export class NullStorageProvider implements StorageProvider {
  getStatus(): ProviderStatus {
    return 'missing_credentials';
  }
  async upload(_key: string, _body: Buffer, _mimeType: string): Promise<void> {
    throw new Error(`StorageProvider not configured. ${NOT_CONFIGURED_MESSAGE}`);
  }
  async download(_key: string): Promise<Buffer> {
    throw new Error(`StorageProvider not configured. ${NOT_CONFIGURED_MESSAGE}`);
  }
  async delete(_key: string): Promise<void> {
    throw new Error(`StorageProvider not configured. ${NOT_CONFIGURED_MESSAGE}`);
  }
  async getSignedUrl(
    _key: string,
    _expiresInSeconds?: number
  ): Promise<string> {
    throw new Error(`StorageProvider not configured. ${NOT_CONFIGURED_MESSAGE}`);
  }
  async list(_prefix?: string): Promise<StorageObject[]> {
    return [];
  }
}
