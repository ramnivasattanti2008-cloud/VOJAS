/**
 * Formatting primitives for VOJAS PDF reports.
 *
 * The single most important rule in this file: a missing value is rendered as
 * an explicit, human-readable "Not available" — never as 0, "-", "" or an
 * invented figure. A citizen or auditor reading a VOJAS report must be able to
 * tell the difference between "we know this is zero" and "we do not know this".
 *
 * Pure functions only: no DOM, no React, no jsPDF.
 */

/** The one and only label for an absent value. */
export const NOT_AVAILABLE = 'Not available';

/**
 * jsPDF's standard fonts use WinAnsi (cp1252) encoding, which has no glyph for
 * the Indian Rupee sign (U+20B9). Embedding a Unicode font purely for one glyph
 * would add several hundred KB to the client bundle, so printed amounts are
 * prefixed "INR" — the ISO code used in Indian government financial statements.
 */
export const INR_PREFIX = 'INR ';

const IST_TIME_ZONE = 'Asia/Kolkata';

const inrGrouping = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const inrGroupingDecimal = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: IST_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: IST_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

// ── Presence ──────────────────────────────────────────────────────────────────

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// ── Numbers, currency, percentages ────────────────────────────────────────────

/** Indian digit grouping (12,34,567). Absent values become "Not available". */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (!isFiniteNumber(value)) return NOT_AVAILABLE;
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

/** Exact rupee figure with Indian digit grouping, e.g. "INR 1,25,00,000". */
export function formatInr(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return NOT_AVAILABLE;
  return `${INR_PREFIX}${inrGrouping.format(value)}`;
}

/**
 * Lakh / crore shorthand for headline tiles, e.g. "INR 1.25 Cr". This is a
 * rounded *representation* of a known figure — never use it to stand in for a
 * figure that is unknown. The exact value is always printed in the detail
 * tables of the same report.
 */
export function formatInrCompact(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return NOT_AVAILABLE;
  const CRORE = 10_000_000;
  const LAKH = 100_000;
  const magnitude = Math.abs(value);
  if (magnitude >= CRORE) {
    return `${INR_PREFIX}${inrGroupingDecimal.format(value / CRORE)} Cr`;
  }
  if (magnitude >= LAKH) {
    return `${INR_PREFIX}${inrGroupingDecimal.format(value / LAKH)} L`;
  }
  return formatInr(value);
}

/** `value` is already in percentage points (0-100), not a 0-1 ratio. */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (!isFiniteNumber(value)) return NOT_AVAILABLE;
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Percentage of `whole` represented by `part` — returns null (not 0) unless
 * both components are genuinely known and the denominator is positive. Callers
 * must render null as NOT_AVAILABLE rather than substituting a figure.
 */
export function percentOf(
  part: number | null | undefined,
  whole: number | null | undefined
): number | null {
  if (!isFiniteNumber(part) || !isFiniteNumber(whole) || whole <= 0) return null;
  return (part / whole) * 100;
}

/**
 * Sums only when every component is present. A partial sum presented as a total
 * is a fabricated number, so an incomplete input returns null.
 */
export function sumIfComplete(values: ReadonlyArray<number | null | undefined>): number | null {
  if (values.length === 0) return null;
  let total = 0;
  for (const value of values) {
    if (!isFiniteNumber(value)) return null;
    total += value;
  }
  return total;
}

/** "17.38500, 78.48670" — only when both components are real. */
export function formatCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): string {
  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) return NOT_AVAILABLE;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return NOT_AVAILABLE;
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

// ── Dates ─────────────────────────────────────────────────────────────────────

export function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** dd/mm/yyyy in IST. */
export function formatDate(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : NOT_AVAILABLE;
}

/** dd/mm/yyyy, HH:mm in IST. */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : NOT_AVAILABLE;
}

/** dd/mm/yyyy, HH:mm IST — the generation stamp shown on every report. */
export function formatTimestamp(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  return date ? `${dateTimeFormatter.format(date)} IST` : NOT_AVAILABLE;
}

