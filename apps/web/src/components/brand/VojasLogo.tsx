import type { SVGProps } from 'react';

/**
 * VOJAS brand mark — inline SVG, currentColor-driven.
 *
 * CONCEPT: "Geofenced Checkpoint"
 * Four corner brackets (the crop-mark / bounding-box / geofence motif used
 * throughout satellite imagery, evidence photography and GIS tooling) frame
 * a bold monogram "V" whose apex terminates in a small solid square — a
 * "checkpoint" node, standing for a verified coordinate, a ledger entry, a
 * locked-down fact. Read together the mark says: a site has been located,
 * framed and checked — the whole job of VOJAS.
 *
 * Why this avoids the forbidden clichés:
 * - Not a shield: no crest silhouette, no pointed base, no heraldic curve —
 *   just four independent right-angle brackets, open in the middle.
 * - Not a checkmark: the two strokes are equal-weight and meet at a wide,
 *   symmetric angle — it reads as the letter "V" (the first letter of the
 *   wordmark), not as a tick/approval glyph.
 * - Not an eye: no lens/iris geometry, no ellipse.
 * - Not a hotel emblem: no circular crest, no wreath, no ornament.
 * - No gradients, no glow — flat currentColor strokes and one flat fill, so
 *   it survives print, dark mode and favicon scale unchanged.
 * - The bracket motif is borrowed from investigative/geospatial UI (bounding
 *   boxes, target frames, map viewport corners) rather than generic "AI
 *   product" iconography, matching the command-center brand direction.
 */

const VIEWBOX = '0 0 48 48';

function MarkPaths() {
  return (
    <>
      {/* Four geofence / bounding-box corner brackets */}
      <path
        d="M5 15V5H15"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M33 5H43V15"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M43 33V43H33"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M15 43H5V33"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Monogram "V", apex offset to leave room for the checkpoint node */}
      <path
        d="M13 12L24 31L35 12"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Checkpoint node — a verified coordinate / ledger entry */}
      <rect x="20.5" y="29.5" width="7" height="7" rx="1.25" fill="currentColor" />
    </>
  );
}

export interface VojasMarkProps extends SVGProps<SVGSVGElement> {
  /** Pixel size for both width and height. Defaults to 24. */
  size?: number;
}

/**
 * Symbol-only mark. Square, favicon-safe, currentColor. Use for the favicon,
 * app icon, loading spinners, compact nav rails and anywhere the wordmark
 * would not fit.
 */
export function VojasMark({ size = 24, ...props }: VojasMarkProps) {
  return (
    <svg
      viewBox={VIEWBOX}
      width={size}
      height={size}
      role="img"
      aria-label="VOJAS"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <MarkPaths />
    </svg>
  );
}

export interface VojasWordmarkProps extends SVGProps<SVGSVGElement> {
  /** Pixel height of the wordmark. Width scales to fit. Defaults to 28. */
  height?: number;
  /** Show the tagline under the wordmark (navbar/opening-screen use only). */
  tagline?: string;
}

/**
 * Symbol + "VOJAS" lettering, set in IBM Plex Sans with wide tracking for an
 * official / stamped-document feel. Use for the opening screen, login
 * screen, navbar and print/export/report headers.
 */
export function VojasWordmark({ height = 28, tagline, ...props }: VojasWordmarkProps) {
  const markSize = height;
  const gap = height * 0.4;
  const textSize = height * 0.72;
  const width = markSize + gap + textSize * 3.55;
  const viewHeight = tagline ? height * 1.55 : height;

  return (
    <svg
      viewBox={`0 0 ${width} ${viewHeight}`}
      width={width}
      height={viewHeight}
      role="img"
      aria-label="VOJAS"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g transform={`scale(${markSize / 48})`}>
        <MarkPaths />
      </g>
      <text
        x={markSize + gap}
        y={height * 0.72}
        fontFamily='"IBM Plex Sans", "Segoe UI", Arial, sans-serif'
        fontWeight={700}
        fontSize={textSize}
        letterSpacing={textSize * 0.06}
        fill="currentColor"
      >
        VOJAS
      </text>
      {tagline ? (
        <text
          x={markSize + gap}
          y={height * 1.32}
          fontFamily='"IBM Plex Mono", "Segoe UI", Arial, sans-serif'
          fontWeight={500}
          fontSize={textSize * 0.34}
          letterSpacing={textSize * 0.05}
          fill="currentColor"
          opacity={0.7}
        >
          {tagline.toUpperCase()}
        </text>
      ) : null}
    </svg>
  );
}
