/**
 * LoadingState — premium loading experience
 * Variants: spinner (default), dots, pulse, terminal
 */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse' | 'terminal';
  accent?: 'electric' | 'saffron' | 'green' | 'red' | 'blue';
  className?: string;
  fullscreen?: boolean;
}

const ACCENT_COLOR: Record<string, string> = {
  electric: 'border-electric-500/30 border-t-electric-500 text-electric-400',
  saffron:  'border-saffron-500/30 border-t-saffron-500 text-saffron-400',
  green:    'border-green-500/30 border-t-green-500 text-green-400',
  red:      'border-red-500/30 border-t-red-500 text-red-400',
  blue:     'border-blue-500/30 border-t-blue-500 text-blue-400',
};

const SIZE_CLASSES = {
  sm: 'w-6 h-6 border-2',
  md: 'w-10 h-10 border-[3px]',
  lg: 'w-16 h-16 border-4',
};

export default function LoadingState({
  message = 'Loading...',
  size = 'md',
  variant = 'spinner',
  accent = 'electric',
  className,
  fullscreen = false,
}: LoadingStateProps) {
  const wrapperClasses = cn(
    'flex flex-col items-center justify-center gap-3',
    fullscreen ? 'fixed inset-0 z-50 bg-[#050810]/80 backdrop-blur-sm' : 'py-12',
    className
  );

  return (
    <div role="status" aria-live="polite" aria-label={message} className={wrapperClasses}>
      {variant === 'spinner' && (
        <>
          <div className="relative">
            <div
              className={cn(
                'rounded-full animate-spin',
                SIZE_CLASSES[size],
                ACCENT_COLOR[accent]
              )}
            />
            {/* Inner glow */}
            <div
              className={cn(
                'absolute inset-0 rounded-full blur-md opacity-30',
                SIZE_CLASSES[size],
                'animate-spin'
              )}
              style={{ background: 'currentColor' }}
            />
          </div>
          {message && (
            <p className="text-sm text-slate-400 font-medium">{message}</p>
          )}
        </>
      )}

      {variant === 'dots' && (
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={cn('w-2.5 h-2.5 rounded-full', ACCENT_COLOR[accent].split(' ').pop())}
              style={{ backgroundColor: 'currentColor' }}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
          {message && <span className="ml-2 text-sm text-slate-400">{message}</span>}
        </div>
      )}

      {variant === 'pulse' && (
        <>
          <motion.div
            className={cn('rounded-full', SIZE_CLASSES[size])}
            style={{ background: 'currentColor' }}
            animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          {message && <p className="text-sm text-slate-400">{message}</p>}
        </>
      )}

      {variant === 'terminal' && (
        <div className="font-mono text-xs flex items-center gap-2 text-slate-500">
          <span className="text-electric-400">{'>'}</span>
          <motion.span
            className="text-slate-300"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {message}
          </motion.span>
          <motion.span
            className="inline-block w-2 h-3 bg-electric-400"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        </div>
      )}
    </div>
  );
}
