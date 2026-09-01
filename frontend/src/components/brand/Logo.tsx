/**
 * VOJAS Brand Logo — Spatial Intelligence Mark
 *
 * Concept: A hexagonal shield with circuit-board lines forming a stylized 'V'
 * inside a circular ring (representing global/geographic reach).
 * The V has two angular arms that subtly form a radar/scan sweep arc.
 * Pulsing outer ring = live data. Inner hexagon = structured governance.
 *
 * Variants: mark (icon only) | wordmark | stacked | animated
 */

import { cn } from '@/lib/utils';

// ── Core SVG mark ──────────────────────────────────────────────────────────────

function LogoMarkInner({ className, ringClass }: { className?: string; ringClass?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer orbit ring */}
      <circle
        cx="32" cy="32" r="28"
        stroke="url(#orbitGrad)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        className={cn('animate-[spin_20s_linear_infinite]', ringClass)}
      />

      {/* Inner pulse ring */}
      <circle
        cx="32" cy="32" r="22"
        stroke="url(#ringGrad)"
        strokeWidth="1"
        strokeDasharray="2 4"
        opacity="0.6"
      />

      {/* Hexagonal shield frame */}
      <path
        d="M32 8 L50 18 L50 38 L32 52 L14 38 L14 18 Z"
        stroke="url(#hexGrad)"
        strokeWidth="1.5"
        fill="url(#hexFill)"
        strokeLinejoin="round"
      />

      {/* V mark — left arm */}
      <path
        d="M24 38 L32 20 L40 38"
        stroke="url(#vGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* V mark — center dot */}
      <circle cx="32" cy="32" r="2.5" fill="url(#dotGrad)" />

      {/* Radar sweep arc */}
      <path
        d="M50 18 A22 22 0 0 1 14 18"
        stroke="url(#sweepGrad)"
        strokeWidth="1"
        strokeDasharray="3 6"
        fill="none"
        opacity="0.5"
      />

      {/* Corner data nodes */}
      <circle cx="50" cy="18" r="1.5" fill="#06b6d4" className="animate-pulse" />
      <circle cx="14" cy="18" r="1.5" fill="#06b6d4" className="animate-pulse" />
      <circle cx="50" cy="38" r="1.5" fill="#06b6d4" opacity="0.6" />
      <circle cx="14" cy="38" r="1.5" fill="#06b6d4" opacity="0.6" />
      <circle cx="32" cy="52" r="1.5" fill="#06b6d4" opacity="0.4" />

      {/* Gradients */}
      <defs>
        <linearGradient id="orbitGrad" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="ringGrad" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="hexGrad" x1="14" y1="8" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="hexFill" x1="14" y1="8" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="vGrad" x1="24" y1="20" x2="40" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="dotGrad" x1="30" y1="30" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="sweepGrad" x1="14" y1="18" x2="50" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Variants ───────────────────────────────────────────────────────────────────

interface LogoProps {
  variant?: 'mark' | 'wordmark' | 'stacked' | 'animated';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animated?: boolean;
}

const SIZES = {
  sm:  { icon: 'w-6 h-6',   word: 'text-sm',  sub: 'text-[8px]', tracking: 'tracking-widest' as const },
  md:  { icon: 'w-8 h-8',   word: 'text-base', sub: 'text-[9px]', tracking: 'tracking-widest' as const },
  lg:  { icon: 'w-12 h-12', word: 'text-xl',  sub: 'text-[10px]', tracking: 'tracking-[0.2em]' as const },
  xl:  { icon: 'w-16 h-16', word: 'text-2xl', sub: 'text-xs', tracking: 'tracking-[0.25em]' as const },
};

/** Icon-only mark (sidebar, favicon, loading) */
export function LogoMark({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return (
    <LogoMarkInner
      className={cn(SIZES[size].icon, 'shrink-0', className)}
    />
  );
}

/** Wordmark: icon + VOJAS text */
export function LogoWordmark({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const s = SIZES[size];
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoMarkInner className={cn(s.icon, 'shrink-0')} />
      <div>
        <span className={cn('font-bold text-white tracking-[0.15em] block leading-none', s.word)}>VOJAS</span>
        <span className={cn('text-slate-500 tracking-[0.2em] uppercase block leading-none mt-0.5', s.sub)}>
          Accountability
        </span>
      </div>
    </div>
  );
}

/** Stacked: icon above VOJAS word */
export function LogoStacked({ size = 'lg', className }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const s = SIZES[size];
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <LogoMarkInner className={cn(s.icon, 'shrink-0')} />
      <div className="text-center">
        <span className={cn('font-bold text-white tracking-[0.2em] block leading-none', s.word)}>VOJAS</span>
        <span className={cn('text-slate-500 uppercase block leading-none mt-1', s.sub, s.tracking)}>
          Spatial Intelligence Platform
        </span>
      </div>
    </div>
  );
}

/** Animated: full hero logo with scan line + glow */
export function LogoAnimated({ className }: { className?: string }) {
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full bg-electric-500/10 blur-2xl animate-pulse" />

      {/* Middle orbit ring */}
      <div className="absolute inset-[-8px] rounded-full border border-electric-500/20 animate-[spin_12s_linear_infinite]" />

      {/* Core mark */}
      <LogoMarkInner
        className="w-24 h-24"
        ringClass=""
      />

      {/* Scan line overlay */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(6,182,212,0.3) 30deg, transparent 60deg)',
          animation: 'spin 4s linear infinite',
        }}
      />
    </div>
  );
}

/** Default export — wordmark for sidebar use */
export function Logo({ variant = 'wordmark', size = 'md', className }: LogoProps) {
  if (variant === 'mark') return <LogoMark size={size} className={className} />;
  if (variant === 'stacked') return <LogoStacked size={size} className={className} />;
  if (variant === 'animated') return <LogoAnimated className={className} />;
  return <LogoWordmark size={size} className={className} />;
}

export default Logo;
