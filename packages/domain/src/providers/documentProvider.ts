import { ProviderStatus } from './types.js';

export interface DocumentUploadResult {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface DocumentProvider {
  upload(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<DocumentUploadResult>;
  delete(url: string): Promise<void>;
  getDownloadUrl(url: string): Promise<string>;
  getStatus(): ProviderStatus;
}
