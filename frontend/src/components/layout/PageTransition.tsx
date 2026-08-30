/**
 * PageTransition — cinematic route-level transition wrapper.
 *
 * Replaces the default browser fade with a layered depth transition:
 *   - Current page slides + fades out (depth exit)
 *   - New page fades in with slight upward motion (spatial entry)
 *   - Subtle border reveal on the container
 *
 * Uses Framer Motion AnimatePresence under the hood.
 * Must be used with React Router's useLocation as key.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useState, useEffect, type ReactNode } from "react";
import type { Variants } from "framer-motion";

interface PageTransitionProps {
  children: ReactNode;
}

/** Reads the current route location — import this and pass as `location` */
export function usePageLocation() {
  return useLocation();
}

const variants: Variants = {
  enter: {
    opacity: 0,
    y: 12,
    filter: "blur(4px)",
  },
  center: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(2px)",
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1] as [number, number, number, number],
    },
  },
};

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [key, setKey] = useState(location.pathname);

  // Update key on route change — triggers exit/enter animation
  useEffect(() => {
    if (location.pathname !== key) {
      setKey(location.pathname);
    }
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        style={{ transformOrigin: "top center" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
