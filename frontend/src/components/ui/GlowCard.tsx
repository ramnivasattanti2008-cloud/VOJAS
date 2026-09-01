import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import type { Accent } from "./PageHeader";

interface GlowCardProps {
  children: React.ReactNode;
  /** Top accent color */
  accent?: Accent;
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
  badge?: string | number;
  badgeColor?: "red" | "amber" | "green" | "blue" | "slate";
  className?: string;
  bodyClassName?: string;
  /** Disable the glass effect */
  flat?: boolean;
  onClick?: () => void;
  hoverable?: boolean;
}

const ACCENT_MAP: Record<Accent, { bar: string; halo: string; ring: string; glow: string }> = {
  electric: { bar: "from-electric-500 to-electric-400", halo: "bg-electric-500/20", ring: "ring-electric-500/25", glow: "shadow-electric-500/20" },
  saffron:  { bar: "from-saffron-500 to-saffron-400",  halo: "bg-saffron-500/20",  ring: "ring-saffron-500/25", glow: "shadow-saffron-500/20" },
  green:    { bar: "from-green-500 to-green-400",        halo: "bg-green-500/20",    ring: "ring-green-500/25",  glow: "shadow-green-500/20"  },
  red:      { bar: "from-red-500 to-red-400",            halo: "bg-red-500/20",      ring: "ring-red-500/25",    glow: "shadow-red-500/20"    },
  blue:     { bar: "from-blue-500 to-blue-400",          halo: "bg-blue-500/20",     ring: "ring-blue-500/25",   glow: "shadow-blue-500/20"   },
};

const BADGE_COLORS = {
  red:    "bg-red-500/15 border-red-500/30 text-red-400",
  amber:  "bg-saffron-500/15 border-saffron-500/30 text-saffron-400",
  green:  "bg-green-500/15 border-green-500/30 text-green-400",
  blue:   "bg-blue-500/15 border-blue-500/30 text-blue-400",
  slate:  "bg-white/5 border-white/10 text-slate-400",
};

export default function GlowCard({
  children,
  accent = "electric",
  icon: Icon,
  title,
  subtitle,
  badge,
  badgeColor = "slate",
  className,
  bodyClassName,
  flat,
  onClick,
  hoverable = true,
}: GlowCardProps) {
  const cfg = ACCENT_MAP[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hoverable ? { y: -2 } : undefined}
      onClick={onClick}
      className={cn(
        "rounded-xl overflow-hidden relative",
        flat ? "bg-navy-800/60 border border-white/[0.06]" : "glass border-white/[0.06]",
        hoverable && "cursor-pointer hover:border-white/[0.12] transition-all duration-300",
        cfg.ring,
        className
      )}
      style={hoverable ? { boxShadow: `0 4px 24px -4px ${cfg.glow.replace("shadow-", "rgba(").replace(/\//g, ", ").replace(")", ")")}40` } as React.CSSProperties : undefined}
    >
      {/* Top accent bar */}
      <div className={cn("h-0.5 bg-gradient-to-r origin-left", cfg.bar)} />

      {/* Card header */}
      {(title || Icon || badge) && (
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-0">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center ring-1 ring-white/10">
                <Icon className={cn("w-4 h-4", ACCENT_MAP[accent] ? Object.values(ACCENT_MAP).indexOf(ACCENT_MAP[accent]) >= 0 ? "text-" + accent + "-400" : "text-electric-400" : "text-electric-400")} />
              </div>
            )}
            {title && (
              <div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                {subtitle && <p className="text-[10px] text-slate-600 mt-0.5">{subtitle}</p>}
              </div>
            )}
          </div>
          {badge !== undefined && (
            <span className={cn("badge text-[10px] font-bold", BADGE_COLORS[badgeColor])}>
              {badge}
            </span>
          )}
        </div>
      )}

      {/* Body */}
      <div className={cn("p-4", bodyClassName)}>
        {children}
      </div>
    </motion.div>
  );
}
