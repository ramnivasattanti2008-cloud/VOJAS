/**
 * motion.ts — VOJAS motion design tokens & shared animation variants
 *
 * Duration tokens (ms):
 *   micro  150ms  — hover states, button press
 *   fast   200ms  — tooltip, badge toggle
 *   base   300ms  — default transition
 *   panel  400ms  — card enter, dropdown open
 *   scene  800ms  — page section reveals
 *   epic  1500ms  — cinematic sequence
 *
 * Easing tokens:
 *   smooth  cubic-bezier(0.16, 1, 0.3, 1)
 *   spring  cubic-bezier(0.34, 1.56, 0.64, 1)
 *   spatial cubic-bezier(0.34, 1.2, 0.64, 1)
 *   data    cubic-bezier(0.4, 0, 0.2, 1)
 *   in-out  cubic-bezier(0.65, 0, 0.35, 1)
 */

import type { Variants, Transition } from 'framer-motion';

// ── Duration tokens ──────────────────────────────────────────────────────
export const DUR = {
  micro:  0.15,
  fast:   0.20,
  base:   0.30,
  panel:  0.40,
  scene:  0.80,
  epic:   1.50,
} as const;

// ── Easing tokens (framer-motion format) ───────────────────────────────
export const EASE = {
  smooth:  [0.16, 1, 0.3, 1]   as [number, number, number, number],
  spring:  [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  spatial: [0.34, 1.2, 0.64, 1] as [number, number, number, number],
  data:    [0.4, 0, 0.2, 1]     as [number, number, number, number],
  inOut:   [0.65, 0, 0.35, 1]   as [number, number, number, number],
} as const;

// ── Base transitions ────────────────────────────────────────────────────
export const TRANS = {
  micro:  { duration: DUR.micro, ease: EASE.smooth } as Transition,
  fast:   { duration: DUR.fast,  ease: EASE.smooth } as Transition,
  base:   { duration: DUR.base,  ease: EASE.smooth } as Transition,
  panel:  { duration: DUR.panel, ease: EASE.smooth } as Transition,
  scene:  { duration: DUR.scene, ease: EASE.smooth } as Transition,
} as const;

// ── Shared variants ─────────────────────────────────────────────────────

/** Staggered fade-up — use with staggerChildren on parent */
export const fadeUpStagger: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: DUR.panel, ease: EASE.smooth },
  }),
};

/** Stagger container for fade-up children */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

/** Card hover: subtle lift + shadow intensify */
export const cardHover = {
  rest:    { y: 0,     boxShadow: '0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(46,54,82,0.6)' },
  hover:   { y: -2,   boxShadow: '0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(59,130,246,0.3)', transition: TRANS.fast },
  tap:     { scale: 0.98, transition: TRANS.micro },
};

/** Modal: emerges from depth */
export const modalEnter: Variants = {
  hidden:  { opacity: 0, scale: 0.95, y: 24 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { duration: DUR.panel, ease: EASE.spatial } },
  exit:    { opacity: 0, scale: 0.97, y: 8,  transition: { duration: DUR.fast,  ease: EASE.inOut } },
};

/** Overlay fade */
export const overlayFade: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.base, ease: 'easeOut' } },
  exit:    { opacity: 0, transition: { duration: DUR.fast, ease: 'easeIn' } },
};

/** Page section reveal */
export const sectionReveal: Variants = {
  hidden:  { opacity: 0, y: 24, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)',  transition: { duration: DUR.scene, ease: EASE.smooth } },
};

/** List item: slide in from left */
export const listItemSlide: Variants = {
  hidden:  { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.05, duration: DUR.panel, ease: EASE.smooth },
  }),
};

/** Number counter — animate from 0 to target value */
export function counterVariant(): Variants {
  return {
    hidden:  { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1, scale: 1,
      transition: { duration: DUR.scene, ease: EASE.spatial },
    },
  };
}

/** Pulse glow for live indicators */
export const pulseGlow: Variants = {
  initial: { opacity: 0.4, scale: 1 },
  pulse:   { opacity: 1,   scale: 1.05, transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } },
};

/** Skeleton shimmer */
export const shimmer: Variants = {
  animate: {
    backgroundPosition: ['-200% 0', '200% 0'],
    transition: { duration: 2, repeat: Infinity, ease: 'linear' },
  },
};
