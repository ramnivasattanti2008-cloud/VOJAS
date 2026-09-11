'use client';

/**
 * DataUnavailable — the honest empty state.
 *
 * VOJAS must never render a plausible-looking number it did not receive from a
 * real source. When data is missing, the UI says so in the user's own terms and
 * names the machine-readable reason, so a citizen or auditor can tell the
 * difference between "zero" and "we don't know".
 *
 * Use this instead of a fallback object, a placeholder figure, or a zero.
 */

import { AlertCircle, DatabaseZap, FileQuestion, Inbox, ServerCrash, ShieldQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/**
 * The reason vocabulary from CLAUDE.md. These are the only states an unavailable
 * value may report — each one tells the reader something different about *why*
 * the figure is missing, which is the point.
 */
export type UnavailableReason =
  | 'NOT_AVAILABLE'
  | 'NO_DATA'
  | 'NOT_VERIFIED'
  | 'INSUFFICIENT_DATA'
  | 'NO_USABLE_OBSERVATION'
  | 'SOURCE_UNAVAILABLE'
  | 'PROCESSING_FAILED';

interface ReasonPresentation {
  icon: typeof AlertCircle;
  label: string;
  /** Plain-language default, overridable per use site. */
  detail: string;
}

const REASONS: Record<UnavailableReason, ReasonPresentation> = {
  NOT_AVAILABLE: {
    icon: FileQuestion,
    label: 'Not available',
    detail: 'This information is not present in the official record.',
  },
  NO_DATA: {
    icon: Inbox,
    label: 'No records',
    detail: 'Nothing has been recorded here yet.',
  },
  NOT_VERIFIED: {
    icon: ShieldQuestion,
    label: 'Not verified',
    detail: 'This has not been confirmed by an authorised reviewer.',
  },
  INSUFFICIENT_DATA: {
    icon: AlertCircle,
    label: 'Insufficient data',
    detail: 'There is not enough recorded data to produce a reliable figure.',
  },
  NO_USABLE_OBSERVATION: {
    icon: AlertCircle,
    label: 'No usable observation',
    detail: 'No observation of sufficient quality is available for this location.',
  },
  SOURCE_UNAVAILABLE: {
    icon: ServerCrash,
    label: 'Source unavailable',
    detail: 'The data source could not be reached. No figures are shown rather than estimates.',
  },
  PROCESSING_FAILED: {
    icon: DatabaseZap,
    label: 'Processing failed',
    detail: 'This data could not be processed. It has not been substituted with an estimate.',
  },
};

interface DataUnavailableProps {
  reason: UnavailableReason;
  /** Overrides the default label — name the thing that's missing, e.g. "No expenditure records". */
  title?: string;
  /** Overrides the default explanation. */
  detail?: string;
  /** What the user can do next, if anything. */
  action?: ReactNode;
  /** `inline` for use inside an existing card; `block` (default) draws its own frame. */
  variant?: 'block' | 'inline';
  className?: string;
}

export function DataUnavailable({
  reason,
  title,
  detail,
  action,
  variant = 'block',
  className,
}: DataUnavailableProps) {
  const preset = REASONS[reason];
  const Icon = preset.icon;

  return (
    <div
      role="status"
      data-unavailable-reason={reason}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variant === 'block'
          ? 'rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10'
          : 'px-4 py-8',
        className
      )}
    >
      <Icon className="h-6 w-6 text-slate-400" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-slate-700">{title ?? preset.label}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{detail ?? preset.detail}</p>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-slate-400">{reason}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * The single-value form, for a stat tile or table cell where a figure would
 * otherwise sit. Renders an em dash with the reason attached for screen readers
 * — never a zero, which reads as a real measurement.
 */
export function ValueUnavailable({
  reason = 'NOT_AVAILABLE',
  className,
}: {
  reason?: UnavailableReason;
  className?: string;
}) {
  return (
    <span
      title={REASONS[reason].detail}
      data-unavailable-reason={reason}
      className={cn('text-slate-400', className)}
    >
      <span aria-hidden="true">—</span>
      <span className="sr-only">{REASONS[reason].label}</span>
    </span>
  );
}
