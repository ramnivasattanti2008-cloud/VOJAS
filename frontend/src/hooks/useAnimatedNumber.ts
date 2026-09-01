/**
 * useAnimatedNumber — count-up animation hook
 *
 * Uses requestAnimationFrame for smooth 60fps counting.
 * Supports easing functions, formatting, and restart capability.
 */

import { useEffect, useRef, useState } from 'react';

type Easing = 'linear' | 'easeOut' | 'easeIn' | 'easeInOut' | 'spring';

const EASING_FN: Record<Easing, (t: number) => number> = {
  linear:    (t) => t,
  easeOut:   (t) => 1 - Math.pow(1 - t, 3), // cubic ease-out
  easeIn:    (t) => t * t * t,
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  spring:    (t) => {
    // Spring overshoot
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
};

interface UseAnimatedNumberOptions {
  duration?: number;
  easing?: Easing;
  start?: number;
  delay?: number;
  decimals?: number;
  enabled?: boolean;
}

export function useAnimatedNumber(
  target: number,
  options: UseAnimatedNumberOptions = {}
) {
  const { duration = 1200, easing = 'easeOut', start = 0, delay = 0, decimals = 0, enabled = true } = options;
  const [value, setValue] = useState(start);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const delayTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }

    // Reset to start
    setValue(start);
    startTimeRef.current = null;

    const startAnim = () => {
      const tick = (now: number) => {
        if (!startTimeRef.current) startTimeRef.current = now;
        const elapsed = now - startTimeRef.current;
        const t = Math.min(elapsed / duration, 1);
        const eased = EASING_FN[easing](t);
        const current = start + (target - start) * eased;
        setValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current));

        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setValue(target);
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    if (delay > 0) {
      delayTimerRef.current = window.setTimeout(startAnim, delay);
    } else {
      startAnim();
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    };
  }, [target, duration, easing, start, delay, decimals, enabled]);

  return value;
}

// Helper: format number for display
export function formatNumber(v: number, opts: { compact?: boolean; decimals?: number; prefix?: string; suffix?: string } = {}): string {
  const { compact = false, decimals = 0, prefix = '', suffix = '' } = opts;
  if (compact) {
    if (v >= 1_00_00_000) return `${prefix}${(v / 1_00_00_000).toFixed(2)} Cr${suffix}`;
    if (v >= 1_00_000) return `${prefix}${(v / 1_00_000).toFixed(1)} L${suffix}`;
    if (v >= 1_000) return `${prefix}${(v / 1_000).toFixed(1)}K${suffix}`;
  }
  return `${prefix}${decimals > 0 ? v.toFixed(decimals) : Math.floor(v).toLocaleString('en-IN')}${suffix}`;
}
