/**
 * Input — VOJAS premium input system
 *
 * Variants: default | filled | underline | search
 * Features:
 * - Animated focus glow
 * - Icon support (left/right)
 * - Premium placeholder styling
 * - Error state with red border
 * - Help text / error message
 * - Animated label
 */

import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AlertCircle, Eye, EyeOff, Search } from 'lucide-react';

type Variant = 'default' | 'underline' | 'search' | 'glass';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helpText?: string;
  error?: string;
  variant?: Variant;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
  success?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  default:  'bg-navy-900/60 border border-white/10 focus-within:border-electric-500/60 focus-within:bg-navy-900/80',
  underline:'bg-transparent border-b border-white/10 focus-within:border-electric-500 rounded-none',
  search:   'bg-navy-900/60 border border-white/10 focus-within:border-electric-500/60',
  glass:    'bg-white/[0.04] backdrop-blur-md border border-white/10 focus-within:border-white/20 focus-within:bg-white/[0.06]',
};

const SIZE_CLASSES = {
  sm: 'h-9 text-xs',
  md: 'h-11 text-sm',
  lg: 'h-13 text-base',
} as const;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    helpText,
    error,
    variant = 'default',
    iconLeft,
    iconRight,
    inputSize = 'md',
    className,
    type = 'text',
    id,
    success,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'block text-[11px] font-semibold uppercase tracking-wider mb-1.5 transition-colors',
            error ? 'text-red-400' : success ? 'text-green-400' : focused ? 'text-electric-400' : 'text-slate-400'
          )}
        >
          {label}
        </label>
      )}

      <div
        className={cn(
          'relative flex items-center gap-2 rounded-lg transition-all duration-200',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[inputSize],
          variant !== 'underline' && 'px-3',
          error && 'border-red-500/60 focus-within:border-red-500',
          success && 'border-green-500/40 focus-within:border-green-500/70',
          className
        )}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {variant === 'search' && !iconLeft && (
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
        )}
        {iconLeft && variant !== 'search' && (
          <span className="text-slate-500 shrink-0">{iconLeft}</span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={cn(
            'flex-1 bg-transparent text-slate-200 placeholder:text-slate-600',
            'focus:outline-none focus:ring-0',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'font-medium tracking-wide'
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}

        {iconRight && !isPassword && (
          <span className="text-slate-500 shrink-0">{iconRight}</span>
        )}

        {error && (
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
        )}

        {/* Focus glow */}
        <AnimatePresence>
          {focused && variant !== 'underline' && (
            <motion.div
              className="absolute inset-0 -z-10 rounded-lg pointer-events-none"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.4), 0 0 20px rgba(59, 130, 246, 0.2)',
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Help / Error text */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            key="error"
            id={`${inputId}-error`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[11px] text-red-400 mt-1.5 font-medium"
          >
            {error}
          </motion.p>
        )}
        {!error && helpText && (
          <motion.p
            key="help"
            id={`${inputId}-help`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[11px] text-slate-500 mt-1.5"
          >
            {helpText}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

// Textarea
interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  helpText?: string;
  error?: string;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, helpText, error, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'w-full bg-navy-900/60 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200',
          'placeholder:text-slate-600 focus:outline-none focus:border-electric-500/60',
          'transition-all duration-200 min-h-[100px] resize-y',
          error && 'border-red-500/60',
          className
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-red-400 mt-1.5">{error}</p>}
      {!error && helpText && <p className="text-[11px] text-slate-500 mt-1.5">{helpText}</p>}
    </div>
  );
});

// Select
interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  helpText?: string;
  error?: string;
  children: ReactNode;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helpText, error, className, id, children, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'w-full appearance-none bg-navy-900/60 border border-white/10 rounded-lg h-11 px-3 pr-9 text-sm text-slate-200',
            'focus:outline-none focus:border-electric-500/60 cursor-pointer',
            'transition-all duration-200',
            error && 'border-red-500/60',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {error && <p className="text-[11px] text-red-400 mt-1.5">{error}</p>}
      {!error && helpText && <p className="text-[11px] text-slate-500 mt-1.5">{helpText}</p>}
    </div>
  );
});

// Toggle (switch)
interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}
export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className={cn('inline-flex items-center gap-3 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0',
          checked ? 'bg-electric-500' : 'bg-white/10',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-400/50'
        )}
      >
        <motion.span
          className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm"
          animate={{ x: checked ? 16 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
      {label && <span className="text-sm text-slate-300">{label}</span>}
    </label>
  );
}

export default Input;
