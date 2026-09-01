import { cn } from "@/lib/utils";
import { type LucideIcon, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface SectionTitleProps {
  icon?: LucideIcon;
  title: string;
  /** Badge count shown beside title */
  badge?: string | number;
  badgeVariant?: "red" | "amber" | "green" | "blue" | "slate" | "electric";
  /** "View all" link */
  viewAll?: { label?: string; href: string };
  className?: string;
  children?: React.ReactNode;
}

const BADGE_MAP = {
  red:      "badge-red",
  amber:    "badge-amber",
  green:    "badge-green",
  blue:     "badge-blue",
  slate:    "badge badge-slate",
  electric: "badge-electric",
};

export default function SectionTitle({
  icon: Icon,
  title,
  badge,
  badgeVariant = "slate",
  viewAll,
  className,
  children,
}: SectionTitleProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 flex-wrap", className)}>
      <div className="flex items-center gap-2">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center ring-1 ring-white/10">
            <Icon className="w-4 h-4 text-electric-400" />
          </div>
        )}
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
          {title}
        </h2>
        {badge !== undefined && (
          <span className={cn("badge text-[10px]", BADGE_MAP[badgeVariant])}>{badge}</span>
        )}
      </div>

      {viewAll && (
        <Link
          to={viewAll.href}
          className="flex items-center gap-1 text-[11px] text-electric-400 hover:text-electric-300 transition-colors font-medium"
        >
          {viewAll.label ?? "View all"}
          <ChevronRight className="w-3 h-3" />
        </Link>
      )}

      {children}
    </div>
  );
}
