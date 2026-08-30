import { useEffect, useState } from "react";

/**
 * Animate from 0 to target value over `duration` ms using easing.
 * GPU-friendly (no layout thrash) and pauses when document is hidden.
 */
export function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    let raf = 0;
    let start: number | null = null;
    let cancelled = false;

    const step = (ts: number) => {
      if (cancelled) return;
      if (start === null) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic — fast then slow settle
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    raf = requestAnimationFrame(step);

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else {
        start = null;
        raf = requestAnimationFrame(step);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [target, duration]);

  return value;
}
