/**
 * HeroOpening — VOJAS cinematic opening sequence
 *
 * Plays once per browser on first successful login.
 * Duration: 2.8s (first-time) / 0ms skip (returning)
 *
 * Sequence:
 *  t=0ms    → Void (dark bg)
 *  t=200ms  → Particles ignite
 *  t=500ms  → Connections form
 *  t=800ms  → Symbol emerges
 *  t=1100ms → 2D→3D transition
 *  t=1500ms → Globe appears + stars
 *  t=1700ms → Camera moves
 *  t=2000ms → Markers load
 *  t=2400ms → Globe settles (auto-rotate starts)
 *  t=2600ms → Dashboard emerges
 *  t=2800ms → Interactive
 *
 * Skip: click, Esc, any key, or t=400ms+ button.
 * Reduced motion: jump to t=2400ms.
 * Returning user: jump to t=2400ms (localStorage flag).
 */

import { useEffect, useRef, useState, Suspense, lazy, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';

// Lazy-load 3D globe to reduce initial bundle (Vite, not Next.js)
const Globe3D = lazy(() => import('@/components/3d/Globe3D'));

// ── Storage key ──────────────────────────────────────────────────────────
const STORAGE_KEY = "vojas.opening.shown";

// ── Sample markers for demo ────────────────────────────────────────────────
const DEMO_MARKERS = [
  { id: "1", lat: 18.52, lng: 73.86, status: "success" as const, label: "Pune", value: 47 },
  { id: "2", lat: 19.08, lng: 74.74, status: "warning" as const, label: "Ahmednagar", value: 23 },
  { id: "3", lat: 21.15, lng: 79.09, status: "success" as const, label: "Nagpur", value: 31 },
  { id: "4", lat: 19.88, lng: 75.34, status: "danger" as const, label: "Aurangabad", value: 18 },
  { id: "5", lat: 23.02, lng: 72.57, status: "neutral" as const, label: "Ahmedabad", value: 42 },
  { id: "6", lat: 12.97, lng: 77.59, status: "success" as const, label: "Bangalore", value: 55 },
];

// ── Particle positions ──────────────────────────────────────────────────
const PARTICLE_POSITIONS = [
  { x: 25, y: 20 }, { x: 35, y: 35 }, { x: 60, y: 25 }, { x: 70, y: 50 },
  { x: 45, y: 65 }, { x: 80, y: 30 }, { x: 15, y: 60 }, { x: 50, y: 40 },
  { x: 75, y: 70 }, { x: 30, y: 75 }, { x: 55, y: 15 }, { x: 20, y: 45 },
  { x: 65, y: 55 }, { x: 40, y: 30 }, { x: 85, y: 45 }, { x: 10, y: 35 },
];

// ── Props ────────────────────────────────────────────────────────────────

interface HeroOpeningProps {
  /** Children to show after the opening completes */
  children: ReactNode;
  /** Called when opening sequence is done */
  onComplete?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function HeroOpening({ children, onComplete }: HeroOpeningProps) {
  const [phase, setPhase] = useState<"idle" | "dom" | "globe" | "done">("idle");
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [skipped, setSkipped] = useState(false);

  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  // Check if returning user
  const isReturning =
    typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEY) === "1"
      : false;

  useEffect(() => {
    // Immediately complete if returning or reduced motion
    if (isReturning || prefersReducedMotion) {
      setPhase("done");
      setSkipped(true);
      onComplete?.();
      return;
    }

    // Start the sequence after a brief pause
    const startDelay = setTimeout(() => {
      setPhase("dom");
      runSequence();
    }, 300);

    return () => {
      clearTimeout(startDelay);
      timelineRef.current?.kill();
    };
  }, []);

  function runSequence() {
    if (!containerRef.current) return;

    const tl = gsap.timeline({
      onComplete: () => {
        markShown();
        setPhase("done");
        onComplete?.();
      },
    });

    timelineRef.current = tl;

    // t=800ms → symbol emerges
    tl.to(".vojas-symbol", {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      duration: 0.4,
      ease: "power3.out",
    });

    // t=1100ms → symbol pulses + starts 2D→3D
    tl.to(".vojas-symbol", {
      scale: 1.3,
      duration: 0.3,
      ease: "power2.in",
    });

    // t=1400ms → globe phase starts
    tl.call(() => setPhase("globe"), [], 1.4);

    // t=2000ms → markers visible
    tl.to(".marker-item", {
      opacity: 1,
      scale: 1,
      stagger: 0.1,
      duration: 0.3,
      ease: "back.out(1.7)",
    }, 2.0);

    // t=2400ms → sequence complete
    tl.duration(2.4);
  }

  function markShown() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage may be unavailable (private mode / quota)
    }
  }

  function handleSkip() {
    timelineRef.current?.kill();
    markShown();
    setPhase("done");
    onComplete?.();
    setSkipped(true);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
      handleSkip();
    }
  }

  // Keyboard listener
  useEffect(() => {
    if (phase === "dom" || phase === "globe") {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [phase]);

  // Don't render if already done
  if (phase === "done" && skipped) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[90] bg-[#070a10] overflow-hidden"
      onClick={handleSkip}
    >
      {/* ── Stars background ── */}
      <div className="absolute inset-0" aria-hidden="true">
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 1.5 + 0.5}px`,
              height: `${Math.random() * 1.5 + 0.5}px`,
              opacity: Math.random() * 0.5 + 0.2,
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* ── Particles ── */}
      <div className="absolute inset-0" aria-hidden="true">
        {PARTICLE_POSITIONS.map((pos, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 rounded-full bg-white"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.7, scale: 1 }}
            transition={{ delay: i * 0.02 + 0.2, duration: 0.3 }}
            exit={{ opacity: 0, scale: 0 }}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          />
        ))}
      </div>

      {/* ── VOJAS Symbol (2D) ── */}
      <AnimatePresence>
        {phase === "dom" && (
          <motion.div
            className="vojas-symbol absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.5, filter: "blur(12px)" }}
            style={{ opacity: 0, scale: 0.5, filter: "blur(12px)" }}
          >
            <div className="relative">
              {/* Glow */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)",
                  transform: "scale(2)",
                  filter: "blur(20px)",
                }}
              />
              {/* V-Symbol SVG */}
              <svg
                width="96"
                height="96"
                viewBox="0 0 48 48"
                fill="none"
                className="relative z-10"
              >
                <path
                  d="M24 4L6 40h11l3-7 3 7h11L24 4z"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <circle cx="24" cy="22" r="4" fill="#3b82f6" />
                <circle
                  cx="24"
                  cy="22"
                  r="4"
                  fill="#3b82f6"
                  opacity="0.4"
                  style={{ filter: "blur(4px)" }}
                />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3D Globe (R3F Canvas) ── */}
      <AnimatePresence>
        {phase === "globe" && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          >
            <Suspense fallback={null}>
              <Globe3D
                markers={DEMO_MARKERS}
                autoRotate
                showAtmosphere
                showStars
                quality="medium"
                ariaLabel="Interactive 3D globe with MPLAD project locations"
                className="w-full h-full"
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dashboard emergence overlay ── */}
      <AnimatePresence>
        {phase === "globe" && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.4, duration: 0.5 }}
            onAnimationComplete={() => {
              // Sequence done
              markShown();
              setPhase("done");
              onComplete?.();
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Skip button ── */}
      <AnimatePresence>
        {phase === "dom" && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.4 }}
            onClick={(e) => {
              e.stopPropagation();
              handleSkip();
            }}
            className="absolute top-6 right-6 z-10 px-4 py-2 text-xs font-medium text-[#9ba3bf] bg-[#161b2a] border border-[#2e3652] rounded-lg hover:bg-[#1c2236] hover:text-white transition-all duration-200"
          >
            Skip intro →
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Progress indicator ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
        <span className="text-[10px] text-[#4a5374] tracking-widest uppercase font-medium">
          VOJAS
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
      </div>

      {/* CSS for star twinkle */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

// ── Hook for checking if opening was shown ──────────────────────────────
export function useOpeningShown(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

// ── Hook for resetting opening (for testing) ───────────────────────────
export function resetOpening(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage may be unavailable
  }
}
