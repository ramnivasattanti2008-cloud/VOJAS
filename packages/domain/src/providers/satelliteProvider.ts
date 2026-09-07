import { ProviderStatus } from './types.js';

export interface SatelliteScene {
  sceneId: string;
  observationDate: Date;
  satellite: string;
  sensor: string;
  dataset: string;
  cloudCover: number;
  resolution: number;
  bbox: { sw: [number, number]; ne: [number, number] };
  tileUrl?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  sourceName?: string;
}

export interface SatelliteFilters {
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  startDate: Date;
  endDate: Date;
  maxCloudCover?: number;
  quality?: string;
}

export interface SatelliteProvider {
  findScenes(filters: SatelliteFilters): Promise<SatelliteScene[]>;
  getSceneMetadata(sceneId: string): Promise<SatelliteScene | null>;
  getTileUrl(sceneId: string, layer: 'RGB' | 'NIR' | 'NDVI' | 'NDBI'): string | null;
  getThumbnailUrl(sceneId: string): string | null;
  getStatus(): ProviderStatus;
}
