'use client';

import type { SatelliteObservation } from '@vojas/api-client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  X, Cloud, Satellite, Calendar, Layers, ExternalLink,
  ChevronRight, Info, TrendingUp, Activity,
} from 'lucide-react';

interface ObservationDrawerProps {
  observation: SatelliteObservation | null;
  beforeObservation?: SatelliteObservation | null;
  targetDate?: string;
  comparison?: {
    status: string;
    reportedProgress: number;
    changeClassification: string;
    confidence: string;
    evidence: string;
  };
  onClose: () => void;
}

export function ObservationDrawer({
  observation,
  beforeObservation,
  targetDate,
  comparison,
  onClose,
}: ObservationDrawerProps) {
  const obsDate = observation ? new Date(observation.observationDate) : null;
  const tarDate = targetDate ? new Date(targetDate) : null;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Observation Details
          </div>
          {observation && (
            <div className="text-sm font-semibold text-slate-900 mt-0.5">
              {obsDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          aria-label="Close observation drawer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {observation ? (
          <>
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2">
              <StatPill icon={<Satellite className="h-3 w-3" />} label="Satellite" value={observation.satellite ?? '—'} />
              <StatPill icon={<Layers className="h-3 w-3" />} label="Dataset" value={observation.dataset ?? '—'} />
              <StatPill icon={<Cloud className="h-3 w-3" />} label="Cloud cover" value={`${observation.cloudCover.toFixed(1)}%`} />
              <StatPill icon={<Layers className="h-3 w-3" />} label="Resolution" value={`${observation.resolution} m`} />
            </div>

            {/* Target vs Actual */}
            {tarDate && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                  <Target className="h-3 w-3" /> Temporal Accuracy
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500">Target week</div>
                    <div className="text-xs font-semibold text-slate-700">
                      {tarDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500">Actual capture</div>
                    <div className="text-xs font-semibold text-slate-700">
                      {obsDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                {observation.targetDifference != null && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                    Satellite captured {observation.targetDifference >= 0 ? '+' : ''}{observation.targetDifference} days from target
                  </div>
                )}
              </div>
            )}

            {/* Spectral indices */}
            {(observation.ndvi != null || observation.ndbi != null || observation.bsi != null) && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> Spectral Indices
                </div>
                <div className="space-y-2">
                  {observation.ndvi != null && (
                    <SpectralBar label="NDVI" value={observation.ndvi} hint="vegetation" color="emerald" />
                  )}
                  {observation.ndbi != null && (
                    <SpectralBar label="NDBI" value={observation.ndbi} hint="built-up" color="amber" />
                  )}
                  {observation.bsi != null && (
                    <SpectralBar label="BSI" value={observation.bsi} hint="bare soil" color="slate" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  Spectral indices are proxies for surface conditions — not direct measurements of construction progress.
                </p>
              </div>
            )}

            {/* Progress comparison */}
            {comparison && (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Progress Assessment
                  </div>
                  <Badge variant={
                    comparison.status === 'CONSISTENT' ? 'success'
                      : comparison.status === 'POSSIBLY_INCONSISTENT' ? 'warning'
                      : 'neutral'
                  }>
                    {comparison.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Reported progress</span>
                    <span className="font-semibold text-slate-900">{comparison.reportedProgress}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Satellite change</span>
                    <Badge variant={
                      comparison.changeClassification === 'HIGH_OBSERVABLE_CHANGE' ? 'danger'
                        : comparison.changeClassification === 'MODERATE_OBSERVABLE_CHANGE' ? 'warning'
                        : comparison.changeClassification === 'LOW_OBSERVABLE_CHANGE' ? 'info'
                        : 'neutral'
                    }>
                      {comparison.changeClassification.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Confidence</span>
                    <Badge variant={
                      comparison.confidence === 'HIGH' ? 'success'
                        : comparison.confidence === 'MEDIUM' ? 'warning'
                        : 'neutral'
                    }>
                      {comparison.confidence}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed pt-1 border-t border-slate-100">
                    {comparison.evidence}
                  </p>
                </div>
              </div>
            )}

            {/* Limitations */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="text-[10px] text-amber-700 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5">
                <Info className="h-3 w-3" /> Important limitations
              </div>
              <ul className="text-[10px] text-amber-800 space-y-1 leading-relaxed">
                <li>10m resolution — sub-meter features not visible.</li>
                <li>Vegetation recovery after clearance affects NDVI.</li>
                <li>Cloud cover of {observation.cloudCover.toFixed(0)}% may affect analysis.</li>
                <li>Underground work and interior work are not visible from space.</li>
              </ul>
            </div>

            {/* Source */}
            {observation.sourceUrl && (
              <div className="pt-2 border-t border-slate-100">
                <a
                  href={observation.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View source — {observation.sourceName ?? 'Copernicus Data Space Ecosystem'}
                </a>
                {observation.sceneId && (
                  <p className="text-[10px] text-slate-400 font-mono mt-1">Scene: {observation.sceneId}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="inline-flex w-12 h-12 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Satellite className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No usable observation</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {targetDate
                ? `No Sentinel-2 image was available for the week of ${new Date(targetDate).toLocaleDateString('en-IN')}.`
                : 'No satellite observation is available for this date.'}
            </p>
            <p className="text-[10px] text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
              Possible reasons: cloud cover too high, satellite revisit not yet available, or scene outside project area.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-900 mt-0.5 truncate">{value}</div>
    </div>
  );
}

function Target({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="3" />
      <line x1="8" y1="2" x2="8" y2="5" />
      <line x1="8" y1="11" x2="8" y2="14" />
      <line x1="2" y1="8" x2="5" y2="8" />
      <line x1="11" y1="8" x2="14" y2="8" />
    </svg>
  );
}

function SpectralBar({ label, value, hint, color }: {
  label: string;
  value: number;
  hint: string;
  color: 'emerald' | 'amber' | 'slate';
}) {
  const pct = ((value + 1) / 2) * 100;
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    slate: 'bg-slate-500',
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">{label}</span>
          <span className="text-[10px] text-slate-400">{hint}</span>
        </div>
        <span className="text-xs font-mono font-semibold text-slate-800">{value.toFixed(3)}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', colorMap[color])} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
