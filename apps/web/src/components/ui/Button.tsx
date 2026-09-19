'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[#007AFF] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:bg-[#0071EB] active:bg-[#0064D1]',
  secondary: 'bg-[#F2F2F7] text-[#1C1C1E] hover:bg-[#E5E5EA] active:bg-[#D1D1D6]',
  ghost: 'bg-transparent text-[#007AFF] hover:bg-[#007AFF]/[0.08] active:bg-[#007AFF]/[0.14]',
  danger: 'bg-[#FF3B30] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:bg-[#EB362C] active:bg-[#D13026]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[13px] rounded-[10px]',
  md: 'h-11 px-4 text-[15px] rounded-[12px]',
  lg: 'h-[52px] px-6 text-[16px] rounded-[14px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  children,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold tracking-[-0.01em]',
        'transition-[background-color,transform] duration-150 ease-out',
        'active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2',
        'disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
});
Button.displayName = 'Button';
