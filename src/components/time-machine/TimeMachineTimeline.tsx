'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import type { TimelineEntry } from '@vojas/api-client';
import { useTimeMachine } from './TimeMachineContext';
import { cn } from '@/lib/utils';
import { Cloud, MapPin, Pause, Play, RotateCcw, SkipBack, SkipForward, Gauge, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface TimeMachineTimelineProps {
  entries: TimelineEntry[];
  observations: { id: string; observationDate: string; cloudCover: number; satellite: string }[];
  /** Called when the user clicks a node, so the page can sync the drawer */
  onSelectObservation?: (observationId: string) => void;
}

const SPEED_OPTIONS = [
  { value: 4, label: '0.25×' },
  { value: 2, label: '0.5×' },
  { value: 1, label: '1×' },
  { value: 0.5, label: '2×' },
  { value: 0.25, label: '4×' },
];

export function TimeMachineTimeline({ entries, observations, onSelectObservation }: TimeMachineTimelineProps) {
  const { selectedObservationId, setSelectedObservationId, playbackState, setPlaybackState } = useTimeMachine();
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  // Build a sorted list of nodes: every timeline entry (some may have null observation)
  const nodes = useMemo(() => {
    return entries.map((e) => ({
      entry: e,
      observation: e.observationId ? observations.find((o) => o.id === e.observationId) ?? null : null,
    }));
  }, [entries, observations]);

  const { minDate, maxDate, span } = useMemo(() => {
    const dates = entries
      .filter((e) => e.targetDate)
      .map((e) => new Date(e.targetDate).getTime())
      .sort((a, b) => a - b);
    const min = dates[0] ? new Date(dates[0]) : new Date(Date.now() - 365 * 86400000);
    const max = dates[dates.length - 1] ? new Date(dates[dates.length - 1]) : new Date();
    return { minDate: min, maxDate: max, span: max.getTime() - min.getTime() || 1 };
  }, [entries]);

  // The selected node = the one whose observationId matches
  const selectedIndex = useMemo(() => {
    if (!selectedObservationId) return -1;
    return nodes.findIndex((n) => n.observation?.id === selectedObservationId);
  }, [nodes, selectedObservationId]);

  // Find the index of the "current" entry (closest to playhead position)
  const currentIndex = useMemo(() => {
    if (selectedIndex >= 0) return selectedIndex;
    return Math.max(0, Math.min(nodes.length - 1, Math.floor(nodes.length * 0.7)));
  }, [selectedIndex, nodes.length]);

  // Playback: advance through available observations
  useEffect(() => {
    if (!playbackState.playing) return;
    // Find the next AVAILABLE observation after currentIndex
    const availableIndices = nodes
      .map((n, i) => (n.entry.availability === 'AVAILABLE' ? i : -1))
      .filter((i) => i >= 0);
    if (availableIndices.length === 0) return;

    const nextIndex = availableIndices.find((i) => i > currentIndex) ?? availableIndices[0];
    const t = setTimeout(() => {
      const next = nodes[nextIndex];
      if (next?.observation) {
        setSelectedObservationId(next.observation.id);
        onSelectObservation?.(next.observation.id);
      } else if (next) {
        // No observation but still advance cursor
        // Find next available one
        const afterNext = availableIndices.find((i) => i > nextIndex) ?? availableIndices[0];
        const nextObs = nodes[afterNext]?.observation;
        if (nextObs) {
          setSelectedObservationId(nextObs.id);
          onSelectObservation?.(nextObs.id);
        }
      }
    }, playbackState.speed * 1000);
    return () => clearTimeout(t);
  }, [playbackState, currentIndex, nodes, setSelectedObservationId, onSelectObservation]);

  // Position the playhead
  const cursorPercent = useMemo(() => {
    const node = nodes[currentIndex];
    if (!node?.entry.targetDate) return 0;
    const t = new Date(node.entry.targetDate).getTime();
    return Math.max(0, Math.min(100, ((t - minDate.getTime()) / span) * 100));
  }, [nodes, currentIndex, minDate, span]);

  // Announce playback state changes to screen readers via a live region
  const [liveMessage, setLiveMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!playbackState.playing) return;
    const node = nodes[currentIndex];
    const label = node?.observation
      ? new Date(node.observation.observationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : node?.entry.targetDate
        ? new Date(node.entry.targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
    const msg = label ? `Playback at ${label}` : 'Playback started';
    setLiveMessage(msg);
    const t = setTimeout(() => setLiveMessage(null), 3000);
    return () => clearTimeout(t);
  }, [playbackState.playing, currentIndex, nodes]);

  // Drag the playhead
  const handleMove = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = minDate.getTime() + pct * span;
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const t = nodes[i].entry.targetDate ? new Date(nodes[i].entry.targetDate).getTime() : 0;
      const diff = Math.abs(t - targetTime);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    const node = nodes[bestIdx];
    if (node?.observation) {
      setSelectedObservationId(node.observation.id);
      onSelectObservation?.(node.observation.id);
    } else if (node) {
      // Pick the nearest available observation to the right
      for (let i = bestIdx; i < nodes.length; i++) {
        const obs = nodes[i].observation;
        if (obs) {
          setSelectedObservationId(obs.id);
          onSelectObservation?.(obs.id);
          break;
        }
      }
    }
  }, [nodes, minDate, span, setSelectedObservationId, onSelectObservation]);

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

  // Keyboard navigation
  const handleKey = useCallback((e: React.KeyboardEvent) => {
    const available = nodes.map((n, i) => (n.entry.availability === 'AVAILABLE' ? i : -1)).filter((i) => i >= 0);
    if (available.length === 0) return;
    const idxInAvail = available.findIndex((i) => i === currentIndex);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = available[(idxInAvail + 1) % available.length];
      const o = nodes[next]?.observation;
      if (o) {
        setSelectedObservationId(o.id);
        onSelectObservation?.(o.id);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = available[(idxInAvail - 1 + available.length) % available.length];
      const o = nodes[prev]?.observation;
      if (o) {
        setSelectedObservationId(o.id);
        onSelectObservation?.(o.id);
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      const o = nodes[available[0]]?.observation;
      if (o) {
        setSelectedObservationId(o.id);
        onSelectObservation?.(o.id);
      }
    } else if (e.key === 'End') {
      e.preventDefault();
      const o = nodes[available[available.length - 1]]?.observation;
      if (o) {
        setSelectedObservationId(o.id);
        onSelectObservation?.(o.id);
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      setPlaybackState({ playing: !playbackState.playing });
    }
  }, [nodes, currentIndex, setSelectedObservationId, onSelectObservation, setPlaybackState, playbackState.playing]);

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
      <div className="p-6 text-sm text-slate-500 text-center bg-slate-50 rounded-xl border border-slate-200">
        No timeline available. Run a satellite sync to generate weekly checkpoints.
      </div>
    );
  }

  const availableCount = nodes.filter((n) => n.entry.availability === 'AVAILABLE').length;

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      {/* ARIA live region for playback announcements */}
      {liveMessage && (
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {liveMessage}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Time Machine</div>
          <div className="text-xs text-slate-400">
            {availableCount} of {nodes.length} weeks have usable imagery
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Speed control */}
          <div className="flex items-center gap-1 mr-2">
            <Gauge className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={playbackState.speed}
              onChange={(e) => setPlaybackState({ speed: Number(e.target.value) })}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Playback speed"
            >
              {SPEED_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              const first = nodes.find((n) => n.observation)?.observation;
              if (first) {
                setSelectedObservationId(first.id);
                onSelectObservation?.(first.id);
              }
            }}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
            title="Jump to baseline (Home)"
            aria-label="Jump to baseline"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPlaybackState({ playing: !playbackState.playing })}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              playbackState.playing ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600',
            )}
            title={playbackState.playing ? 'Pause' : 'Play'}
            aria-label={playbackState.playing ? 'Pause playback' : 'Start playback'}
          >
            {playbackState.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={() => {
              const last = [...nodes].reverse().find((n) => n.observation)?.observation;
              if (last) {
                setSelectedObservationId(last.id);
                onSelectObservation?.(last.id);
              }
            }}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
            title="Jump to latest (End)"
            aria-label="Jump to latest"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setPlaybackState({ playing: false });
              setSelectedObservationId(null);
            }}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
            title="Reset"
            aria-label="Reset timeline"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

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
        className="relative h-14 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        aria-valuemax={Math.max(0, nodes.length - 1)}
        aria-valuenow={Math.max(0, currentIndex)}
        aria-label="Project time machine"
        tabIndex={0}
        onKeyDown={handleKey}
      >
        {/* Track background gradient: green for available, gray for unavailable */}
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          <div className="absolute top-0 bottom-0 left-0 right-0 flex">
            {nodes.map((n, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 h-full border-r border-slate-200/50 last:border-r-0',
                  n.entry.availability === 'AVAILABLE' ? 'bg-emerald-50' : 'bg-slate-100',
                )}
              />
            ))}
          </div>
        </div>

        {/* Tick marks for available weeks */}
        {nodes.map((n, i) => {
          if (!n.entry.targetDate) return null;
          const left = ((new Date(n.entry.targetDate).getTime() - minDate.getTime()) / span) * 100;
          const isAvailable = n.entry.availability === 'AVAILABLE';
          return (
            <div
              key={i}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-px h-8',
                isAvailable ? 'bg-emerald-500/70' : 'bg-slate-300',
              )}
              style={{ left: `${left}%` }}
              aria-hidden
            />
          );
        })}

        {/* Selected playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-600 z-10 pointer-events-none"
          style={{ left: `${cursorPercent}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none"
          style={{ left: `${cursorPercent}%` }}
        >
          <div className="w-4 h-4 rounded-full bg-blue-600 ring-4 ring-blue-200 shadow-md" />
        </div>
      </div>

      {/* Selected entry summary */}
      <SelectedEntryInfo currentIndex={currentIndex} nodes={nodes} />
    </div>
  );
}

