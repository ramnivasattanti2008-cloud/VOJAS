import { cn } from "@/lib/utils";

/**
 * Shimmer skeleton — premium loading state with a moving gradient.
 * Renders a placeholder that gently pulses while data loads.
 */
export interface SkeletonProps {
  className?: string;
  /** Use "card" for a 16px rounded glass-like surface, "block" for a simple bar */
  variant?: "block" | "card" | "circle" | "text";
}

export default function Skeleton({ className, variant = "block" }: SkeletonProps) {
  return (
    <div
      role="presentation"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "relative overflow-hidden bg-white/[0.04]",
        variant === "card"   && "rounded-xl",
        variant === "circle" && "rounded-full",
        variant === "text"   && "rounded h-3",
        variant === "block"  && "rounded-md",
        className
      )}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
        }}
        aria-hidden
      />
    </div>
  );
}

/**
 * Card-shaped skeleton with a label/value/icon layout — matches the dashboard's
 * Command Center stat blocks.
 */
export function SkeletonStatCard() {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton variant="circle" className="w-10 h-10" />
        <Skeleton className="h-2 w-16 ml-auto" />
      </div>
      <Skeleton className="h-7 w-24 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/**
 * Row-shaped skeleton — for project lists, anomaly rows, etc.
 */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton variant="circle" className="w-8 h-8 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
      <Skeleton className="h-2 w-12" />
    </div>
  );
}
