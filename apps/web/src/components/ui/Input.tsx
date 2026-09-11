'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-[#1C1C1E] tracking-tight">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full min-h-[44px] px-3.5 py-2.5 rounded-[12px] border text-sm text-[#1C1C1E] placeholder-[#8E8E93]',
            'bg-white shadow-ios-sm transition-all',
            'focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent',
            error
              ? 'border-[#FF3B30] focus:ring-[#FF3B30]'
              : 'border-black/[0.08]',
            'disabled:bg-[#F2F2F7] disabled:text-[#8E8E93] disabled:cursor-not-allowed',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