function SelectedEntryInfo({
  currentIndex,
  nodes,
}: {
  currentIndex: number;
  nodes: Array<{ entry: TimelineEntry; observation: { id: string; observationDate: string; cloudCover: number; satellite: string } | null }>;
}) {
  const node = nodes[currentIndex];
  if (!node) return null;
  const target = new Date(node.entry.targetDate);
  const obsDate = node.observation ? new Date(node.observation.observationDate) : null;
  const targetDiff = node.entry.targetDifference ?? null;
  const isAvailable = node.entry.availability === 'AVAILABLE';

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Week of</div>
        <div className="text-sm font-semibold text-slate-900 mt-0.5">
          {target.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Status</div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {isAvailable ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">Available</span>
            </>
          ) : (
            <>
              <X className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">No observation</span>
            </>
          )}
        </div>
        {!isAvailable && node.entry.reason && (
          <div className="text-[10px] text-slate-500 mt-0.5">{humanizeReason(node.entry.reason)}</div>
        )}
      </div>
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Capture</div>
        <div className="text-sm font-semibold text-slate-900 mt-0.5">
          {obsDate
            ? obsDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—'}
        </div>
        {targetDiff != null && obsDate && (
          <div className="text-[10px] text-slate-500 mt-0.5">
            {targetDiff >= 0 ? '+' : ''}{targetDiff}d from target
          </div>
        )}
      </div>
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Cloud cover</div>
        <div className="text-sm font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
          {node.observation ? (
            <>
              <Cloud className="h-3.5 w-3.5 text-slate-400" />
              {node.observation.cloudCover.toFixed(0)}%
            </>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>
        {node.observation && (
          <div className="text-[10px] text-slate-500 mt-0.5">{node.observation.satellite}</div>
        )}
      </div>
    </div>
  );
}

function humanizeReason(reason: string): string {
  const map: Record<string, string> = {
    NO_SCENE_AVAILABLE: 'No Sentinel-2 scene was available for this week.',
    CLOUD_COVER_TOO_HIGH: 'All scenes in this week exceeded the cloud cover threshold.',
    AUTHENTICATION_REQUIRED: 'Provider credentials are not configured.',
    API_UNAVAILABLE: 'Provider was temporarily unavailable.',
    OUTSIDE_COVERAGE: 'Project is outside Sentinel-2 coverage.',
    INVALID_GEOMETRY: 'Project coordinates are invalid.',
    PENDING: 'Sync is in progress.',
  };
  return map[reason] ?? reason;
}
