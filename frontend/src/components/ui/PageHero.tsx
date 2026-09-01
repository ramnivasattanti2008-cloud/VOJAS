/**
 * PageHero — VOJAS premium page header
 *
 * Top-of-page hero with:
 * - Breadcrumb trail
 * - Title + subtitle
 * - Optional stats strip
 * - Action buttons
 * - Animated entry
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeroProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: ReactNode;
  iconColor?: 'electric' | 'saffron' | 'green' | 'red' | 'blue' | 'purple';
  breadcrumb?: BreadcrumbItem[];
  actions?: ReactNode;
  stats?: { label: string; value: string | number; accent?: 'electric' | 'saffron' | 'green' | 'red' | 'blue'; subtext?: string }[];
  className?: string;
}

const ICON_BG: Record<string, string> = {
  electric: 'bg-electric-500/15 ring-electric-500/25 text-electric-400',
  saffron:  'bg-saffron-500/15 ring-saffron-500/25 text-saffron-400',
  green:    'bg-green-500/15 ring-green-500/25 text-green-400',
  red:      'bg-red-500/15 ring-red-500/25 text-red-400',
  blue:     'bg-blue-500/15 ring-blue-500/25 text-blue-400',
  purple:   'bg-purple-500/15 ring-purple-500/25 text-purple-400',
};

const VALUE_COLOR: Record<string, string> = {
  electric: 'text-electric-400',
  saffron:  'text-saffron-400',
  green:    'text-green-400',
  red:      'text-red-400',
  blue:     'text-blue-400',
};

export function PageHero({
  title, subtitle, description, icon, iconColor = 'electric',
  breadcrumb, actions, stats, className,
}: PageHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn('relative rounded-2xl overflow-hidden mb-6', className)}
      style={{
        background: 'linear-gradient(135deg, rgba(8, 12, 24, 0.9) 0%, rgba(8, 12, 24, 0.5) 100%)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Decorative grid overlay */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top gradient accent bar */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/50 to-transparent" />

      {/* Content */}
      <div className="relative px-6 py-5">
        {/* Breadcrumb */}
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-3" aria-label="Breadcrumb">
            {breadcrumb.map((item, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {item.href ? (
                  <Link to={item.href} className="hover:text-electric-400 transition-colors font-mono uppercase tracking-wider">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-slate-300 font-mono uppercase tracking-wider">{item.label}</span>
                )}
                {i < breadcrumb.length - 1 && <ChevronRight className="w-3 h-3 text-slate-700" />}
              </span>
            ))}
          </nav>
        )}

        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            {icon && (
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center ring-1 shrink-0',
                ICON_BG[iconColor]
              )}>
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {subtitle && (
                <p className="text-[10px] font-bold text-electric-400 uppercase tracking-[0.3em] mb-1">
                  {subtitle}
                </p>
              )}
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
                {title}
              </h1>
              {description && (
                <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                  {description}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {actions}
            </div>
          )}
        </div>

        {/* Stats strip */}
        {stats && stats.length > 0 && (
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
                className="relative rounded-xl px-4 py-3 bg-white/[0.02] border border-white/[0.04] overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className={cn(
                  'text-xl font-bold tabular-nums leading-none',
                  VALUE_COLOR[stat.accent || 'electric']
                )}>
                  {typeof stat.value === 'number' ? stat.value.toLocaleString('en-IN') : stat.value}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-1.5">
                  {stat.label}
                </div>
                {stat.subtext && (
                  <div className="text-[10px] text-slate-600 mt-0.5">
                    {stat.subtext}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default PageHero;
