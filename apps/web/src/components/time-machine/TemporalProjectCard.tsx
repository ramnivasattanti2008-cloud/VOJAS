'use client';

import type { SatelliteObservation, TimelineEntry } from '@vojas/api-client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { Calendar, TrendingUp, Cloud, MapPin, Activity, Sparkles, AlertTriangle, CheckCircle2, Image as ImageIcon, Hash } from 'lucide-react';

interface TemporalProjectCardProps {
  project: {
    name: string;
    status: string;
    state?: string;
    district?: string;
    sector?: string;
    sanctionedAmount?: number;
    spentAmount?: number;
    startDate?: string;
    endDate?: string;
    description?: string;
  };
  selectedObservation: SatelliteObservation | null;
  selectedEntry: TimelineEntry | null;
  baseline: { observationDate: string; cloudCover: number } | null;
  latest: { observationDate: string; cloudCover: number } | null;
  totalObservations: number;
}

/**
 * A "temporal project card" — the project's at-a-glance information that
 * changes contextually with the timeline. When the user scrubs the
 * timeline, this card updates to reflect:
 * - the observation date as the temporal anchor
 * - days since project start
 * - days until / past project end
 * - the latest spectral state at that point in time
 */
export function TemporalProjectCard({
  project,
  selectedObservation,
  selectedEntry,
  baseline,
  latest,
  totalObservations,
}: TemporalProjectCardProps) {
  const obsDate = selectedObservation ? new Date(selectedObservation.observationDate) : null;
  const startDate = project.startDate ? new Date(project.startDate) : null;
  const endDate = project.endDate ? new Date(project.endDate) : null;

  // Compute temporal offsets
  const daysSinceStart = obsDate && startDate
    ? Math.floor((obsDate.getTime() - startDate.getTime()) / 86400000)
    : null;
  const daysUntilEnd = obsDate && endDate
    ? Math.floor((endDate.getTime() - obsDate.getTime()) / 86400000)
    : null;
  const projectDuration = startDate && endDate
    ? Math.floor((endDate.getTime() - startDate.getTime()) / 86400000)
    : null;
  const progressThroughTimeline = daysSinceStart != null && projectDuration && projectDuration > 0
    ? Math.max(0, Math.min(100, (daysSinceStart / projectDuration) * 100))
    : null;

  return (
    <Card className="overflow-hidden">
      {/* Hero band with project name + temporal anchor */}
      <div className="px-4 py-3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <ImageIcon className="h-3 w-3" /> Temporal View
            </div>
            <h2 className="text-base font-semibold text-white mt-0.5 truncate">{project.name}</h2>
            {project.district && project.state && (
              <div className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {project.district}, {project.state}
              </div>
            )}
          </div>
          <Badge variant={project.status === 'COMPLETED' ? 'success' : 'info'}>
            {project.status}
          </Badge>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-300">As of</span>
          <span className="text-white font-semibold">
            {obsDate
              ? obsDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
              : '—'}
          </span>
        </div>
      </div>

      <CardBody className="space-y-4 pt-4">
        {/* Temporal progress bar */}
        {progressThroughTimeline != null && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Project Timeline</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {daysSinceStart ?? '—'}d / {projectDuration ?? '—'}d
              </span>
            </div>
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${progressThroughTimeline}%` }}
              />
              {obsDate && startDate && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-500 ring-2 ring-white shadow-md -translate-x-1/2"
                  style={{ left: `${progressThroughTimeline}%` }}
                  title="Selected observation"
                />
              )}
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
              <span>{startDate ? formatDate(startDate.toISOString()) : '—'}</span>
              <span>{endDate ? formatDate(endDate.toISOString()) : '—'}</span>
            </div>
          </div>
        )}

        {/* Temporal stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <Stat
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Day of project"
            value={daysSinceStart != null ? `${daysSinceStart}` : '—'}
            hint={daysSinceStart != null ? `days since start` : ''}
          />
          <Stat
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Until end"
            value={daysUntilEnd != null ? `${daysUntilEnd}` : '—'}
            hint={daysUntilEnd != null ? (daysUntilEnd >= 0 ? 'days remaining' : 'days overdue') : ''}
            warn={daysUntilEnd != null && daysUntilEnd < 0}
          />
          <Stat
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Observations"
            value={`${totalObservations}`}
            hint="real Sentinel-2 captures"
          />
          <Stat
            icon={<Hash className="h-3.5 w-3.5" />}
            label="Checkpoints"
            value={`${selectedEntry ? 1 : 0}`}
            hint="selected"
          />
        </div>

        {/* Baseline / latest mini comparison */}
        {(baseline || latest) && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Project Arc
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {baseline && (
                <div>
                  <div className="text-slate-500">Baseline</div>
                  <div className="font-semibold text-slate-900">{formatDate(baseline.observationDate)}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Cloud {baseline.cloudCover}%</div>
                </div>
              )}
              {latest && (
                <div>
                  <div className="text-slate-500">Latest</div>
                  <div className="font-semibold text-slate-900">{formatDate(latest.observationDate)}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Cloud {latest.cloudCover}%</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No-data / no observation hint */}
        {selectedEntry && selectedEntry.availability === 'NO_USABLE_OBSERVATION' && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-700">No usable observation this week</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  {selectedEntry.reason === 'CLOUD_COVER_TOO_HIGH'
                    ? 'All available scenes in this week exceeded the cloud cover threshold.'
                    : selectedEntry.reason === 'NO_SCENE_AVAILABLE'
                    ? 'No Sentinel-2 pass was available over the project area for this week.'
                    : selectedEntry.reason ?? 'No Sentinel-2 image was available for this week.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Stat({
  icon, label, value, hint, warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-lg border p-2.5',
      warn ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200',
    )}>
      <div className={cn(
        'flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold',
        warn ? 'text-red-700' : 'text-slate-500',
      )}>
        {icon}
        {label}
      </div>
      <div className={cn(
        'text-lg font-bold mt-0.5',
        warn ? 'text-red-700' : 'text-slate-900',
      )}>{value}</div>
      {hint && (
        <div className={cn('text-[10px] mt-0.5', warn ? 'text-red-600' : 'text-slate-500')}>
          {hint}
        </div>
      )}
    </div>
  );
}
