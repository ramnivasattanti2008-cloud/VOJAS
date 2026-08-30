import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Rocket } from "lucide-react";
import { TOUR_STEPS } from "./tourSteps";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "vojas.demoTourCompleted";

interface DemoTourProps {
  /** If true, the tour auto-shows on mount (for first-time users) */
  autoShow?: boolean;
  /** Called when the user completes or skips the tour */
  onDismiss?: () => void;
}

export default function DemoTour({ autoShow = false, onDismiss }: DemoTourProps) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const step = TOUR_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  // Auto-show on mount if not previously completed
  useEffect(() => {
    if (autoShow) {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) setOpen(true);
    }
  }, [autoShow]);

  // Also listen for the "Start Demo Tour" button on the dashboard
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem(STORAGE_KEY);
      setStepIndex(0);
      setOpen(true);
    };
    window.addEventListener("vojas:start-tour", handler);
    return () => window.removeEventListener("vojas:start-tour", handler);
  }, []);

  // Navigate to the step's route when it changes
  useEffect(() => {
    if (open && step.route !== location.pathname) {
      navigate(step.route, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIndex]);

  const close = useCallback(() => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "true");
    onDismiss?.();
  }, [onDismiss]);

  // ESC key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  // Move focus to dialog close button when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [open]);

  const next = () => {
    if (isLast) { close(); return; }
    setStepIndex((i) => i + 1);
  };

  const prev = () => {
    if (isFirst) return;
    setStepIndex((i) => i - 1);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — non-blocking, click to dismiss */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
            onClick={close}
          />

          {/* Tour card — bottom-center anchored */}
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] w-[min(520px,calc(100vw-2rem))]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-tour-title"
            aria-live="polite"
          >
            <div className="glass rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              {/* Step header */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Icon + content */}
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                      step.color.includes("electric") ? "bg-electric-500/15 border-electric-500/30" :
                      step.color.includes("red") ? "bg-red-500/15 border-red-500/30" :
                      step.color.includes("amber") ? "bg-amber-500/15 border-amber-500/30" :
                      "bg-saffron-500/15 border-saffron-500/30"
                    )}>
                      <step.Icon className={cn("w-5 h-5", step.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Step {stepIndex + 1} / {TOUR_STEPS.length}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", step.color)}>
                          {step.id}
                        </span>
                      </div>
                      <h2 id="demo-tour-title" className="text-base font-bold text-white leading-tight">{step.title}</h2>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    ref={closeButtonRef}
                    onClick={close}
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                    aria-label="Close demo tour"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 pb-3">
                <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>

                {/* Call to action */}
                <div className={cn(
                  "mt-3 px-3 py-2 rounded-lg border text-xs leading-relaxed",
                  step.color.includes("electric") ? "bg-electric-500/5 border-electric-500/20 text-electric-300" :
                  step.color.includes("red") ? "bg-red-500/5 border-red-500/20 text-red-300" :
                  step.color.includes("amber") ? "bg-amber-500/5 border-amber-500/20 text-amber-300" :
                  "bg-saffron-500/5 border-saffron-500/20 text-saffron-300"
                )}>
                  <span className="font-semibold">Try this: </span>
                  {step.callToAction}
                </div>
              </div>

              {/* Step dots */}
              <div className="px-5 pb-3 flex items-center gap-1.5">
                {TOUR_STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setStepIndex(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-200",
                      i === stepIndex
                        ? "w-5 bg-electric-400"
                        : i < stepIndex
                        ? "w-1.5 bg-slate-600 hover:bg-slate-500"
                        : "w-1.5 bg-slate-700"
                    )}
                    aria-label={`Go to step ${i + 1}: ${s.title}`}
                  />
                ))}
                <span className="ml-auto text-[10px] text-slate-600">ESC to skip</span>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 bg-white/[0.02]">
                <button
                  onClick={prev}
                  disabled={isFirst}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                {isLast ? (
                  <button
                    onClick={close}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-electric-500/15 hover:bg-electric-500/25 border border-electric-500/30 text-electric-400 text-xs font-semibold transition-colors"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    Launch VOJAS
                  </button>
                ) : (
                  <button
                    onClick={next}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-electric-500 hover:bg-electric-600 text-white text-xs font-semibold transition-colors"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
