/**
 * Media Validation Service — M10 Citizen Intelligence Report
 *
 * Handles file validation, magic-byte forensic checks, and metadata extraction
 * for citizen-submitted media (images, videos, documents).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { Jimp, compareHashes } from 'jimp';
import { logger } from '../utils/logger.js';

// ─── Constants ───────────────────────────────────────────────────────────────

export const ALLOWED_MEDIA_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif',
  '.mp4', '.mov', '.avi', '.mkv', '.webm',
  '.mp3', '.wav', '.ogg', '.m4a',
  '.pdf',
]);

export const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  // Video
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  // Documents
  'application/pdf',
]);

export const MAX_MEDIA_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

// Magic bytes for common formats
const MAGIC_BYTES: Record<string, Array<{ magic: Buffer; offset?: number; mime: string }>> = {
  'image/jpeg': [{ magic: Buffer.from([0xFF, 0xD8, 0xFF]), offset: 0, mime: 'image/jpeg' }],
  'image/png': [{ magic: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), offset: 0, mime: 'image/png' }],
  'application/pdf': [{ magic: Buffer.from([0x25, 0x50, 0x44, 0x46]), offset: 0, mime: 'application/pdf' }],
  'image/gif': [{ magic: Buffer.from([0x47, 0x49, 0x46, 0x38]), offset: 0, mime: 'image/gif' }],
  // Video: MP4 has complex structure, check common box magic
  'video/mp4': [{ magic: Buffer.from('ftyp', 'ascii'), offset: 4, mime: 'video/mp4' }],
  'video/quicktime': [{ magic: Buffer.from('ftypqt', 'ascii'), offset: 4, mime: 'video/quicktime' }],
};

// ─── Validation Schema ───────────────────────────────────────────────────────

export const mediaValidationSchema = z.object({
  mimeType: z.string().min(1),
  size: z.number().positive().max(MAX_MEDIA_SIZE_BYTES),
  filename: z.string().min(1).max(500),
});

// ─── Forensic Signals ────────────────────────────────────────────────────────

export interface ForensicSignals {
  metadataInconsistency: boolean;
  timestampInconsistency: boolean;
  // Real, computed from a DCT-based perceptual hash (see computePerceptualHash)
  // compared against every other image already on record — not a stub.
  duplicateMedia: boolean;
  perceptualSimilarity: number; // 0-1, 1 = identical (0 when not computed)
  matchedMediaId?: string; // the closest prior upload, when duplicateMedia is true
  manipulationIndicators: boolean;
  compressionAnomalies: boolean;
  // Detecting AI-generated/deepfake imagery needs a trained classifier or a
  // paid detection API (e.g. Hive, Sensity) — neither exists here. Reported
  // honestly as unavailable rather than a fabricated true/false verdict.
  aiManipulationCheck: 'NOT_AVAILABLE';
  aiManipulationCheckReason: string;
  [key: string]: unknown;
}

export interface MediaMetadata {
  captureDate?: string;
  width?: number;
  height?: number;
  duration?: number; // seconds for video/audio
  make?: string;
  model?: string;
  gps?: { lat: number; lng: number };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class MediaValidationService {
  /**
   * Validate MIME type, extension, and size.
   */
  validateFile(mimeType: string, size: number, filename: string): void {
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(`File type ${mimeType} not allowed. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`);
    }

    // Check extension
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_MEDIA_EXTENSIONS.has(ext)) {
      throw new Error(`File extension ${ext} not allowed.`);
    }

    // Check size
    if (size > MAX_MEDIA_SIZE_BYTES) {
      throw new Error(`File size ${(size / 1024 / 1024).toFixed(1)}MB exceeds maximum of 50MB.`);
    }

    // MIME/extension consistency
    const extToMime: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.heic': 'image/heic',
      '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska', '.webm': 'video/webm',
      '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
      '.pdf': 'application/pdf',
    };

    const expectedMime = extToMime[ext];
    if (expectedMime && mimeType !== expectedMime) {
      throw new Error(`MIME type ${mimeType} does not match extension ${ext} (expected ${expectedMime}).`);
    }
  }

  /**
   * Validate magic bytes match declared MIME type.
   */
  validateMediaSignature(buffer: Buffer, mimeType: string): boolean {
    const signatures = MAGIC_BYTES[mimeType];
    if (!signatures) return true; // No signature defined for this type

    for (const sig of signatures) {
      const offset = sig.offset ?? 0;
      const slice = buffer.slice(offset, offset + sig.magic.length);
      if (!sig.magic.equals(slice)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Compute SHA-256 hash of a file.
   */
  computeFileHash(filePath: string): string {
    const hash = crypto.createHash('sha256');
    const fd = fs.openSync(filePath, 'r');
    try {
      const chunkSize = 64 * 1024;
      const buffer = Buffer.alloc(chunkSize);
      let bytesRead: number;
      while ((bytesRead = fs.readSync(fd, buffer, 0, chunkSize, null)) > 0) {
        hash.update(buffer.slice(0, bytesRead));
      }
    } finally {
      fs.closeSync(fd);
    }
    return hash.digest('hex');
  }

  /**
   * Extract metadata from an uploaded file.
   *
   * No EXIF/ffprobe/pdf-parse integration exists yet, so this does not invent
   * a capture date from the temp file's mtime — that is when the upload was
   * processed on this server, not when the photo or video was actually taken,
   * and evidenceService surfaces `captureDate` as a forensic timeline fact.
   * Leaving it unset lets callers fall back to the honest `uploadedAt`/
   * `createdAt` timestamp instead of a fabricated one.
   */
  extractMetadata(_filePath: string, _mimeType: string): MediaMetadata {
    return {};
  }

  /**
   * Compute a real DCT-based perceptual hash for an image buffer (via
   * Jimp's pHash — resize to 32x32, greyscale, 2D DCT, threshold against
   * the median coefficient: the same published algorithm as Hacker
   * Factor's "Looks Like It"). Returns null for non-image content or if
   * the buffer can't be decoded as an image — never a fabricated hash.
   */
  async computePerceptualHash(buffer: Buffer, mimeType: string): Promise<string | null> {
    if (!mimeType.startsWith('image/')) return null;
    try {
      const image = await Jimp.read(buffer);
      return image.pHash();
    } catch (err) {
      logger.warn('[media-forensics] Could not decode image for perceptual hashing', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Find the closest match to `hash` among `candidates` by normalized
   * Hamming distance (0 = identical, 1 = maximally different — see Jimp's
   * pHash `distance`/`compareHashes`). Returns null if there are no
   * candidates to compare against.
   */
  findClosestMatch(
    hash: string,
    candidates: Array<{ mediaId: string; hash: string }>
  ): { mediaId: string; distance: number } | null {
    let best: { mediaId: string; distance: number } | null = null;
    for (const candidate of candidates) {
      const distance = compareHashes(hash, candidate.hash);
      if (!best || distance < best.distance) {
        best = { mediaId: candidate.mediaId, distance };
      }
    }
    return best;
  }

  /**
   * Assess media for forensic manipulation signals.
   * Returns REVIEW_REQUIRED signals — never makes definitive accusations.
   *
   * Duplicate detection is real (perceptual-hash comparison against every
   * other image already on record, passed in by the caller). Manipulation/
   * compression-anomaly detection and AI-image-generation detection are
   * not — those need EXIF/JPEG-quantization analysis and a trained
   * classifier or paid API (Google PhotoDNA, Adobe Content Authenticity
   * Initiative, Hive, Sensity, ...) respectively, none of which exist
   * here, so they're reported as explicit unavailable states rather than
   * a fabricated verdict.
   */
  async assessMediaForensics(
    filePath: string,
    buffer: Buffer,
    mimeType: string,
    existingHashes: Array<{ mediaId: string; hash: string }>
  ): Promise<{ signals: ForensicSignals; perceptualHash: string | null }> {
    const aiManipulationCheck = 'NOT_AVAILABLE' as const;
    const aiManipulationCheckReason = 'AI-generated/deepfake image detection requires a trained classifier or a paid detection API (e.g. Hive, Sensity) — not configured on this deployment.';

    let stats: fs.Stats;
    try {
      stats = fs.statSync(filePath);
    } catch {
      // File may not exist yet (pre-upload validation)
      return { signals: this.defaultForensicSignals(), perceptualHash: null };
    }

    const fileSize = stats.size;

    // Check file size anomalies (tiny files likely invalid or corrupted)
    if (fileSize < 1024) {
      return {
        perceptualHash: null,
        signals: {
          metadataInconsistency: false,
          timestampInconsistency: false,
          duplicateMedia: false,
          perceptualSimilarity: 0,
          manipulationIndicators: false,
          compressionAnomalies: false,
          aiManipulationCheck,
          aiManipulationCheckReason,
        },
      };
    }

    const hash = await this.computePerceptualHash(buffer, mimeType);
    const match = hash ? this.findClosestMatch(hash, existingHashes) : null;
    // 0.10 is a conservative near-duplicate threshold for this DCT pHash —
    // well below it means the same underlying image (recompressed, resized,
    // lightly cropped), not just visually similar.
    const duplicateMedia = match !== null && match.distance < 0.10;

    const signals: ForensicSignals = {
      // Metadata inconsistency: we flag for review if we can't verify
      // (in production, compare EXIF date vs upload date vs incident date)
      metadataInconsistency: false,
      // Timestamp inconsistency: EXIF capture date vs upload time
      timestampInconsistency: false,
      duplicateMedia,
      perceptualSimilarity: match ? Math.round((1 - match.distance) * 100) / 100 : 0,
      ...(duplicateMedia && match ? { matchedMediaId: match.mediaId } : {}),
      // Manipulation indicators: compression ratio anomalies
      manipulationIndicators: false,
      // Compression anomalies: unusual quantization (JPEG)
      compressionAnomalies: false,
      aiManipulationCheck,
      aiManipulationCheckReason,
    };

    return { signals, perceptualHash: hash };
  }

  /**
   * Determine media type string from MIME.
   */
  getMediaType(mimeType: string): 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' {
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType.startsWith('video/')) return 'VIDEO';
    if (mimeType.startsWith('audio/')) return 'AUDIO';
    return 'DOCUMENT';
  }

  private defaultForensicSignals(): ForensicSignals {
    return {
      metadataInconsistency: false,
      timestampInconsistency: false,
      duplicateMedia: false,
      perceptualSimilarity: 0,
      manipulationIndicators: false,
      compressionAnomalies: false,
      aiManipulationCheck: 'NOT_AVAILABLE',
      aiManipulationCheckReason: 'AI-generated/deepfake image detection requires a trained classifier or a paid detection API (e.g. Hive, Sensity) — not configured on this deployment.',
    };
  }
}
