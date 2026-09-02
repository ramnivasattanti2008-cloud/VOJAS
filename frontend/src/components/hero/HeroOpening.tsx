/**
 * HeroOpening — VOJAS cinematic boot sequence
 *
 * Plays ONCE per session (localStorage flag).
 * A 2.5-second visual sequence that builds anticipation
 * before the dashboard loads:
 *
 *   0.0s  Dark void
 *   0.3s  Logo mark fades in with glow pulse
 *   0.8s  "VOJAS" wordmark types in
 *   1.2s  Tagline appears
 *   1.6s  Subtle scan line sweeps across
 *   2.0s  Full panel expands
 *   2.4s  "ENTER COMMAND CENTER" button appears
 *   2.6s  Skip hint appears
 *
 * Respects prefers-reduced-motion.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LogoAnimated } from '@/components/brand/Logo';

// ── Particle field (ambient dots) ─────────────────────────────────────────────

function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {Array.from({ length: 60 }).map((_, i) => {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = Math.random() * 2 + 1;
        const delay = Math.random() * 2;
        const duration = Math.random() * 3 + 4;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 0.6, 0], scale: [0, 1, 0] }}
            transition={{ delay, duration, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute rounded-full bg-electric-400"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Scan line ───────────────────────────────────────────────────────────────────

function ScanLine() {
  return (
    <motion.div
      initial={{ top: '-10%', opacity: 0 }}
      animate={{ top: '110%', opacity: [0, 0.4, 0] }}
      transition={{ delay: 1.6, duration: 0.8, ease: 'linear' }}
      className="absolute left-0 right-0 h-0.5 pointer-events-none"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.6) 30%, rgba(6,182,212,0.8) 50%, rgba(6,182,212,0.6) 70%, transparent 100%)',
        boxShadow: '0 0 20px rgba(6,182,212,0.5), 0 0 40px rgba(6,182,212,0.2)',
      }}
      aria-hidden="true"
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface HeroOpeningProps {
  onComplete: () => void;
}

const SESSION_KEY = 'vojas_opening_done';

export default function HeroOpening({ onComplete }: HeroOpeningProps) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);
  const [canSkip, setCanSkip] = useState(false);
  const completed = useRef(false);

  useEffect(() => {
    // Check if already shown this session
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        onComplete();
        return;
      }
    } catch {
      // sessionStorage not available — proceed normally
    }

    // Respect reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      onComplete();
      return;
    }

    // Show skip hint after 1.5s
    const skipTimer = setTimeout(() => setCanSkip(true), 1500);

    // Auto-complete after 3.2s
    const autoTimer = setTimeout(() => {
      complete();
    }, 3200);

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(autoTimer);
    };
  }, []);

  function complete() {
    if (completed.current) return;
    completed.current = true;
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {
      // sessionStorage not available — skip silently
    }
    setVisible(false);
    // Small delay for exit animation
    setTimeout(onComplete, 400);
  }

  function handleEnter() {
    complete();
    navigate('/');
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-navy-950 overflow-hidden"
        >
          {/* Deep void background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 60% 40% at 50% 50%, #0a0e1a 0%, #000000 100%)',
            }}
          />

          {/* Particles */}
          <Particles />

          {/* Center content */}
          <div className="relative z-10 text-center max-w-sm mx-auto px-8">
            {/* Logo mark */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
              className="mb-6"
            >
              <LogoAnimated className="mx-auto" />
            </motion.div>

            {/* Wordmark */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="text-3xl font-bold text-white tracking-[0.25em] mb-2">
                VOJAS
              </h1>
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="text-xs text-slate-500 tracking-[0.3em] uppercase mb-8"
            >
              Spatial Intelligence Platform
            </motion.p>

            {/* Status bar */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.6 }}
              className="flex items-center justify-center gap-4 mb-10"
            >
              {[
                { label: 'AI', color: '#06b6d4' },
                { label: 'GEO', color: '#22d3ee' },
                { label: 'RISK', color: '#67e8f9' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[9px] text-slate-500 font-mono tracking-widest">{label}</span>
                </div>
              ))}
            </motion.div>

            {/* Enter button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 2.2, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleEnter}
              className={cn(
                'inline-flex items-center gap-3 px-6 py-3 rounded-xl',
                'bg-gradient-to-br from-electric-600 to-electric-700',
                'text-white text-sm font-semibold tracking-wide',
                'shadow-lg shadow-electric-500/40',
                'hover:shadow-electric-500/60 hover:from-electric-500 hover:to-electric-600',
                'transition-all duration-200 cursor-pointer',
                'border border-electric-400/20',
              )}
            >
              <span>ENTER COMMAND CENTER</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </motion.button>
          </div>

          {/* Scan line */}
          <ScanLine />

          {/* Skip hint */}
          <AnimatePresence>
            {canSkip && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute bottom-8 left-0 right-0 text-center"
              >
                <button
                  onClick={complete}
                  className="text-[10px] text-slate-700 hover:text-slate-500 font-mono tracking-widest uppercase transition-colors"
                >
                  Press any key or click to skip
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Corner brackets */}
          <div className="absolute top-6 left-6 w-8 h-8 border-l-2 border-t-2 border-electric-500/20" />
          <div className="absolute top-6 right-6 w-8 h-8 border-r-2 border-t-2 border-electric-500/20" />
          <div className="absolute bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 border-electric-500/10" />
          <div className="absolute bottom-6 right-6 w-8 h-8 border-r-2 border-b-2 border-electric-500/10" />

          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/30 to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
