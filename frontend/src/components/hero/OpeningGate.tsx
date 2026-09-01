/**
 * OpeningGate — Plays HeroOpening once on first protected route visit.
 *
 * Reads the localStorage flag set by HeroOpening itself, so subsequent
 * navigations skip the sequence. Returning user → no animation.
 * Reduced motion → no animation. First-time user → full 2.8s sequence.
 */

import { useState, type ReactNode } from 'react';
import HeroOpening from './HeroOpening';

export default function OpeningGate({ children }: { children: ReactNode }) {
  const [showOpening, setShowOpening] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Skip immediately if reduced motion or returning user
    const reduced =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const returning = localStorage.getItem('vojas.opening.shown') === '1';
    return !reduced && !returning;
  });

  if (showOpening) {
    return (
      <HeroOpening onComplete={() => setShowOpening(false)}>
        {children}
      </HeroOpening>
    );
  }
  return <>{children}</>;
}
