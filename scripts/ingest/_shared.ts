/**
 * Shared ingest utilities.
 *
 * Used by lgd.ts, opencity.ts, dataful.ts, vonter.ts, normalize.ts.
 * Every script must be idempotent — re-running with the same data must not
 * duplicate rows. We rely on Prisma upsert keyed on stable natural keys
 * (source + sourceWorkId, vendor.nameNormalized + state, etc.).
 */
import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

// ─── Constants ──────────────────────────────────────────────────────────────

export const INGEST_DIR = `${process.cwd()}/scripts/ingest`;
export const DATA_DIR = `${INGEST_DIR}/data`;

export const ROUPEES_PER_CRORE = 10_000_000;
export const LOK_SABHA_TERMS = {
  FIFTEENTH: { start: 2009, end: 2014 },
  SIXTEENTH: { start: 2014, end: 2019 },
  SEVENTEENTH: { start: 2019, end: 2024 },
  EIGHTEENTH: { start: 2024, end: 2029 },
} as const;

export type LokSabhaTerm = keyof typeof LOK_SABHA_TERMS;
export type House = "LOK_SABHA" | "RAJYA_SABHA";

// ─── Small, dependency-free CSV reader (RFC 4180, handles quoted fields) ───

export async function* parseCSV(
  filepath: string,
  delimiter = ",",
): AsyncGenerator<string[]> {
  const stream = createReadStream(filepath, { encoding: "utf-8" });
  let buf = "";
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for await (const chunk of stream) {
    buf += chunk;
    let i = 0;
    while (i < buf.length) {
      const c = buf[i];
      if (inQuotes) {
        if (c === '"') {
          if (buf[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        field += c;
        i++;
        continue;
      }
      if (c === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (c === delimiter) {
        row.push(field);
        field = "";
        i++;
        continue;
      }
      if (c === "\n" || c === "\r") {
        if (c === "\r" && buf[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        if (row.length > 1 || row[0] !== "") yield row;
        row = [];
        i++;
        continue;
      }
      field += c;
      i++;
    }
    buf = buf.slice(i);
  }
  if (field !== "" || row.length) {
    row.push(field);
    yield row;
  }
}

// ─── Normalizers ────────────────────────────────────────────────────────────

/**
 * Canonicalize a district name so that "BANGALORE URBAN", "Bangalore Urban",
 * "Bengaluru Urban", and "BENGALURU URBAN" all match.
 */
export function normalizeDistrictName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toUpperCase()
    .replace(/\(SC\)|\(ST\)|\(GEN\)/g, "")
    .replace(/[.\-'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Canonicalize a vendor name for dedup. Strips common suffixes, normalizes
 * case, removes punctuation. Conservative: prefer over-matching to missing
 * matches.
 */
export function normalizeVendorName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toUpperCase()
    .replace(/\b(PVT\.?\s*LTD\.?|PRIVATE\s+LIMITED|LTD\.?|LIMITED|LLP|LLC|INC\.?|CO\.?|CORPORATION|CORP\.?)\b/g, "")
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Canonicalize a state name to a stable form.
 */
export function normalizeStateName(name: string | null | undefined): string {
  if (!name) return "";
  return name.toUpperCase().replace(/\s+/g, " ").trim();
}

/**
 * Map a free-text work description to a ProjectSector enum value.
 * Returns the default if no clear match.
 */
export function inferSector(workText: string): string {
  const w = workText.toLowerCase();
  if (/road|pathway|highway|bridge|flyover/.test(w)) return "TRANSPORT";
  if (/water|drinking|hand pump|well|pipe|sewage|drain/.test(w)) return "WATER_SANITATION";
  if (/school|education|anganwadi|college|hostel|library/.test(w)) return "EDUCATION";
  if (/hospital|health|dispensary|medical|clinic|phc|chc/.test(w)) return "HEALTH";
  if (/irrigation|canal|dam|agric|farm|krishi/.test(w)) return "AGRICULTURE";
  if (/solar|electric|power|street\s*light|lamp/.test(w)) return "ENERGY";
  if (/toilet|latrine|sanitation|swachh/.test(w)) return "WATER_SANITATION";
  if (/community\s*hall|building|shelter/.test(w)) return "HOUSING";
  if (/park|garden|plantation|forest|tree/.test(w)) return "ENVIRONMENT";
  if (/training|skill|workshop|computer/.test(w)) return "RURAL_DEVELOPMENT";
  if (/playground|stadium|khel|sports|gym/.test(w)) return "SOCIAL_WELFARE";
  return "PUBLIC_INFRASTRUCTURE";
}

/**
 * Map a work category string to a ProjectSector. (Vonter CATEGORY is high-level.)
 */
export function categoryToSector(category: string): string {
  switch (category.toUpperCase().trim()) {
    case "NORMAL/OTHERS":
    case "REPAIR AND RENOVATION":
      return "PUBLIC_INFRASTRUCTURE";
    case "TRUST AND SOCIETY":
    case "BAR AND ASSOCIATIONS":
      return "SOCIAL_WELFARE";
    default:
      return "PUBLIC_INFRASTRUCTURE";
  }
}

// ─── Date / number parsing ─────────────────────────────────────────────────

/**
 * Parse Indian date formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD.
 * Returns null on failure.
 */
export function parseIndianDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(t)) {
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    return new Date(Date.UTC(year, month - 1, day));
  }
  return null;
}

/**
 * Convert a crore value (e.g. "8112.34" or "8112") to raw rupees.
 * Returns 0 on parse failure.
 */
export function croreToRupees(s: string | number | null | undefined): number {
  if (s == null) return 0;
  const n = typeof s === "number" ? s : parseFloat(String(s).replace(/,/g, ""));
  if (isNaN(n)) return 0;
  return n * ROUPEES_PER_CRORE;
}

/**
 * Convert a raw rupee value to a number.
 */
export function rupeesToFloat(s: string | number | null | undefined): number {
  if (s == null) return 0;
  const n = typeof s === "number" ? s : parseFloat(String(s).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

export function toLokSabhaTerm(year: number): LokSabhaTerm {
  if (year >= LOK_SABHA_TERMS.EIGHTEENTH.start) return "EIGHTEENTH";
  if (year >= LOK_SABHA_TERMS.SEVENTEENTH.start) return "SEVENTEENTH";
  if (year >= LOK_SABHA_TERMS.SIXTEENTH.start) return "SIXTEENTH";
  return "FIFTEENTH";
}

export function inferHouseFromValue(s: string | null | undefined): House {
  if (!s) return "LOK_SABHA";
  const u = s.toUpperCase();
  if (u.includes("RAJYA")) return "RAJYA_SABHA";
  return "LOK_SABHA";
}

/**
 * Map CSV "status" string to Prisma ProjectStatus enum.
 */
export function mapStatus(status: string | null | undefined): string {
  if (!status) return "PROPOSED";
  const u = status.toUpperCase().trim();
  if (u === "UNSANCTIONED") return "UNSANCTIONED";
  if (u === "SANCTIONED") return "APPROVED";
  if (u === "ONGOING") return "IN_PROGRESS";
  if (u === "COMPLETED") return "COMPLETED";
  return "PROPOSED";
}

/**
 * Map CSV "ida approval" string to IdaApproval enum.
 */
export function mapIdaApproval(s: string | null | undefined): string {
  if (!s) return "PENDING";
  const u = s.toUpperCase().trim();
  if (u.includes("REJECT")) return "REJECTED";
  if (u.includes("APPROV") || u.includes("SANCTION")) return "APPROVED";
  return "PENDING";
}

// ─── Utilities ──────────────────────────────────────────────────────────────

export function slugify(s: string | null | undefined): string {
  return (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
}

export function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

export function fileExists(path: string): boolean {
  return existsSync(path);
}

export function writeJSON(path: string, data: unknown): void {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Batched execution: split an array into chunks of `size` and call `fn`
 * for each batch. Returns total processed count.
 */
export async function batch<T, R>(
  items: T[],
  size: number,
  fn: (batch: T[], index: number) => Promise<R>,
): Promise<number> {
  let processed = 0;
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    await fn(slice, Math.floor(i / size));
    processed += slice.length;
  }
  return processed;
}

/**
 * Tiny console progress bar — minimal, no deps.
 */
export class Progress {
  private last = 0;
  constructor(private label: string) {}
  tick(current: number, total: number): void {
    if (total === 0) return;
    const pct = Math.floor((current / total) * 100);
    if (pct === this.last && current !== total) return;
    this.last = pct;
    const bar = "█".repeat(Math.floor(pct / 2)) + "░".repeat(50 - Math.floor(pct / 2));
    process.stdout.write(`\r${this.label} [${bar}] ${pct}% (${current.toLocaleString()}/${total.toLocaleString()})`);
    if (current === total) process.stdout.write("\n");
  }
}

/**
 * Download a URL to a local file, with retry + offline fallback.
 * Returns the local path on success, or null on failure.
 */
export async function downloadWithRetry(
  url: string,
  localPath: string,
  opts: { retries?: number; timeoutMs?: number; label?: string } = {},
): Promise<string | null> {
  const { retries = 2, timeoutMs = 60_000, label = url } = opts;
  ensureDir(dirname(localPath));
  if (existsSync(localPath)) {
    console.log(`  ✓ cache hit: ${localPath}`);
    return localPath;
  }
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`  → download attempt ${attempt}/${retries + 1}: ${label}`);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(localPath, buf);
      console.log(`  ✓ saved ${(buf.length / 1_000_000).toFixed(2)} MB → ${localPath}`);
      return localPath;
    } catch (e: any) {
      console.log(`  ! attempt ${attempt} failed: ${e.message}`);
      if (attempt <= retries) await sleep(2000 * attempt);
    }
  }
  return null;
}

// ─── Database init helper ───────────────────────────────────────────────────

/**
 * Prisma client is in backend/, but ingest scripts may run from project root.
 * Use a relative path to backend prisma client.
 */
export async function getPrisma() {
  const { prisma } = await import("../../backend/src/config/database.js");
  return prisma;
}
