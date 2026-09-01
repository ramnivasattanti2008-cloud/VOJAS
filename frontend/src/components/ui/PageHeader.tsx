import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { type LucideIcon, ChevronRight } from "lucide-react";

export type Accent = "electric" | "saffron" | "green" | "red" | "blue";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Gradient word in title */
  gradientWord?: string;
  accent?: Accent;
  icon?: LucideIcon;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  className?: string;
}

const ACCENT_CONFIG: Record<Accent, { bar: string; icon: string; badge: string; gradient: string }> = {
  electric: { bar: "from-electric-500 to-electric-400", icon: "text-electric-400", badge: "bg-electric-500/15 border-electric-500/30 text-electric-400", gradient: "from-electric-400 via-electric-300 to-saffron-400" },
  saffron:  { bar: "from-saffron-500 to-saffron-400",  icon: "text-saffron-400",  badge: "bg-saffron-500/15 border-saffron-500/30 text-saffron-400", gradient: "from-saffron-400 to-orange-400" },
  green:    { bar: "from-green-500 to-green-400",    icon: "text-green-400",    badge: "bg-green-500/15 border-green-500/30 text-green-400", gradient: "from-green-400 to-emerald-400" },
  red:      { bar: "from-red-500 to-red-400",          icon: "text-red-400",       badge: "bg-red-500/15 border-red-500/30 text-red-400", gradient: "from-red-400 to-rose-400" },
  blue:     { bar: "from-blue-500 to-blue-400",        icon: "text-blue-400",      badge: "bg-blue-500/15 border-blue-500/30 text-blue-400", gradient: "from-blue-400 to-cyan-400" },
};

export default function PageHeader({
  title,
  subtitle,
  gradientWord,
  accent = "electric",
  icon: Icon,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  const cfg = ACCENT_CONFIG[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex items-start justify-between gap-4 flex-wrap", className)}
    >
      <div className="flex items-start gap-3">
        {/* Vertical accent bar */}
        <div className={cn("w-1 h-10 rounded-full bg-gradient-to-b mt-0.5 shrink-0", cfg.bar)} />

        <div>
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1 mb-1.5">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="w-2.5 h-2.5 text-slate-700" />}
                  {crumb.href ? (
                    <Link
                      to={crumb.href}
                      className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-wider font-medium"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={cn("text-[10px] uppercase tracking-wider font-medium", cfg.icon)}>
                      {crumb.label}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.05] ring-1 ring-white/10", cfg.icon)}>
                <Icon className="w-4.5 h-4.5" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
              {gradientWord ? (
                <>
                  {title.replace(gradientWord, "").trim()}
                  <span className={cn("bg-clip-text text-transparent bg-gradient-to-r", cfg.gradient)}>
                    {" "}{gradientWord}
                  </span>
                </>
              ) : title}
            </h1>
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 ml-[calc(2.25rem+10px)] font-mono">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Action slot */}
      {actions && (
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex items-center gap-2 shrink-0"
        >
          {actions}
        </motion.div>
      )}
    </motion.div>
  );
}
