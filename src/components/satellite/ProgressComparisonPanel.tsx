'use client';

import type { ProgressComparison } from '@vojas/api-client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, Info, CheckCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHANGE_LABELS: Record<string, string> = {
  NO_OBSERVABLE_CHANGE: 'No observable change',
  LOW_OBSERVABLE_CHANGE: 'Low observable change',
  MODERATE_OBSERVABLE_CHANGE: 'Moderate observable change',
  HIGH_OBSERVABLE_CHANGE: 'High observable change',
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  CONSISTENT: { icon: CheckCircle, label: 'Consistent', variant: 'success' },
  POSSIBLY_INCONSISTENT: { icon: AlertTriangle, label: 'Possible discrepancy', variant: 'warning' },
  INCONCLUSIVE: { icon: HelpCircle, label: 'Inconclusive', variant: 'info' },
  INSUFFICIENT_DATA: { icon: Info, label: 'Insufficient data', variant: 'neutral' },
};

export function ProgressComparisonPanel({ comparison }: { comparison: ProgressComparison | null }) {
  if (!comparison) {
    return (
      <Card>
        <CardBody className="py-8 text-center">
          <Activity className="h-8 w-8 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">No analysis available</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Run a satellite sync to generate change analyses for this project.
          </p>
        </CardBody>
      </Card>
    );
  }

  const statusCfg = STATUS_CONFIG[comparison.status] ?? STATUS_CONFIG.INSUFFICIENT_DATA;
  const StatusIcon = statusCfg.icon;
  const changeLabel = CHANGE_LABELS[comparison.changeClassification] ?? comparison.changeClassification;

  const ConfidenceIcon = comparison.confidence === 'HIGH' ? TrendingUp
    : comparison.confidence === 'MEDIUM' ? Minus
    : TrendingDown;

  return (
    <Card>
      <CardBody className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Progress Comparison</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">Reported vs Observable</div>
          </div>
          <Badge variant={statusCfg.variant}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusCfg.label}
          </Badge>
        </div>

        {/* The comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* Reported */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Reported Progress</div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900">{comparison.reportedProgress}</span>
              <span className="text-lg text-slate-500 font-bold">%</span>
            </div>
            <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, comparison.reportedProgress)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Government-reported</p>
          </div>

          {/* Observable */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Observable Change</div>
            <div className="text-sm font-bold text-slate-900 mt-1">{changeLabel}</div>
            <div className={cn(
              'mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
              comparison.changeClassification === 'HIGH_OBSERVABLE_CHANGE' || comparison.changeClassification === 'MODERATE_OBSERVABLE_CHANGE'
                ? 'bg-amber-50 text-amber-700'
                : comparison.changeClassification === 'LOW_OBSERVABLE_CHANGE'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-slate-100 text-slate-600',
            )}>
              {comparison.changeClassification === 'HIGH_OBSERVABLE_CHANGE' || comparison.changeClassification === 'MODERATE_OBSERVABLE_CHANGE'
                ? <TrendingUp className="h-3.5 w-3.5" />
                : <Minus className="h-3.5 w-3.5" />}
              {comparison.changeClassification.replace(/_/g, ' ')}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Satellite-derived</p>
          </div>
        </div>

        {/* Confidence */}
        <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
          <ConfidenceIcon className={cn(
            'h-4 w-4 shrink-0',
            comparison.confidence === 'HIGH' ? 'text-emerald-500'
              : comparison.confidence === 'MEDIUM' ? 'text-amber-500'
              : 'text-slate-400',
          )} />
          <div>
            <div className="text-xs font-semibold text-slate-800">
              Evidence confidence: <span className="uppercase">{comparison.confidence}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{comparison.limitations}</div>
          </div>
        </div>

        {/* Assessment */}
        <div className="border-t border-slate-100 pt-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">AI Assessment</div>
          <p className="text-sm text-slate-700 leading-relaxed">{comparison.evidence}</p>
        </div>

        {/* Observation dates */}
        {(comparison.baselineDate || comparison.comparisonDate) && (
          <div className="grid grid-cols-2 gap-3">
            {comparison.baselineDate && (
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">Baseline</div>
                <div className="text-sm font-semibold text-slate-800 mt-0.5">
                  {new Date(comparison.baselineDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            )}
            {comparison.comparisonDate && (
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">Latest</div>
                <div className="text-sm font-semibold text-slate-800 mt-0.5">
                  {new Date(comparison.comparisonDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
