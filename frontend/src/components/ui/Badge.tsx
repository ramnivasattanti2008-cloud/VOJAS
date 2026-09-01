import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type BadgeVariant = "red" | "amber" | "green" | "blue" | "slate" | "electric" | "emerald" | "saffron";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: LucideIcon;
  dot?: boolean; // tiny pulsing dot prefix
  pulse?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md";
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  red:     "bg-red-500/15 border-red-500/30 text-red-400",
  amber:   "bg-amber-500/15 border-amber-500/30 text-amber-400",
  saffron: "bg-saffron-500/15 border-saffron-500/30 text-saffron-400",
  green:   "bg-green-500/15 border-green-500/30 text-green-400",
  blue:    "bg-blue-500/15 border-blue-500/30 text-blue-400",
  slate:   "bg-white/5 border-white/10 text-slate-400",
  electric:"bg-electric-500/15 border-electric-500/30 text-electric-400",
  emerald: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
};

const SIZE_STYLES = {
  xs: "text-[9px] px-1.5 py-0.5",
  sm: "text-[10px] px-2 py-0.5",
  md: "text-[11px] px-2.5 py-1",
};

export function Badge({
  children,
  variant = "slate",
  icon: Icon,
  dot,
  pulse,
  className,
  size = "sm",
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold tracking-wide",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "relative flex h-1.5 w-1.5 shrink-0",
            pulse && "animate-ping"
          )}
        >
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75",
              variant === "red"    ? "bg-red-400"    :
              variant === "amber"  ? "bg-amber-400"  :
              variant === "saffron"? "bg-saffron-400" :
              variant === "green"  ? "bg-green-400"   :
              variant === "blue"   ? "bg-blue-400"    :
              variant === "emerald"? "bg-emerald-400" :
              "bg-slate-400"
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              variant === "red"    ? "bg-red-400"    :
              variant === "amber"  ? "bg-amber-400"  :
              variant === "saffron"? "bg-saffron-400" :
              variant === "green"  ? "bg-green-400"   :
              variant === "blue"   ? "bg-blue-400"    :
              variant === "emerald"? "bg-emerald-400" :
              "bg-slate-400"
            )}
          />
        </span>
      )}
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {children}
    </span>
  );
}

/** Status badge with auto dot — color from status string */
export function StatusBadge({ status }: { status: string }) {
  const lower = status?.toLowerCase() ?? "";
  const variant: BadgeVariant =
    lower.includes("open") || lower.includes("pending") || lower.includes("active") ? "amber" :
    lower.includes("closed") || lower.includes("resolved") || lower.includes("completed") || lower.includes("verified") ? "green" :
    lower.includes("critical") || lower.includes("high") ? "red" :
    lower.includes("medium") ? "amber" :
    "slate";

  return (
    <Badge variant={variant} dot pulse>
      {status}
    </Badge>
  );
}
