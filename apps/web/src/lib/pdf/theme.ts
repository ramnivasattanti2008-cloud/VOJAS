/**
 * VOJAS PDF design tokens.
 *
 * Deliberately restrained: one navy, one accent blue, a neutral slate ramp and
 * four semantic risk colours. No gradients, no decorative artwork. The palette
 * mirrors the web app (tailwind.config.ts -> vojas / civic scales) so a printed
 * report and the screen read as the same product.
 *
 * This module is React-free and side-effect free so it can be imported from
 * anywhere (including a worker or a test) without pulling in the DOM.
 */

/** RGB triple in 0-255 space. Matches jspdf-autotable's `Color` tuple shape. */
export type Rgb = [number, number, number];

/** Returns a fresh tuple so shared constants can never be mutated by a consumer. */
export function cloneColor(color: Rgb): Rgb {
  return [color[0], color[1], color[2]];
}

export const PDF_COLORS = {
  /** slate-900 — primary text */
  ink: [15, 23, 42] as Rgb,
  /** slate-700 — secondary text */
  inkSoft: [51, 65, 85] as Rgb,
  /** slate-500 — labels, captions */
  muted: [100, 116, 139] as Rgb,
  /** slate-400 — de-emphasised / unavailable values */
  faint: [148, 163, 184] as Rgb,
  /** slate-200 — hairline rules and borders */
  hairline: [226, 232, 240] as Rgb,
  /** slate-50 — tile and callout fills */
  surface: [248, 250, 252] as Rgb,
  /** near-white zebra banding for dense tables */
  zebra: [246, 248, 251] as Rgb,
  /** vojas-950 — masthead band */
  navy: [11, 19, 43] as Rgb,
  /** vojas-600 — the single accent */
  accent: [37, 99, 235] as Rgb,
  /** vojas-300 — accent on dark backgrounds */
  accentOnDark: [147, 197, 253] as Rgb,
  white: [255, 255, 255] as Rgb,

  // Semantic risk ramp — used only where a level is genuinely known.
  riskCritical: [220, 38, 38] as Rgb,
  riskHigh: [234, 88, 12] as Rgb,
  riskMedium: [202, 138, 4] as Rgb,
  riskLow: [22, 163, 74] as Rgb,
} as const;

/** Semantic tone for a metric or callout. */
export type ReportTone = 'neutral' | 'positive' | 'warning' | 'critical' | 'accent';

export function toneColor(tone: ReportTone | undefined): Rgb {
  switch (tone) {
    case 'positive':
      return cloneColor(PDF_COLORS.riskLow);
    case 'warning':
      return cloneColor(PDF_COLORS.riskMedium);
    case 'critical':
      return cloneColor(PDF_COLORS.riskCritical);
    case 'accent':
      return cloneColor(PDF_COLORS.accent);
    default:
      return cloneColor(PDF_COLORS.ink);
  }
}

/**
 * Colour for a risk level. An unrecognised or missing level is neutral grey —
 * never guess a severity colour, because colour reads as a claim.
 */
export function riskLevelColor(level: string | null | undefined): Rgb {
  switch ((level ?? '').trim().toUpperCase()) {
    case 'CRITICAL':
      return cloneColor(PDF_COLORS.riskCritical);
    case 'HIGH':
      return cloneColor(PDF_COLORS.riskHigh);
    case 'MEDIUM':
    case 'MODERATE':
      return cloneColor(PDF_COLORS.riskMedium);
    case 'LOW':
      return cloneColor(PDF_COLORS.riskLow);
    default:
      return cloneColor(PDF_COLORS.muted);
  }
}

/**
 * Type scale, in points. Helvetica (a jsPDF standard font) is the only family
 * used — embedding a custom face would add ~400KB to the client bundle for no
 * legibility gain at these sizes.
 */
export const PDF_TYPE = {
  wordmark: 17,
  documentKind: 8.5,
  title: 17,
  subtitle: 10,
  sectionHeading: 9.5,
  body: 9.5,
  small: 8.5,
  tableHead: 8,
  tableBody: 8.5,
  label: 7.25,
  metricValue: 13,
  micro: 6.75,
  footer: 7.25,
} as const;

/** Page geometry, in points (A4 = 595.28 x 841.89pt). */
export const PDF_LAYOUT = {
  marginX: 48,
  /** Height of the navy masthead band on page 1. */
  mastheadHeight: 84,
  /** Accent bar directly under the masthead band. */
  accentBarHeight: 2.5,
  /** Where page-1 content begins (below the masthead). */
  firstPageTop: 114,
  /** Where continuation-page content begins (below the running header). */
  runningPageTop: 72,
  /** Reserved footer zone measured from the bottom edge. */
  footerZone: 66,
  /** Vertical rhythm — every gap in the document is a multiple of 4. */
  gap: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 20,
    xl: 28,
  },
} as const;
