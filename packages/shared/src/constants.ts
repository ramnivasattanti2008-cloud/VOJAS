export const APP_NAME = 'VOJAS';
export const APP_VERSION = '2.0.0';
export const APP_MOTTO = 'ACCOUNTABILITY';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const SUPPORTED_LOCALES = ['en', 'hi'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const UPLOAD_MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const UPLOAD_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv'
] as const;

export const JWT_DEFAULT_EXPIRES_IN = '7d';
export const BCRYPT_COST_FACTOR = 12;
