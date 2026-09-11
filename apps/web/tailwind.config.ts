import type { Config } from 'tailwindcss';

// VOJAS design tokens.
// - `vojas-*`  → brand accent ramp ("Seal Bronze"): a muted antique gold/bronze,
//   NOT blue, NOT green, NOT a purple/pink AI gradient. Used for primary actions,
//   links, focus states and brand chrome. Existing `bg-vojas-500` / `text-vojas-600`
//   / `border-vojas-200` usages across the app keep working — only the underlying
//   hex values changed.
// - `civic-*`  → neutral "Dossier Stone" ramp: warm graphite instead of cold
//   blue-grey, so surfaces read like paper/ink case files, not a tech-demo shell.
// - `risk-*`   → semantic risk scale (low/medium/high/critical), intentionally
//   SEPARATE from the brand accent. Used sparingly for status badges, anomaly
//   markers and risk pills — never for general chrome/branding.
// - `risk-*-fg` → the accessible text color paired with each `bg-risk-*` fill
//   (whichever of black/white clears 4.5:1 against that exact background —
//   see the measured ratio table in globals.css). A solid `bg-risk-*` fill
//   must always pair with its `text-risk-*-fg`, never bare `text-white`.
//   Prefer the light-tint + dark-text pattern already used by Badge.tsx
//   (e.g. `bg-amber-50 text-amber-700`) for ordinary status pills; reserve
//   solid `bg-risk-*` + `-fg` for small high-emphasis chips/markers.
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        vojas: {
          50: '#FBF6EC',
          100: '#F5E8CC',
          200: '#EAD29C',
          300: '#DCB669',
          400: '#C89A3E',
          500: '#AD7F26',
          600: '#8C6519',
          700: '#6D4D14',
          800: '#513911',
          900: '#3A2A0F',
          950: '#1F170A',
        },
        civic: {
          950: '#121110',
          900: '#1E1C19',
          800: '#322F2B',
          700: '#4A4640',
          600: '#635E55',
          500: '#837D72',
          400: '#A8A196',
          300: '#CBC6BB',
          200: '#E4E1DA',
          100: '#F2F0EC',
          50: '#FAF9F7',
        },
        risk: {
          low: '#3F8F5F',
          medium: '#D69E1F',
          high: '#C6631B',
          critical: '#B3261E',
          // Paired accessible foregrounds — see globals.css for measured ratios.
          'low-fg': '#000000', // 5.31:1 on risk-low
          'medium-fg': '#000000', // 8.77:1 on risk-medium
          'high-fg': '#000000', // 5.20:1 on risk-high
          'critical-fg': '#FFFFFF', // 6.54:1 on risk-critical
        },
      },
      fontFamily: {
        sans: [
          '"IBM Plex Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"IBM Plex Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
      },
      fontSize: {
        // Display / heading scale (IBM Plex Sans)
        'display-2xl': ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-xl': ['2.75rem', { lineHeight: '1.08', letterSpacing: '-0.015em', fontWeight: '600' }],
        'display-lg': ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-xl': ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.005em', fontWeight: '600' }],
        'heading-lg': ['1.5rem', { lineHeight: '1.25', fontWeight: '600' }],
        'heading-md': ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }],
        // Body scale (IBM Plex Sans)
        'body-lg': ['1.0625rem', { lineHeight: '1.6' }],
        body: ['0.9375rem', { lineHeight: '1.6' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em' }],
        // Data / tabular scale (IBM Plex Mono) — reference IDs, coordinates,
        // ledger figures, timestamps.
        'data-lg': ['1.125rem', { lineHeight: '1.4' }],
        data: ['0.875rem', { lineHeight: '1.5' }],
        'data-sm': ['0.75rem', { lineHeight: '1.4' }],
      },
    },
  },
  plugins: [],
};

export default config;
