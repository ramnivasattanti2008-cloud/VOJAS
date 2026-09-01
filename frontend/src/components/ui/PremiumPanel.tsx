/**
 * PremiumPanel — VOJAS spatial panel primitive
 *
 * The foundation of all content surfaces:
 * - Glass background with backdrop blur
 * - Top gradient accent bar (1px)
 * - Corner bracket decorations
 * - Optional header with title + actions
 * - Hover: subtle elevation increase
 *
 * Variants: glass | flat | elevated | outline
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Accent = 'electric' | 'saffron' | 'green' | 'red' | 'blue' | 'purple' | 'none';

interface PanelProps {
  children: ReactNode;
  accent?: Accent;
  variant?: 'glass' | 'flat' | 'elevated' | 'outline';
  hoverable?: boolean;
  className?: string;
  showCorners?: boolean;
  onClick?: () => void;
  as?: 'div' | 'section' | 'article';
}

const ACCENT_GRADIENT: Record<Accent, string> = {
  electric: 'via-electric-500/60',
  saffron:  'via-saffron-500/60',
  green:    'via-green-500/60',
  red:      'via-red-500/60',
  blue:     'via-blue-500/60',
  purple:   'via-purple-500/60',
  none:     '',
};

const VARIANT_CLASSES = {
  glass:     'bg-[#080c18]/85 backdrop-blur-xl border border-white/[0.06] ring-1 ring-white/[0.03]',
  flat:      'bg-[#0a0e1a] border border-white/[0.04]',
  elevated:  'bg-[#080c18]/95 backdrop-blur-xl border border-white/[0.08] ring-1 ring-white/[0.04] shadow-2xl shadow-black/40',
  outline:   'bg-transparent border border-white/[0.08]',
};

export function Panel({
  children,
  accent = 'electric',
  variant = 'glass',
  hoverable = false,
  className,
  showCorners = true,
  onClick,
  as = 'div',
}: PanelProps) {
  const Tag = as as any;
  const isInteractive = !!onClick;

  return (
    <Tag
      onClick={onClick}
      className={cn(
        'relative rounded-2xl overflow-hidden',
        VARIANT_CLASSES[variant],
        hoverable && 'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/30 hover:border-white/10',
        isInteractive && 'cursor-pointer',
        className
      )}
    >
      {/* Top gradient accent bar */}
      {accent !== 'none' && (
        <div
          className={cn(
            'absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent',
            ACCENT_GRADIENT[accent]
          )}
        />
      )}

      {/* Corner brackets (decorative) */}
      {showCorners && (
        <>
          <div className="absolute top-2 left-2 w-2 h-2 border-l border-t border-white/10 pointer-events-none" />
          <div className="absolute top-2 right-2 w-2 h-2 border-r border-t border-white/10 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-l border-b border-white/10 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-2 h-2 border-r border-b border-white/10 pointer-events-none" />
        </>
      )}

      {children}
    </Tag>
  );
}

interface PanelHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  accent?: Accent;
  className?: string;
}

export function PanelHeader({ icon, title, subtitle, actions, badge, accent = 'electric', className }: PanelHeaderProps) {
  const accentText: Record<Accent, string> = {
    electric: 'text-electric-400',
    saffron:  'text-saffron-400',
    green:    'text-green-400',
    red:      'text-red-400',
    blue:     'text-blue-400',
    purple:   'text-purple-400',
    none:     'text-slate-400',
  };

  return (
    <div className={cn('flex items-center justify-between gap-4 px-5 pt-4 pb-3', className)}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {icon && <span className={cn('shrink-0', accentText[accent])}>{icon}</span>}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight truncate">{title}</h3>
            {badge}
          </div>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export default Panel;
