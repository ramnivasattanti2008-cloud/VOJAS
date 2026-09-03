import multer, { diskStorage, FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import type { Request } from "express";

export const REPORT_UPLOAD_DIR = "uploads/reports";
export const DOCUMENT_UPLOAD_DIR = "uploads/projects";

export function getUploadDir(subdir: "reports" | "projects"): string {
  return subdir === "reports" ? REPORT_UPLOAD_DIR : DOCUMENT_UPLOAD_DIR;
}

/** Ensure all upload directories exist on startup */
export function ensureUploadDirs(): void {
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads", { recursive: true });
  }
  if (!fs.existsSync(REPORT_UPLOAD_DIR)) {
    fs.mkdirSync(REPORT_UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(DOCUMENT_UPLOAD_DIR)) {
    fs.mkdirSync(DOCUMENT_UPLOAD_DIR, { recursive: true });
  }
}

/** Sync the directory for a given upload subdir (idempotent). */
export function ensureUploadDir(subdir: "reports" | "projects"): string {
  const dir = getUploadDir(subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Allowed MIME types for report attachments
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

// Allowed file extensions (whitelist)
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

// Max file size: 10 MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Magic byte signatures for content-type verification
// (first few bytes of the actual file content)
const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // "RIFF" — must also have "WEBP" at offset 8
  "application/pdf": [0x25, 0x50, 0x44, 0x46], // "%PDF"
};

/**
 * Read the first N bytes of a file and verify its magic bytes match
 * the claimed MIME type. This prevents MIME-type spoofing where a
 * malicious actor uploads e.g. a script with `Content-Type: image/jpeg`.
 */
export function verifyMagicBytes(filePath: string, claimedMime: string): boolean {
  const expected = MAGIC_BYTES[claimedMime];
  if (!expected) return false;

  let fd: number | undefined;
  try {
    fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(expected.length);
    fs.readSync(fd, buf, 0, expected.length, 0);

    for (let i = 0; i < expected.length; i++) {
      if (buf[i] !== expected[i]) return false;
    }

    // WebP: also check "WEBP" at offset 8
    if (claimedMime === "image/webp") {
      const buf2 = Buffer.alloc(12);
      fs.readSync(fd, buf2, 0, 12, 0);
      return buf2.toString("ascii", 8, 12) === "WEBP";
    }

    return true;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

/** Build the multer middleware for report attachments */
export function getReportUpload() {
  return multer({
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, REPORT_UPLOAD_DIR);
      },
      filename: (_req, file, cb) => {
        // Use only the extension from the original filename, and only if it's whitelisted
        const rawExt = path.extname(file.originalname).toLowerCase();
        const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : ".bin";
        // Random UUID + extension — never use the original filename
        cb(null, `${randomUUID()}${ext}`);
      },
    }),
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1, // only one file per request
      fields: 10,
    },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      // Check extension
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return cb(new Error(`Unsupported file extension: ${ext}. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`));
      }
      // Check MIME
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, PDF.`));
      }
      cb(null, true);
    },
  });
}

/** Build the multer middleware for project documents. Slightly larger files
 *  than report attachments because sanction orders / contracts / drawings
 *  can be substantial PDFs. */
export function getDocumentUpload() {
  return multer({
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, DOCUMENT_UPLOAD_DIR);
      },
      filename: (_req, file, cb) => {
        const rawExt = path.extname(file.originalname).toLowerCase();
        const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : ".bin";
        cb(null, `${randomUUID()}${ext}`);
      },
    }),
    limits: {
      fileSize: 25 * 1024 * 1024, // 25 MB — larger than reports
      files: 1,
      fields: 10,
    },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return cb(new Error(`Unsupported file extension: ${ext}. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`));
      }
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, PDF.`));
      }
      cb(null, true);
    },
  });
}

