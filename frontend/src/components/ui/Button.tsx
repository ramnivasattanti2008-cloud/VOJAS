/**
 * Button — VOJAS premium button system
 *
 * Variants: primary | secondary | ghost | danger | glass
 * Sizes: sm | md | lg
 * States: default | hover | active | disabled | loading
 *
 * Features:
 * - Gradient fills with glow shadows
 * - Press effect (scale 0.98)
 * - Loading spinner state
 * - Icon support (left/right)
 * - Accent color system
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass' | 'outline';
type Size    = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingText?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  accent?: 'electric' | 'saffron' | 'green' | 'red' | 'blue' | 'purple';
  glow?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:   'bg-gradient-to-br from-electric-500 to-electric-600 text-white shadow-lg shadow-electric-500/30 hover:shadow-electric-500/50 hover:from-electric-400 hover:to-electric-500 active:from-electric-600 active:to-electric-700',
  secondary: 'bg-navy-700 text-slate-200 border border-white/10 hover:bg-navy-600 hover:border-white/20 active:bg-navy-800',
  ghost:     'bg-transparent text-slate-300 hover:bg-white/5 hover:text-white active:bg-white/10',
  danger:    'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:from-red-500 hover:to-red-600 active:from-red-700 active:to-red-800',
  glass:     'bg-white/5 backdrop-blur-sm border border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20 active:bg-white/5',
  outline:   'bg-transparent text-electric-400 border border-electric-500/40 hover:bg-electric-500/10 hover:border-electric-500/60 active:bg-electric-500/20',
};

const ACCENT_GLOW: Record<string, string> = {
  electric: 'shadow-electric-500/30 hover:shadow-electric-500/50',
  saffron:  'shadow-saffron-500/30 hover:shadow-saffron-500/50',
  green:    'shadow-green-500/30 hover:shadow-green-500/50',
  red:      'shadow-red-500/30 hover:shadow-red-500/50',
  blue:     'shadow-blue-500/30 hover:shadow-blue-500/50',
  purple:   'shadow-purple-500/30 hover:shadow-purple-500/50',
};

const SIZE_CLASSES: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-[11px] gap-1 rounded-md',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-5 text-base gap-2.5 rounded-xl',
  xl: 'h-14 px-6 text-base gap-3 rounded-xl',
};

const ICON_SIZE: Record<Size, string> = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-5 h-5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    iconLeft,
    iconRight,
    accent = 'electric',
    glow = false,
    fullWidth = false,
    className,
    children,
    disabled,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;
  const baseClasses = VARIANT_CLASSES[variant];

  // Override glow for accent-colored buttons
  const glowClass = glow && variant === 'primary' ? ACCENT_GLOW[accent] || '' : '';

  return (
    <motion.button
      ref={ref}
      whileHover={!isDisabled ? { scale: 1.02 } : undefined}
      whileTap={!isDisabled ? { scale: 0.97 } : undefined}
      transition={{ duration: 0.15 }}
      disabled={isDisabled}
      className={cn(
        'relative inline-flex items-center justify-center font-semibold',
        'transition-all duration-200 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
        baseClasses,
        glowClass,
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        className
      )}
      {...(props as HTMLMotionProps<'button'>)}
    >
      {/* Shimmer overlay on hover */}
      <span
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-inherit"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
          transform: 'translateX(-100%)',
        }}
      />

      {/* Loading spinner */}
      {loading ? (
        <>
          <Loader2 className={cn(ICON_SIZE[size], 'animate-spin shrink-0')} />
          {loadingText && <span>{loadingText}</span>}
        </>
      ) : (
        <>
          {iconLeft && <span className={cn(ICON_SIZE[size], 'flex items-center shrink-0')}>{iconLeft}</span>}
          <span>{children}</span>
          {iconRight && <span className={cn(ICON_SIZE[size], 'flex items-center shrink-0')}>{iconRight}</span>}
        </>
      )}
    </motion.button>
  );
});

// Icon-only button
export function IconButton({
  children,
  variant = 'ghost',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn('!p-0 aspect-square !rounded-full', className)}
      {...props}
    >
      {children}
    </Button>
  );
}

// Pill button (for tags/badges)
export function PillButton({
  children,
  active = false,
  className,
  ...props
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
} & Omit<ButtonProps, 'variant' | 'size'>) {
  return (
    <Button
      variant={active ? 'primary' : 'glass'}
      size="sm"
      className={cn(
        '!rounded-full !px-3 !py-1',
        active && 'shadow-electric-500/20',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export default Button;
