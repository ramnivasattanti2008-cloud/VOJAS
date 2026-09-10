'use client';

import type { SatelliteObservation } from '@vojas/api-client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Cloud, Satellite as SatIcon, Calendar, Layers, ExternalLink } from 'lucide-react';

interface ObservationCardProps {
  observation: SatelliteObservation | null;
  targetDate?: string;
  variant?: 'full' | 'compact';
}

export function ObservationCard({ observation, targetDate, variant = 'full' }: ObservationCardProps) {
  if (!observation) {
    return (
      <Card>
        <CardBody className="py-8 text-center">
          <div className="inline-flex w-12 h-12 rounded-full bg-slate-100 items-center justify-center mb-3">
            <SatIcon className="h-5 w-5 text-slate-400" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-slate-700">No usable observation</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {targetDate
              ? `No Sentinel-2 image was available for the week of ${new Date(targetDate).toLocaleDateString('en-IN')}.`
              : 'No satellite observation is available for this date.'}
          </p>
          <p className="text-[11px] text-slate-400 mt-3 max-w-xs mx-auto leading-relaxed">
            Possible reasons: cloud cover too high, satellite revisit not yet available, or scene outside project area.
          </p>
        </CardBody>
      </Card>
    );
  }

  const obsDate = new Date(observation.observationDate);
  const tarDate = observation.targetDate ? new Date(observation.targetDate) : null;
  const targetDiff = observation.targetDifference ?? 0;

  return (
    <Card>
      <CardBody className={variant === 'full' ? 'space-y-4' : 'space-y-2'}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Satellite Observation</div>
            <div className="text-base font-semibold text-slate-900 mt-0.5">
              {obsDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <Badge variant={observation.quality === 'USABLE' ? 'success' : 'warning'}>
            {observation.quality}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetaRow icon={<Calendar className="h-3.5 w-3.5" />} label="Observation" value={obsDate.toLocaleDateString('en-IN', { dateStyle: 'medium' })} />
          {tarDate && (
            <MetaRow
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Target"
              value={`${tarDate.toLocaleDateString('en-IN', { dateStyle: 'medium' })} (${targetDiff >= 0 ? '+' : ''}${targetDiff}d)`}
            />
          )}
          <MetaRow icon={<SatIcon className="h-3.5 w-3.5" />} label="Satellite" value={observation.satellite} />
          <MetaRow icon={<Layers className="h-3.5 w-3.5" />} label="Dataset" value={observation.dataset} />
          <MetaRow icon={<Cloud className="h-3.5 w-3.5" />} label="Cloud cover" value={`${observation.cloudCover.toFixed(1)}%`} />
          <MetaRow icon={<Layers className="h-3.5 w-3.5" />} label="Resolution" value={`${observation.resolution} m`} />
        </div>

        {/* Indices (NDVI/NDBI) — honest framing */}
        {(observation.ndvi != null || observation.ndbi != null) && (
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Spectral Indices</div>
            <div className="grid grid-cols-3 gap-3">
              {observation.ndvi != null && (
                <IndexBar label="NDVI" value={observation.ndvi} hint="vegetation" />
              )}
              {observation.ndbi != null && (
                <IndexBar label="NDBI" value={observation.ndbi} hint="built-up" />
              )}
              {observation.bsi != null && (
                <IndexBar label="BSI" value={observation.bsi} hint="bare soil" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Spectral indices are proxies for vegetation, built-up surface and bare soil. They are
              not direct measurements of construction progress.
            </p>
          </div>
        )}

        {/* Source link */}
        {observation.sourceUrl && (
          <div className="border-t border-slate-100 pt-3">
            <a
              href={observation.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <ExternalLink className="h-3 w-3" />
              View source at {observation.sourceName ?? 'provider'}
            </a>
            {observation.sceneId && (
              <p className="text-[11px] text-slate-400 font-mono mt-1">scene: {observation.sceneId}</p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium text-slate-800 mt-0.5">{value}</div>
    </div>
  );
}

function IndexBar({ label, value, hint }: { label: string; value: number; hint: string }) {
  const pct = ((value + 1) / 2) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-mono text-slate-500">{label}</span>
        <span className="text-[11px] text-slate-400">{hint}</span>
      </div>
      <div className="text-base font-mono font-medium text-slate-800 mt-0.5">{value.toFixed(2)}</div>
      <div className="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-emerald-500"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}
