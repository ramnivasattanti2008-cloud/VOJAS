import { motion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

interface RibbonGaugeProps {
  /** 0–100 */
  value: number;
  label: string;
  size?: number;
  thickness?: number;
  color?: "electric" | "saffron" | "red" | "green";
  className?: string;
  /** Show the value as a big number in the middle */
  showValue?: boolean;
  /** Sub-label under the value */
  sublabel?: string;
}

const COLOR_MAP: Record<NonNullable<RibbonGaugeProps["color"]>, { stroke: string; glow: string; text: string }> = {
  electric: { stroke: "#3b82f6", glow: "rgba(59, 130, 246, 0.5)",  text: "text-electric-400" },
  saffron:  { stroke: "#fbbf24", glow: "rgba(251, 191, 36, 0.5)",  text: "text-saffron-400"  },
  red:      { stroke: "#ef4444", glow: "rgba(239, 68, 68, 0.5)",   text: "text-red-400"      },
  green:    { stroke: "#22c55e", glow: "rgba(34, 197, 94, 0.5)",   text: "text-green-400"    },
};

/**
 * Big circular progress ring — animated SVG with gradient stroke,
 * glow filter, and a counter that counts up to the target %.
 */
export default function RibbonGauge({
  value,
  label,
  size = 180,
  thickness = 12,
  color = "electric",
  className,
  showValue = true,
  sublabel,
}: RibbonGaugeProps) {
  const animated = useCountUp(value, 1800);
  const palette = COLOR_MAP[color];

  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, animated));
  const offset = C - (pct / 100) * C;

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background ring */}
        <svg
          width={size}
          height={size}
          className="absolute inset-0 -rotate-90"
          aria-hidden
        >
          <defs>
            <linearGradient id={`ring-grad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={palette.stroke} stopOpacity="0.3" />
              <stop offset="100%" stopColor={palette.stroke} stopOpacity="1" />
            </linearGradient>
            <filter id={`ring-glow-${color}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={thickness}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#ring-grad-${color})`}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            filter={`url(#ring-glow-${color})`}
            style={{ filter: `drop-shadow(0 0 8px ${palette.glow})` }}
          />
        </svg>

        {/* Center value */}
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={cn("text-4xl font-bold tracking-tight tabular-nums", palette.text)}
              style={{ textShadow: `0 0 24px ${palette.glow}` }}
            >
              {pct.toFixed(0)}%
            </motion.span>
            {sublabel && (
              <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{sublabel}</span>
            )}
          </div>
        )}
      </div>
      {label && (
        <p className="text-xs text-slate-300 font-medium mt-3 uppercase tracking-wider">{label}</p>
      )}
    </div>
  );
}
