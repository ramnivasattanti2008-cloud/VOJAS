'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import type { TimelineEntry } from '@vojas/api-client';
import { cn } from '@/lib/utils';

interface TimeMachineProps {
  entries: TimelineEntry[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function TimeMachine({ entries, selectedIndex, onSelect }: TimeMachineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const { availableIndices, minDate, maxDate, span } = useMemo(() => {
    const avail = entries
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.availability === 'AVAILABLE' && e.observationDate);
    const dates = entries
      .filter((e) => e.targetDate)
      .map((e) => new Date(e.targetDate).getTime())
      .sort((a, b) => a - b);
    const min = dates[0] ? new Date(dates[0]) : new Date();
    const max = dates[dates.length - 1] ? new Date(dates[dates.length - 1]) : new Date();
    return {
      availableIndices: avail,
      minDate: min,
      maxDate: max,
      span: max.getTime() - min.getTime() || 1,
    };
  }, [entries]);

  // Position the time cursor at the selected entry's target date
  const cursorPercent = useMemo(() => {
    const entry = entries[selectedIndex];
    if (!entry?.targetDate) return 0;
    const t = new Date(entry.targetDate).getTime();
    return Math.max(0, Math.min(100, ((t - minDate.getTime()) / span) * 100));
  }, [entries, selectedIndex, minDate, span]);

  const handleMove = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = minDate.getTime() + pct * span;
    // Find the entry whose targetDate is closest to this time
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < entries.length; i++) {
      const t = entries[i].targetDate ? new Date(entries[i].targetDate).getTime() : 0;
      const diff = Math.abs(t - targetTime);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    onSelect(bestIdx);
  }, [entries, minDate, span, onSelect]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => handleMove(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, handleMove]);

  // Build year ticks
  const yearTicks = useMemo(() => {
    const ticks: Array<{ year: number; left: number }> = [];
    const startYear = minDate.getFullYear();
    const endYear = maxDate.getFullYear();
    for (let y = startYear; y <= endYear; y++) {
      const t = new Date(`${y}-01-01`).getTime();
      const left = ((t - minDate.getTime()) / span) * 100;
      if (left >= 0 && left <= 100) ticks.push({ year: y, left });
    }
    return ticks;
  }, [minDate, maxDate, span]);

  if (!entries.length) {
    return (
      <div className="p-6 text-sm text-slate-500 text-center">
        No timeline available. Run a satellite sync to generate weekly checkpoints.
      </div>
    );
  }

  const selected = entries[selectedIndex];

  return (
    <div className="w-full">
      {/* Year ticks */}
      <div className="relative h-5 mb-1">
        {yearTicks.map((tick) => (
          <div
            key={tick.year}
            className="absolute top-0 -translate-x-1/2 text-[10px] text-slate-400 font-mono"
            style={{ left: `${tick.left}%` }}
          >
            {tick.year}
          </div>
        ))}
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-12 bg-slate-100 rounded-lg cursor-pointer select-none"
        onMouseDown={(e) => {
          setDragging(true);
          handleMove(e.clientX);
        }}
        onTouchStart={(e) => {
          setDragging(true);
          handleMove(e.touches[0]!.clientX);
        }}
        onTouchMove={(e) => dragging && handleMove(e.touches[0]!.clientX)}
        onTouchEnd={() => setDragging(false)}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={entries.length - 1}
        aria-valuenow={selectedIndex}
        aria-label="Project timeline"
        tabIndex={0}
      >
        {/* Tick marks per entry */}
        {entries.map((e, i) => {
          if (!e.targetDate) return null;
          const left = ((new Date(e.targetDate).getTime() - minDate.getTime()) / span) * 100;
          const isAvailable = e.availability === 'AVAILABLE';
          return (
            <div
              key={i}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-0.5 h-6',
                isAvailable ? 'bg-emerald-400' : 'bg-slate-300',
              )}
              style={{ left: `${left}%` }}
              aria-hidden
            />
          );
        })}

        {/* Selected cursor */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-600 z-10 pointer-events-none"
          style={{ left: `${cursorPercent}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none"
          style={{ left: `${cursorPercent}%` }}
        >
          <div className="w-4 h-4 rounded-full bg-blue-600 ring-4 ring-blue-100 shadow-md" />
        </div>
      </div>

      {/* Selected entry summary */}
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500 font-medium">
            {selected?.targetDate ? new Date(selected.targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          </div>
          <div className="text-sm text-slate-900 font-semibold mt-0.5">
            {selected?.availability === 'AVAILABLE'
              ? `Observation · ${selected.observationDate ? new Date(selected.observationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}`
              : 'No usable observation'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">
            {selected?.targetDifference != null && (
              <>{selected.targetDifference >= 0 ? '+' : ''}{selected.targetDifference}d from target</>
            )}
          </div>
          {selected?.cloudCover != null && (
            <div className="text-xs text-slate-500 mt-0.5">
              Cloud {selected.cloudCover.toFixed(0)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
