'use client';

import { useState, useCallback } from 'react';
import type { SatelliteObservation } from '@vojas/api-client';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, ArrowRight, SplitSquareVertical, Calendar, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeAfterComparisonProps {
  baselineObservation: SatelliteObservation | null;
  latestObservation: SatelliteObservation | null;
  customObservations?: SatelliteObservation[];
  onSelectCustom?: (obs: SatelliteObservation) => void;
}

type ComparisonMode = 'side-by-side' | 'swipe';

export function BeforeAfterComparison({
  baselineObservation,
  latestObservation,
  customObservations,
  onSelectCustom,
}: BeforeAfterComparisonProps) {
  const [mode, setMode] = useState<ComparisonMode>('side-by-side');
  const [swipePosition, setSwipePosition] = useState(50); // percent
  const [drag, setDrag] = useState(false);

  const obsA = baselineObservation;
  const obsB = latestObservation;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!drag || mode !== 'swipe') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setSwipePosition(Math.max(5, Math.min(95, pct)));
  }, [drag, mode]);

  if (!obsA && !obsB) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <SplitSquareVertical className="h-8 w-8 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">No observations to compare</p>
          <p className="text-xs text-slate-400 mt-1">At least two satellite observations are needed for a before/after comparison.</p>
        </CardBody>
      </Card>
    );
  }

  const ObsPanel = ({ obs, label, side }: { obs: SatelliteObservation | null; label: string; side: 'before' | 'after' }) => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        {obs && (
          <Badge variant={obs.quality === 'USABLE' ? 'success' : 'warning'}>{obs.quality}</Badge>
        )}
      </div>

      {obs ? (
        <>
          {/* Thumbnail / tile placeholder */}
          <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden">
            {obs.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={obs.thumbnailUrl}
                alt={`${label} satellite observation`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : obs.tileUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={obs.tileUrl.replace('width=512', 'width=800').replace('height=512', 'height=450')}
                alt={`${label} satellite tile`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                No preview available
              </div>
            )}
            {/* Date overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <div className="flex items-center gap-1.5 text-white text-xs">
                <Calendar className="h-3 w-3" />
                {new Date(obs.observationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <MetaPill icon={<Cloud className="h-3 w-3" />} label="Cloud" value={`${obs.cloudCover.toFixed(1)}%`} />
            <MetaPill label="Satellite" value={obs.satellite} />
            <MetaPill label="Dataset" value={obs.dataset} />
            <MetaPill label="Resolution" value={`${obs.resolution}m`} />
          </div>

          {/* Indices */}
          {(obs.ndvi != null || obs.ndbi != null) && (
            <div className="border-t border-slate-100 pt-2 space-y-1.5">
              {obs.ndvi != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">NDVI</span>
                  <span className="font-mono font-medium text-slate-800">{obs.ndvi.toFixed(3)}</span>
                </div>
              )}
              {obs.ndbi != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">NDBI</span>
                  <span className="font-mono font-medium text-slate-800">{obs.ndbi.toFixed(3)}</span>
                </div>
              )}
            </div>
          )}

          {obs.sourceUrl && (
            <a
              href={obs.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              View source →
            </a>
          )}
        </>
      ) : (
        <div className="aspect-video bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-sm">
          No {label.toLowerCase()} observation
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardBody className="space-y-5">
        {/* Mode toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">Before / After Comparison</span>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {([['side-by-side', 'Side by side'], ['swipe', 'Swipe']] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  mode === m ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Side-by-side mode */}
        {mode === 'side-by-side' && (
          <div className="grid grid-cols-2 gap-6">
            <ObsPanel obs={obsA} label="Before" side="before" />
            <ObsPanel obs={obsB} label="After" side="after" />
          </div>
        )}

        {/* Swipe mode */}
        {mode === 'swipe' && (
          <div>
            <div
              className="relative w-full aspect-video bg-slate-100 rounded-xl overflow-hidden cursor-col-resize select-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setDrag(false)}
              onMouseUp={() => setDrag(false)}
              onMouseDown={(e) => { setDrag(true); handleMouseMove(e); }}
              role="slider"
              aria-label="Swipe comparison"
              aria-valuenow={swipePosition}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {/* After (full width, background) */}
              {obsB ? (
                <div className="absolute inset-0">
                  {obsB.thumbnailUrl
                    ? <img src={obsB.thumbnailUrl} alt="After" className="w-full h-full object-cover" />
                    : obsB.tileUrl
                    ? <img src={obsB.tileUrl.replace('width=512', 'width=900').replace('height=512', 'height=500')} alt="After" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 text-sm">No after observation</div>
                  }
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-200 text-slate-400 text-sm">No after observation</div>
              )}

              {/* Before (clipped) */}
              {obsA ? (
                <div
                  className="absolute top-0 bottom-0 overflow-hidden"
                  style={{ width: `${swipePosition}%` }}
                >
                  {obsA.thumbnailUrl
                    ? <img src={obsA.thumbnailUrl} alt="Before" className="h-full object-cover" style={{ width: '900px', maxWidth: 'none' }} />
                    : obsA.tileUrl
                    ? <img src={obsA.tileUrl.replace('width=512', 'width=900').replace('height=512', 'height=500')} alt="Before" className="h-full object-cover" style={{ width: '900px', maxWidth: 'none' }} />
                    : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm">No before observation</div>
                  }
                </div>
              ) : (
                <div className="absolute top-0 bottom-0 overflow-hidden w-1/2 bg-slate-100 border-r border-slate-300" />
              )}

              {/* Divider */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10 cursor-col-resize"
                style={{ left: `${swipePosition}%`, transform: 'translateX(-50%)' }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
                  <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
                  <ArrowRight className="h-3.5 w-3.5 text-slate-500 -ml-1" />
                </div>
              </div>

              {/* Labels */}
              {obsA && (
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded font-medium">
                  Before — {new Date(obsA.observationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
              {obsB && (
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded font-medium">
                  After — {new Date(obsB.observationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>

            {/* Swipe hint */}
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Drag the divider to compare before and after observations
            </p>

            {/* Metadata below */}
            <div className="grid grid-cols-2 gap-4">
              {obsA ? (
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-slate-700">Before</div>
                  <div className="text-slate-500">Cloud: {obsA.cloudCover.toFixed(1)}%</div>
                  <div className="text-slate-500">NDVI: {obsA.ndvi?.toFixed(3) ?? '—'}</div>
                  <div className="text-slate-500">NDBI: {obsA.ndbi?.toFixed(3) ?? '—'}</div>
                </div>
              ) : <div />}
              {obsB ? (
                <div className="text-xs space-y-1 text-right">
                  <div className="font-semibold text-slate-700">After</div>
                  <div className="text-slate-500">Cloud: {obsB.cloudCover.toFixed(1)}%</div>
                  <div className="text-slate-500">NDVI: {obsB.ndvi?.toFixed(3) ?? '—'}</div>
                  <div className="text-slate-500">NDBI: {obsB.ndbi?.toFixed(3) ?? '—'}</div>
                </div>
              ) : <div />}
            </div>
          </div>
        )}

        {/* Honest disclaimer */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <strong>Limitations:</strong> Spectral change (NDVI/NDBI) is a proxy for vegetation and built-up
            surface change — not direct construction measurement. Resolution is 10 m; sub-meter features are
            not visible. Cloud cover affects scene quality. Compare with field verification.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

function MetaPill({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-50 rounded-md px-2 py-1.5">
      {icon && <span className="text-slate-400">{icon}</span>}
      <span className="text-slate-500 text-[11px]">{label}</span>
      <span className="font-medium text-slate-800 text-[11px] ml-auto">{value}</span>
    </div>
  );
}
