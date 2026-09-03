'use client';

import { useTimeMachine, type ComparisonMode } from './TimeMachineContext';
import { cn } from '@/lib/utils';
import { Eye, Columns, ArrowLeftRight, Contrast, X } from 'lucide-react';

interface TimeMachineControlsProps {
  hasBefore: boolean;
  onClearBefore: () => void;
  opacity: number;
  onOpacityChange: (v: number) => void;
  swipePosition: number;
  onSwipePositionChange: (v: number) => void;
  showChangeLayer: boolean;
  onToggleChange: () => void;
  showFootprint: boolean;
  onToggleFootprint: () => void;
}

export function TimeMachineControls({
  hasBefore,
  onClearBefore,
  opacity,
  onOpacityChange,
  swipePosition,
  onSwipePositionChange,
  showChangeLayer,
  onToggleChange,
  showFootprint,
  onToggleFootprint,
}: TimeMachineControlsProps) {
  const { mode, setMode } = useTimeMachine();

  const modes: Array<{ key: ComparisonMode; label: string; icon: React.ReactNode; needsBefore: boolean; hint: string }> = [
    { key: 'single', label: 'Single', icon: <Eye className="h-3.5 w-3.5" />, needsBefore: false, hint: 'Show only the selected observation' },
    { key: 'side-by-side', label: 'Side by side', icon: <Columns className="h-3.5 w-3.5" />, needsBefore: true, hint: 'Show before and after in two panes' },
    { key: 'swipe', label: 'Swipe', icon: <ArrowLeftRight className="h-3.5 w-3.5" />, needsBefore: true, hint: 'Drag a divider to reveal before / after' },
    { key: 'opacity', label: 'Opacity blend', icon: <Contrast className="h-3.5 w-3.5" />, needsBefore: true, hint: 'Blend before and after with opacity' },
  ];

  return (
    <div className="flex flex-col gap-2 p-2 rounded-xl border border-slate-200 bg-white">
      {/* Mode selector */}
      <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-lg">
        {modes.map((m) => {
          const disabled = m.needsBefore && !hasBefore;
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => !disabled && setMode(m.key)}
              disabled={disabled}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
                active
                  ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                  : disabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60',
              )}
              title={m.hint}
              aria-pressed={active}
            >
              {m.icon}
              <span className="hidden md:inline">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mode-specific controls */}
      {mode === 'opacity' && hasBefore && (
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              {swipePosition > 50 ? 'Latest' : 'Baseline'} opacity
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{opacity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(e) => onOpacityChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
            aria-label="Opacity blend"
          />
        </div>
      )}

      {mode === 'swipe' && hasBefore && (
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Swipe position</span>
            <span className="text-[10px] text-slate-400 font-mono">{swipePosition}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={swipePosition}
            onChange={(e) => onSwipePositionChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
            aria-label="Swipe position"
          />
        </div>
      )}

      {/* Toggles */}
      <div className="border-t border-slate-100 pt-2 flex flex-col gap-1">
        {hasBefore && (
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs text-slate-600">Change overlay</span>
            <button
              onClick={onToggleChange}
              className={cn(
                'w-8 h-4 rounded-full transition-colors relative',
                showChangeLayer ? 'bg-emerald-500' : 'bg-slate-300',
              )}
              aria-pressed={showChangeLayer}
              aria-label="Toggle change overlay"
            >
              <span className={cn(
                'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
                showChangeLayer ? 'translate-x-4' : 'translate-x-0.5',
              )} />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-slate-600">Show footprint</span>
          <button
            onClick={onToggleFootprint}
            className={cn(
              'w-8 h-4 rounded-full transition-colors relative',
              showFootprint ? 'bg-blue-500' : 'bg-slate-300',
            )}
            aria-pressed={showFootprint}
            aria-label="Toggle footprint"
          >
            <span className={cn(
              'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
              showFootprint ? 'translate-x-4' : 'translate-x-0.5',
            )} />
          </button>
        </div>
        {hasBefore && (
          <button
            onClick={onClearBefore}
            className="mt-1 text-[11px] text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 py-1 rounded-md hover:bg-slate-50"
          >
            <X className="h-3 w-3" /> Clear comparison baseline
          </button>
        )}
      </div>
    </div>
  );
}
