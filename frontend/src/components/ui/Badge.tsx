import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Badge — VOJAS 2.0 light theme.
 * Compact status indicator following IBM Carbon's tag pattern.
 * No glow, no pulse, no glassmorphism — just a clean pill with a colored dot.
 */

type BadgeVariant =
  | "red" | "amber" | "green" | "blue"
  | "slate" | "electric" | "emerald" | "saffron" | "neutral";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: LucideIcon;
  dot?: boolean;
  /** @deprecated No-op in light theme; kept for backward compatibility */
  pulse?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md";
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string; dot: string; border: string }> = {
  red:     { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500",    border: "border-red-200"    },
  amber:   { bg: "bg-amber-50",  text: "text-amber-800",  dot: "bg-amber-500",  border: "border-amber-200"  },
  saffron: { bg: "bg-orange-50", text: "text-orange-800", dot: "bg-orange-500", border: "border-orange-200" },
  green:   { bg: "bg-green-50",  text: "text-green-800",  dot: "bg-green-500",  border: "border-green-200"  },
  blue:    { bg: "bg-blue-50",   text: "text-blue-800",   dot: "bg-blue-500",   border: "border-blue-200"   },
  electric:{ bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-electric-500", border: "border-blue-200" },
  emerald: { bg: "bg-emerald-50",text: "text-emerald-800",dot: "bg-emerald-500",border: "border-emerald-200"},
  slate:   { bg: "bg-gray-100",  text: "text-gray-700",   dot: "bg-gray-500",   border: "border-gray-200"   },
  neutral: { bg: "bg-gray-50",   text: "text-gray-700",   dot: "bg-gray-400",   border: "border-gray-200"   },
};

const SIZE_STYLES = {
  xs: "text-[10px] px-1.5 py-0.5 gap-1",
  sm: "text-[11px] px-2 py-0.5 gap-1.5",
  md: "text-xs px-2.5 py-1 gap-1.5",
};

export function Badge({
  children,
  variant = "slate",
  icon: Icon,
  dot,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pulse: _pulse, // kept for backward compat
  className,
  size = "sm",
}: BadgeProps) {
  const styles = VARIANT_STYLES[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-medium tracking-wide",
        styles.bg,
        styles.text,
        styles.border,
        SIZE_STYLES[size],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", styles.dot)} />}
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {children}
    </span>
  );
}

/** Status badge with auto-color from status string */
export function StatusBadge({ status }: { status: string }) {
  const lower = status?.toLowerCase() ?? "";
  const variant: BadgeVariant =
    lower.includes("open") || lower.includes("pending") || lower.includes("active") || lower.includes("in_progress") ? "amber" :
    lower.includes("closed") || lower.includes("resolved") || lower.includes("completed") || lower.includes("verified") ? "green" :
    lower.includes("critical") || lower.includes("high") ? "red" :
    lower.includes("medium") ? "amber" :
    "neutral";

  return (
    <Badge variant={variant} dot>
      {status}
    </Badge>
  );
}

/** Severity badge (red/amber/yellow/green) */
export function SeverityBadge({ severity }: { severity: string }) {
  const lower = severity?.toLowerCase() ?? "";
  const variant: BadgeVariant =
    lower === "critical" ? "red" :
    lower === "high" ? "amber" :
    lower === "medium" ? "saffron" :
    lower === "low" ? "green" :
    "neutral";
  return (
    <Badge variant={variant} dot>
      {severity}
    </Badge>
  );
}
