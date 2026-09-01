import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  /** Current value */
  value: number;
  /** Previous value (or delta percent if `delta` provided instead) */
  previous?: number;
  /** Direct percent delta — overrides previous-based calculation */
  delta?: number;
  /** Format function */
  format?: (v: number) => string;
  /** When true, a negative delta is good (e.g. anomalies down) */
  invertColors?: boolean;
  /** Show absolute value alongside delta */
  showValue?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * A trend indicator with up/down arrow, percent delta, and optional inline value.
 * Renders a subtle horizontal bar visualising magnitude when `previous` is given.
 */
export default function TrendIndicator({
  value, previous, delta, format, invertColors = false, showValue = true, className, size = "sm",
}: TrendIndicatorProps) {
  const computedDelta = delta !== undefined
    ? delta
    : previous !== undefined && previous !== 0
      ? ((value - previous) / previous) * 100
      : 0;

  const isUp = computedDelta > 0;
  const isFlat = computedDelta === 0;
  const isGood = invertColors ? !isUp : isUp;
  const color = isFlat
    ? "text-slate-400"
    : isGood
      ? "text-green-400"
      : "text-red-400";

  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const fmt = format ?? ((v: number) => v.toFixed(1));
  const sizeCls = size === "lg" ? "text-base" : size === "md" ? "text-sm" : "text-xs";

  return (
    <span className={cn("inline-flex items-center gap-1", color, sizeCls, className)}>
      <Icon className={cn(size === "lg" ? "w-3.5 h-3.5" : "w-2.5 h-2.5")} />
      <span className="font-bold tabular-nums">{Math.abs(computedDelta).toFixed(1)}%</span>
      {showValue && (
        <>
          <span className="text-slate-700 mx-0.5">·</span>
          <span className="text-slate-400 tabular-nums">{fmt(value)}</span>
        </>
      )}
    </span>
  );
}

/**
 * Bar-with-trend — bigger visual, a horizontal bar that fills based on delta magnitude.
 * Used in officer "Top projects" / MP "Budget Summary" rows.
 */
export function TrendBar({ value, max = 100, accent = "electric" }: {
  value: number; max?: number; accent?: "electric" | "saffron" | "red" | "green" | "emerald";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colorMap = {
    electric: "from-electric-500 to-electric-400",
    saffron:  "from-saffron-500 to-saffron-400",
    red:      "from-red-500 to-red-400",
    green:    "from-green-500 to-green-400",
    emerald:  "from-emerald-500 to-emerald-400",
  };
  return (
    <div className="h-1.5 w-full bg-navy-800 rounded-full overflow-hidden">
      <motion.div
        className={cn("h-full rounded-full bg-gradient-to-r", colorMap[accent])}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
