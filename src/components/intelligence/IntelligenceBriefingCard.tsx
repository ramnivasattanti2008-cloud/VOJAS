'use client';

import React from 'react';
import Link from 'next/link';
import {
  Brain,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Coins,
  Activity,
  Calendar,
  Eye,
  Building2,
  MessageSquare,
  Satellite,
  Info,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { ProjectIntelligence, SignalCard } from '@vojas/api-client';

interface IntelligenceBriefingCardProps {
  intelligence: ProjectIntelligence;
  className?: string;
  projectId?: string;
}

const SIGNAL_ICONS: Record<string, typeof Coins> = {
  FINANCIAL: Coins,
  PROGRESS: Activity,
  TIMELINE: Calendar,
  INSPECTION: Eye,
  CONTRACTOR: Building2,
  CITIZEN: MessageSquare,
  SATELLITE: Satellite,
};

const STATUS_BADGES: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  LOW: { label: 'Normal / Consistent', variant: 'success' },
  MEDIUM: { label: 'Review Recommended', variant: 'warning' },
  HIGH: { label: 'Attention Required', variant: 'danger' },
  UNAVAILABLE: { label: 'Not Recorded', variant: 'neutral' },
};

export function IntelligenceBriefingCard({
  intelligence,
  className,
  projectId,
}: IntelligenceBriefingCardProps) {
  const {
    overallStatus,
    risk,
    signalCards,
    whyFlagged,
    recommendedActions,
    dataFreshness,
    evidenceSummary,
    computedAt,
  } = intelligence;

  const targetProjectId = projectId ?? intelligence.projectId;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Top Banner Verdict */}
      <Card className="overflow-hidden border-slate-200 shadow-sm bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white">
        <CardBody className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300">
                  <Brain className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                  Civic AI Cross-Signal Synthesis
                </span>
                <span className="text-xs text-slate-400">
                  • Evaluated {formatDate(computedAt)}
                </span>
              </div>

              <h2 className="text-xl font-bold text-white tracking-tight">
                {overallStatus === 'HIGH' && 'Potential Discrepancies Requiring Ground Verification'}
                {overallStatus === 'MEDIUM' && 'Moderate Signal Variance — Review Advised'}
                {overallStatus === 'LOW' && 'Multi-Signal Integrity: Consistent with Official Reports'}
                {overallStatus === 'UNAVAILABLE' && 'Baseline Signals Pending Public Ground Evidence'}
              </h2>

              <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
                Synthesis derived deterministically from {evidenceSummary?.total ?? 0} cross-source evidence items,
                including financial releases, Sentinel-2 spectral observations, contractor submissions, and citizen reports.
                Zero fabricated assumptions applied.
              </p>
            </div>

            {/* Overall Score Badge */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-left sm:text-right">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Multi-Signal Score</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">{risk?.score ?? 0}</span>
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
              </div>
              <Badge
                variant={
                  risk?.level === 'CRITICAL' || risk?.level === 'HIGH'
                    ? 'danger'
                    : risk?.level === 'MEDIUM'
                    ? 'warning'
                    : 'success'
                }
                size="sm"
              >
                {risk?.level ?? overallStatus} RISK
              </Badge>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 7 Cross-Signal Assessment Matrix */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span>7-Pillar Integrity Matrix</span>
            <span className="text-xs font-normal text-slate-400">(Deterministic Cross-Corroboration)</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(signalCards ?? []).map((card) => {
            const Icon = SIGNAL_ICONS[card.key] ?? Activity;
            const badgeMeta = STATUS_BADGES[card.status] ?? STATUS_BADGES.UNAVAILABLE;

            return (
              <Card key={card.key} className="border-slate-200 bg-white hover:border-slate-300 transition-colors">
                <CardBody className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-slate-100 text-slate-700">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">{card.label}</span>
                    </div>
                    <Badge variant={badgeMeta.variant} size="sm">
                      {badgeMeta.label}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                    {card.summary}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {card.freshness.ageDays != null ? `${card.freshness.ageDays}d old` : 'No date'}
                    </span>
                    <span className={cn(
                      'font-medium',
                      card.freshness.status === 'FRESH' && 'text-emerald-600',
                      card.freshness.status === 'STALE' && 'text-amber-600',
                      card.freshness.status === 'UNAVAILABLE' && 'text-slate-400'
                    )}>
                      {card.freshness.status === 'FRESH' && '● Current'}
                      {card.freshness.status === 'STALE' && '▲ Outdated'}
                      {card.freshness.status === 'UNAVAILABLE' && '○ Missing'}
                    </span>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Why Flagged & Recommended Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Why Flagged */}
        <Card className="border-slate-200">
          <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>Key Observations & Drivers</span>
          </CardHeader>
          <CardBody className="p-4 space-y-2.5">
            {(!whyFlagged || whyFlagged.length === 0) ? (
              <p className="text-xs text-slate-500 italic py-2">
                No active flags. Reported financial disbursements and recorded timelines align with expected parameters.
              </p>
            ) : (
              whyFlagged.map((flag, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="text-amber-600 font-bold shrink-0 mt-0.5">•</span>
                  <span className="leading-relaxed">{flag}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Recommended Civic Actions */}
        <Card className="border-slate-200">
          <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Recommended Civic & Official Next Steps</span>
          </CardHeader>
          <CardBody className="p-4 space-y-2.5">
            {(!recommendedActions || recommendedActions.length === 0) ? (
              <p className="text-xs text-slate-500 italic py-2">
                Project progress is within normal bounds. Routine periodic field verification remains recommended.
              </p>
            ) : (
              recommendedActions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                  <span className="leading-relaxed">{action}</span>
                </div>
              ))
            )}

            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center gap-3">
              <Link
                href={`/report?projectId=${targetProjectId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>Submit Ground Verification</span>
                <ArrowRight className="h-3 w-3" />
              </Link>

              <Link
                href={`/projects/${targetProjectId}/time-machine`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Satellite className="h-3 w-3 text-slate-500" />
                <span>Satellite Time-Lapse</span>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Zero Fabricated Data Integrity Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-800">Platform Integrity Mandate:</strong> VOJAS does not synthesize or invent observations.
          Signals labelled <em>Not Recorded</em> reflect genuine official gazette gaps rather than negative assumptions.
          All spectral conclusions reference real Sentinel-2 Level-2A imagery processed via Copernicus European Space Agency feeds.
        </p>
      </div>
    </div>
  );
}
