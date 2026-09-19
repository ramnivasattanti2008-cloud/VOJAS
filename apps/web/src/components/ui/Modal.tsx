'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Save and restore focus, close on Escape
  useEffect(() => {
    if (!isOpen) return;

    // Save the currently focused element so we can restore it later
    const previousFocus = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    // Focus the dialog so keyboard users start inside it
    dialogRef.current?.focus();
    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      // Restore focus to the element that opened the modal
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          'relative w-full bg-white rounded-[20px] shadow-ios-floating flex flex-col max-h-[90vh]',
          'animate-[ios-sheet-in_0.22s_cubic-bezier(0.32,0.72,0,1)]',
          sizeClasses[size]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 ios-hairline-b shrink-0">
          {title && <h2 className="text-[17px] font-semibold text-[#1C1C1E] tracking-[-0.01em]">{title}</h2>}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close dialog"
            className="ml-auto -mr-2 !h-9 !w-9 !px-0 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 ios-hairline-t bg-[#FAFAFA] rounded-b-[20px] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
