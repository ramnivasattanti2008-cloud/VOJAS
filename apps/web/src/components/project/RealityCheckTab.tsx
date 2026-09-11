'use client';

/**
 * Project Reality Check.
 *
 * Six sources are asked the same question — how far along is this project? —
 * and shown side by side so a reader can see for themselves whether they agree.
 * The panel leads with the conclusion (problem → evidence → action), because
 * the product's job is to answer "what should we do next?", not merely to
 * display data.
 *
 * A source with no data is rendered as explicitly absent, never as zero.
 */

import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Landmark,
  HardHat,
  Wallet,
  Users,
  Satellite,
  Leaf,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { DataUnavailable } from '@/components/ui/DataUnavailable';
import { useProjectRealityCheck } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import type {
  RealitySourceAccount,
  RealitySourceKey,
  RealityVerdict,
} from '@vojas/api-client';

const SOURCE_ICONS: Record<RealitySourceKey, LucideIcon> = {
  GOVERNMENT: Landmark,
  CONTRACTOR: HardHat,
  FINANCIAL: Wallet,
  CITIZEN: Users,
  GEOSPATIAL: Satellite,
  ENVIRONMENTAL: Leaf,
};

const VERDICT_PRESENTATION: Record<
  RealityVerdict,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral'; icon: LucideIcon; tone: string }
> = {
  CONSISTENT: {
    label: 'Sources agree',
    variant: 'success',
    icon: CheckCircle2,
    tone: 'border-emerald-200 bg-emerald-50',
  },
  MINOR_DISCREPANCY: {
    label: 'Minor discrepancy',
    variant: 'warning',
    icon: AlertTriangle,
    tone: 'border-amber-200 bg-amber-50',
  },
  CONFLICTING: {
    label: 'Sources conflict',
    variant: 'danger',
    icon: AlertTriangle,
    tone: 'border-red-200 bg-red-50',
  },
  INSUFFICIENT_EVIDENCE: {
    label: 'Cannot be verified',
    variant: 'neutral',
    icon: HelpCircle,
    tone: 'border-slate-200 bg-slate-50',
  },
};

/** A source's completion figure, drawn as a bar so gaps are visible at a glance. */
function CompletionBar({ value, muted }: { value: number; muted?: boolean }) {
  const clamped = Math.max(0, Math.min(value, 100));
  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-slate-500">Indicated completion</span>
        <span className="text-sm font-semibold text-slate-900 tabular-nums">{value.toFixed(1)}%</span>
      </div>
      <div
        className="h-2 rounded-full bg-slate-100 overflow-hidden"
        role="img"
        aria-label={`${value.toFixed(1)} percent`}
      >
        <div
          className={cn('h-full rounded-full', muted ? 'bg-slate-400' : 'bg-vojas-500')}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function SourceCard({ source }: { source: RealitySourceAccount }) {
  const Icon = SOURCE_ICONS[source.key];
  const isStale = source.available && source.freshness.status === 'STALE';

  return (
    <Card className={cn(!source.available && 'border-dashed bg-slate-50/60')}>
      <CardBody className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
              source.available ? 'bg-vojas-50 text-vojas-600' : 'bg-slate-100 text-slate-400'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 text-sm">{source.label}</h3>
              {!source.available && (
                <Badge variant="neutral" size="sm">
                  {source.unavailableReason ?? 'NO_DATA'}
                </Badge>
              )}
              {isStale && (
                <Badge variant="warning" size="sm">
                  <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                  Stale
                </Badge>
              )}
            </div>

            <p className={cn('text-sm mt-1', source.available ? 'text-slate-600' : 'text-slate-500')}>
              {source.statement}
            </p>

            {source.completionEstimate !== null && (
              <CompletionBar value={source.completionEstimate} muted={isStale} />
            )}

            <p className="text-xs text-slate-400 mt-2">
              {source.basis}
              {source.freshness.ageDays !== null && ` · updated ${source.freshness.ageDays} days ago`}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export function RealityCheckTab({ projectId }: { projectId: string }) {
  const { data: check, isLoading, isError } = useProjectRealityCheck(projectId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !check) {
    return (
      <DataUnavailable
        reason="SOURCE_UNAVAILABLE"
        title="Reality check could not be run"
        detail="The comparison service did not respond. No partial or estimated result is shown in its place."
      />
    );
  }

  const verdict = VERDICT_PRESENTATION[check.verdict];
  const VerdictIcon = verdict.icon;
  const { assessment } = check;

  return (
    <div className="space-y-6">
      {/* Conclusion first: problem → evidence → impact → action */}
      <Card className={cn('border', verdict.tone)}>
        <CardBody className="p-5">
          <div className="flex items-start gap-3">
            <VerdictIcon className="h-5 w-5 shrink-0 mt-0.5 text-slate-700" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge variant={verdict.variant}>{verdict.label}</Badge>
                <Badge variant="neutral" size="sm">Confidence: {assessment.confidence}</Badge>
              </div>

              <h2 className="font-semibold text-slate-900">Problem</h2>
              <p className="text-sm text-slate-700 mt-1">{assessment.problem}</p>

              <h3 className="font-semibold text-slate-900 text-sm mt-4">Evidence</h3>
              <ul className="mt-1 space-y-1">
                {assessment.evidence.map((line) => (
                  <li key={line} className="text-sm text-slate-600 flex gap-2">
                    <span aria-hidden="true" className="text-slate-400">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <h3 className="font-semibold text-slate-900 text-sm mt-4">Why it matters</h3>
              <p className="text-sm text-slate-700 mt-1">{assessment.impact}</p>

              <div className="mt-4 flex items-start gap-2 rounded-lg bg-white/70 border border-slate-200 p-3">
                <ArrowRight className="h-4 w-4 text-vojas-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Recommended action
                  </p>
                  <p className="text-sm text-slate-800 mt-0.5">{assessment.recommendedAction}</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 mt-3 italic">{assessment.disclaimer}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Contradictions, most material first */}
      {check.conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">
              Contradictions found ({check.conflicts.length})
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {check.conflicts.map((conflict) => (
                <li key={`${conflict.between[0]}-${conflict.between[1]}`} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <Badge
                      variant={
                        conflict.severity === 'HIGH'
                          ? 'danger'
                          : conflict.severity === 'MEDIUM'
                            ? 'warning'
                            : 'neutral'
                      }
                      size="sm"
                    >
                      {conflict.severity}
                    </Badge>
                    <p className="text-sm text-slate-700">{conflict.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* The six accounts */}
      <div>
        <h2 className="font-semibold text-slate-900 mb-3">What each source says</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {check.sources.map((source) => (
            <SourceCard key={source.key} source={source} />
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Checked {new Date(check.computedAt).toLocaleString('en-IN')}
      </p>
    </div>
  );
}
