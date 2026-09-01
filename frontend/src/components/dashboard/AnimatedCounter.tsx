import { useEffect, useState, useRef } from "react";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Format function */
  format?: (v: number) => string;
  className?: string;
  /** Trigger animation only when scrolled into view (default true) */
  whenInView?: boolean;
  /** Suffix string (e.g. " Cr") */
  suffix?: string;
  /** Prefix string (e.g. "₹") */
  prefix?: string;
}

/**
 * Smoothly counts up to the target value when in view. Uses framer-motion's
 * animation engine for buttery 60fps interpolation.
 */
export default function AnimatedCounter({
  value, duration = 1.6, format, className, whenInView = true, suffix = "", prefix = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (latest) => {
    if (format) return format(latest);
    return Math.round(latest).toLocaleString("en-IN");
  });
  const [text, setText] = useState("0");

  useEffect(() => {
    if (whenInView && !inView) return;
    const controls = animate(motionValue, value, { duration, ease: [0.16, 1, 0.3, 1] });
    const unsub = display.on("change", setText);
    return () => { controls.stop(); unsub(); };
  }, [value, duration, whenInView, inView, motionValue, display]);

  return (
    <motion.span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}{text}{suffix}
    </motion.span>
  );
}
