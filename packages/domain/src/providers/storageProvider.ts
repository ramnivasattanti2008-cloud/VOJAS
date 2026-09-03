import { ProviderStatus } from './types.js';

export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
  etag?: string;
}

export interface StorageProvider {
  upload(key: string, body: Buffer, mimeType: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  list(prefix?: string): Promise<StorageObject[]>;
  getStatus(): ProviderStatus;
}
