'use client';

import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, { pill: string; dot: string }> = {
  success: {
    pill: 'bg-[#34C759]/10 text-[#248A3D] border-[#34C759]/20',
    dot: 'bg-[#34C759]',
  },
  warning: {
    pill: 'bg-[#FF9500]/10 text-[#C96B00] border-[#FF9500]/20',
    dot: 'bg-[#FF9500]',
  },
  danger: {
    pill: 'bg-[#FF3B30]/10 text-[#D70015] border-[#FF3B30]/20',
    dot: 'bg-[#FF3B30]',
  },
  info: {
    pill: 'bg-[#007AFF]/10 text-[#0062CC] border-[#007AFF]/20',
    dot: 'bg-[#007AFF]',
  },
  neutral: {
    pill: 'bg-[#8E8E93]/10 text-[#48484A] border-[#8E8E93]/20',
    dot: 'bg-[#8E8E93]',
  },
  primary: {
    pill: 'bg-[#007AFF]/12 text-[#007AFF] border-[#007AFF]/25 font-semibold',
    dot: 'bg-[#007AFF]',
  },
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  const conf = variantClasses[variant] ?? variantClasses.neutral;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight select-none shadow-2xs',
        conf.pill,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', conf.dot)} aria-hidden="true" />
      {children}
    </span>
  );
}