/** dd-mm-yyyy, for filenames. */
export function formatDateForFilename(value: string | number | Date | null | undefined): string {
  const date = toDate(value) ?? new Date();
  return dateFormatter.format(date).replace(/\//g, '-');
}

// ── Text ──────────────────────────────────────────────────────────────────────

export function formatText(value: string | null | undefined): string {
  return isNonEmptyString(value) ? value.trim() : NOT_AVAILABLE;
}

/** "IN_PROGRESS" / "in-progress" -> "In progress". Leaves prose untouched. */
export function formatEnumLabel(value: string | null | undefined): string {
  if (!isNonEmptyString(value)) return NOT_AVAILABLE;
  const raw = value.trim();
  if (!/^[A-Z0-9_-]+$/.test(raw)) return raw;
  const words = raw.toLowerCase().split(/[_-]+/).filter(Boolean);
  if (words.length === 0) return NOT_AVAILABLE;
  return words
    .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** Joins the parts that actually exist; returns NOT_AVAILABLE if none do. */
export function joinPresent(
  parts: ReadonlyArray<string | null | undefined>,
  separator = ', '
): string {
  const present = parts.filter(isNonEmptyString).map((part) => part.trim());
  return present.length > 0 ? present.join(separator) : NOT_AVAILABLE;
}

/**
 * Maps text into the character range jsPDF's standard fonts can actually draw.
 *
 * Typographic characters get faithful ASCII equivalents. Anything still outside
 * cp1252 (for example Devanagari or Telugu, which Helvetica cannot represent)
 * collapses to a single "?" per run — visibly unrendered rather than silently
 * mangled into a different, wrong string.
 */
export function sanitizeForPdf(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\u00A0\u2007\u202F]/g, ' ')
    .replace(/₹\s*/g, INR_PREFIX)
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•·●]/g, '-')
    .replace(/[→⇒]/g, '->')
    .replace(/[^\n\x20-\xFF]+/g, '?');
}

// ── Cell values ───────────────────────────────────────────────────────────────

export type ReportCellValue = string | number | Date | null | undefined;

export type ValueFormat =
  | 'text'
  | 'enum'
  | 'currency'
  | 'currencyCompact'
  | 'number'
  | 'decimal'
  | 'percent'
  | 'date'
  | 'datetime';

/** Single funnel every printed value passes through, so nothing slips out unformatted. */
export function formatValue(value: ReportCellValue, format: ValueFormat = 'text'): string {
  switch (format) {
    case 'currency':
      return formatInr(typeof value === 'number' ? value : null);
    case 'currencyCompact':
      return formatInrCompact(typeof value === 'number' ? value : null);
    case 'number':
      return formatNumber(typeof value === 'number' ? value : null, 0);
    case 'decimal':
      return formatNumber(typeof value === 'number' ? value : null, 2);
    case 'percent':
      return formatPercent(typeof value === 'number' ? value : null);
    case 'date':
      return formatDate(value instanceof Date || typeof value === 'string' ? value : null);
    case 'datetime':
      return formatDateTime(value instanceof Date || typeof value === 'string' ? value : null);
    case 'enum':
      return formatEnumLabel(typeof value === 'string' ? value : null);
    case 'text':
    default:
      if (value instanceof Date) return formatDate(value);
      if (typeof value === 'number') return formatNumber(value, 0);
      return formatText(typeof value === 'string' ? value : null);
  }
}

// ── Filenames ─────────────────────────────────────────────────────────────────

export function slugify(value: string | null | undefined, maxLength = 48): string {
  if (!isNonEmptyString(value)) return '';
  return value
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/**
 * Builds "VOJAS-Project-MPLADS-2314-12-09-2026.pdf". `reference` is optional —
 * when it is missing the filename simply omits it rather than inventing an id.
 */
export function buildReportFilename(options: {
  kind: string;
  reference?: string | null;
  generatedAt?: Date;
}): string {
  const parts = ['VOJAS', slugify(options.kind, 32) || 'Report'];
  const reference = slugify(options.reference, 48);
  if (reference) parts.push(reference);
  parts.push(formatDateForFilename(options.generatedAt ?? new Date()));
  return `${parts.join('-')}.pdf`;
}
