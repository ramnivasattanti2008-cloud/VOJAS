import type { Variants, Transition } from "framer-motion";

/** Standard ease used across the VOJAS UI */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Fade + slide up entrance — use with variants={fadeUp} */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: {
      delay: i * 0.07,
      duration: 0.5,
      ease: EASE,
    } as Transition,
  }),
};

/** Stagger container for child fadeUp items */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

/** Page-level fade in (blur-to-sharp) */
export const blurIn: Variants = {
  hidden: { opacity: 0, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: EASE },
  },
};

/** Scale in from slightly smaller */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: (i: number = 0) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.06, duration: 0.5, ease: EASE },
  }),
};

/** Slide in from the left */
export const slideLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number = 0) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: EASE },
  }),
};

/** Stagger children: pass as variants to parent, then use fadeUp for children */
export function useStaggerDelay(index: number, baseDelay = 0.1) {
  return { delay: baseDelay + index * 0.06 };
}
