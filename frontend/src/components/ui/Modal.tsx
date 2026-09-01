/**
 * Modal — VOJAS premium modal / dialog system
 *
 * Full-screen overlay with cinematic backdrop blur.
 * Animated entrance (scale + opacity from depth).
 * Sizes: sm | md | lg | xl | full
 * Features: close on Escape, focus trap, backdrop click close
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
  footer?: ReactNode;
  danger?: boolean;
}

const SIZE_CLASSES = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-xl',
  xl:   'max-w-3xl',
  full: 'max-w-[95vw] max-h-[95vh]',
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const panelVariants = {
  hidden:  { opacity: 0, scale: 0.92, y: 20 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  exit:    { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2, ease: [0.4, 0, 0.6, 1] as [number, number, number, number] } },
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showClose = true,
  footer,
  danger = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Focus trap — focus first focusable element
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-desc' : undefined}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            style={{ backdropFilter: 'blur(8px)' }}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'relative w-full rounded-2xl overflow-hidden',
              'bg-[#080c18]/95 backdrop-blur-xl',
              'border border-white/10 shadow-2xl',
              danger ? 'ring-1 ring-red-500/20' : 'ring-1 ring-white/5',
              SIZE_CLASSES[size],
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div
              className={cn(
                'absolute top-0 left-0 right-0 h-px',
                danger
                  ? 'bg-gradient-to-r from-transparent via-red-500 to-transparent'
                  : 'bg-gradient-to-r from-transparent via-electric-500/60 to-transparent'
              )}
            />

            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/5">
                <div>
                  {title && (
                    <h2 id="modal-title" className="text-base font-bold text-white tracking-tight">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id="modal-desc" className="text-sm text-slate-400 mt-1">
                      {description}
                    </p>
                  )}
                </div>
                {showClose && (
                  <button
                    onClick={onClose}
                    className={cn(
                      'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                      'text-slate-500 hover:text-white hover:bg-white/10',
                      'transition-all duration-150 focus-visible:outline-none',
                      'focus-visible:ring-2 focus-visible:ring-electric-400/50'
                    )}
                    aria-label="Close dialog"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 pb-5 pt-4 border-t border-white/5 flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Confirm modal (simple ok/cancel)
interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmModal({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = false, loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'px-4 py-2 text-sm font-semibold rounded-lg transition-all',
              danger
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-electric-600 hover:bg-electric-500 text-white'
            )}
          >
            {loading ? 'Loading...' : confirmLabel}
          </button>
        </>
      }
    >
      {/* Content is provided by title + description */}
    </Modal>
  );
}

export default Modal;
