import { ProviderStatus } from './types.js';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface MapsProvider {
  geocode(address: string): Promise<GeocodeResult | null>;
  reverseGeocode(latitude: number, longitude: number): Promise<string | null>;
  getStatus(): ProviderStatus;
}
