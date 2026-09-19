import { cn } from '@/lib/utils';

interface LogoMarkProps {
  size?: number;
  className?: string;
  /** Reversed renders the mark for dark/ink grounds — light seal, ink tick. */
  reversed?: boolean;
}

/**
 * The VOJAS seal mark: an auditor's verification tick struck across a
 * ledger line, inside a medallion — not a rounded-square app icon. See
 * "The Ledger Tick" identity sheet for the full rationale and usage rules.
 */
export function LogoMark({ size = 32, className, reversed = false }: LogoMarkProps) {
  const seal = reversed ? '#F1EEE6' : '#141C2E';
  const ink = reversed ? '#141C2E' : '#F1EEE6';
  const tick = '#A9762E';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="VOJAS"
    >
      <circle cx="60" cy="60" r="54" fill={seal} stroke={tick} strokeWidth="3" />
      <line x1="30" y1="74" x2="90" y2="74" stroke={ink} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <path
        d="M 34 60 L 48 74 L 84 34"
        fill="none"
        stroke={tick}
        strokeWidth="11"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  reversed?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

/** Full lockup: seal mark + "VOJAS" wordmark. */
export function Logo({ size = 32, reversed = false, className, wordmarkClassName }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} reversed={reversed} />
      <span
        className={cn(
          'font-semibold tracking-[-0.02em]',
          reversed ? 'text-[#F1EEE6]' : 'text-[#1C1C1E]',
          wordmarkClassName
        )}
        style={{ fontSize: size * 0.56 }}
      >
        VOJAS
      </span>
    </div>
  );
}
