'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useFinancialObservations,
  useFundLifecycle,
  useFinancialReconciliation,
  usePeerBenchmarks,
  useFinancialRiskSignals,
  useCrossSourceCorrelation,
} from '@/hooks/useFinancial';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, XCircle, Clock, FileText, BarChart2,
  ChevronDown, ChevronRight, RefreshCw, Loader2,
  ArrowRight, GitCompare, Target, ShieldAlert,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime, cn } from '@/lib/utils';

type SubTab = 'overview' | 'transactions' | 'reconciliation' | 'benchmarks';

const SEVERITY_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
};

const SIGNAL_LABELS: Record<string, string> = {
  BUDGET_OVERRUN: 'Budget Overrun',
  COST_ANOMALY: 'Cost Anomaly',
  EXPENDITURE_RATE_ANOMALY: 'Expenditure Rate Anomaly',
  STALLED_WITH_SPENDING: 'Stalled with Spending',
  PREMATURE_COMPLETION: 'Premature Completion',
  SUSPICIOUS_UNDERPEND: 'Suspended Under-Spending',
  SUSPICIOUS_OVERPEND: 'Suspicious Over-Spending',
};

export function FinancialTab({ projectId }: { projectId: string }) {
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [benchmarkScope, setBenchmarkScope] = useState<'sector' | 'district' | 'state' | 'national'>('sector');

  const { data: lifecycle, isLoading: loadingLifecycle } = useFundLifecycle(projectId);
  const { data: reconciliation, isLoading: loadingReconciliation } = useFinancialReconciliation(projectId);
  const { data: signals, isLoading: loadingSignals } = useFinancialRiskSignals(projectId);
  const { data: correlation, isLoading: loadingCorrelation } = useCrossSourceCorrelation(projectId);
  const { data: observations, isLoading: loadingObs } = useFinancialObservations(projectId);
  const { data: benchmark, isLoading: loadingBenchmark } = usePeerBenchmarks(projectId, benchmarkScope);

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex gap-1 border-b border-slate-200 pb-0">
        {([
          ['overview', 'Overview'],
          ['transactions', 'Transactions'],
          ['reconciliation', 'Reconciliation'],
          ['benchmarks', 'Benchmarks'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              subTab === key
                ? 'border-vojas-600 text-vojas-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {subTab === 'overview' && (
        <OverviewPanel
          lifecycle={lifecycle}
          loadingLifecycle={loadingLifecycle}
          reconciliation={reconciliation}
          signals={signals}
          loadingSignals={loadingSignals}
          correlation={correlation}
        />
      )}

      {/* Transactions */}
      {subTab === 'transactions' && (
        <TransactionsPanel observations={observations} isLoading={loadingObs} />
      )}

      {/* Reconciliation */}
      {subTab === 'reconciliation' && (
        <ReconciliationPanel
          reconciliation={reconciliation}
          isLoading={loadingReconciliation}
        />
      )}

      {/* Benchmarks */}
      {subTab === 'benchmarks' && (
        <BenchmarkPanel
          benchmark={benchmark}
          isLoading={loadingBenchmark}
          scope={benchmarkScope}
          onScopeChange={setBenchmarkScope}
        />
      )}
    </div>
  );
}

// ─── Overview Panel ────────────────────────────────────────────────────────────

function OverviewPanel({
  lifecycle,
  loadingLifecycle,
  reconciliation,
  signals,
  loadingSignals,
  correlation,
}: {
  lifecycle: any;
  loadingLifecycle: boolean;
  reconciliation: any;
  signals: any;
  loadingSignals: boolean;
  correlation: any;
}) {
  const lifecycleItems = lifecycle ? [
    { label: 'Sanctioned', value: lifecycle.sanctioned, color: 'text-slate-900' },
    { label: 'Allocated', value: lifecycle.allocated, color: 'text-blue-700' },
    { label: 'Released', value: lifecycle.released, color: 'text-blue-600' },
    { label: 'Expended', value: lifecycle.expended, color: 'text-vojas-700' },
    { label: 'Remaining', value: lifecycle.remaining, color: 'text-slate-500' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Fund Lifecycle Cards */}
      {loadingLifecycle ? (
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardBody>
                <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2 mb-2" />
                <div className="h-6 bg-slate-50 rounded animate-pulse w-3/4" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : lifecycle ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {lifecycleItems.map((item) => (
              <Card key={item.label}>
                <CardBody className="py-3">
                  <p className="text-xs text-slate-500 font-medium">{item.label}</p>
                  <p className={cn('text-lg font-bold mt-1', item.color)}>
                    {formatCurrency(item.value)}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Utilization bar */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Utilization</span>
                <span className="text-sm font-bold text-vojas-700">
                  {lifecycle.utilizationPercent.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    lifecycle.utilizationPercent > 100 ? 'bg-red-500' :
                    lifecycle.utilizationPercent > 90 ? 'bg-amber-500' :
                    'bg-vojas-500'
                  )}
                  style={{ width: `${Math.min(100, lifecycle.utilizationPercent)}%` }}
                />
              </div>
            </CardBody>
          </Card>
        </>
      ) : null}

      {/* Cross-Source Correlation Summary */}
      {correlation && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              Cross-Source Correlation
            </h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg',
                  correlation.overallConsistencyScore >= 70 ? 'bg-green-100 text-green-700' :
                  correlation.overallConsistencyScore >= 40 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                )}
              >
                {correlation.overallConsistencyScore}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Consistency Score: {correlation.overallConsistencyScore}/100
                </p>
                <p className="text-xs text-slate-500">
                  Based on financial ↔ satellite, financial ↔ document alignment
                </p>
              </div>
            </div>

            {correlation.redFlags.length > 0 && (
              <div className="space-y-1.5">
                {correlation.redFlags.map((flag: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {flag}
                  </div>
                ))}
              </div>
            )}

            {correlation.recommendations.length > 0 && (
              <div className="space-y-1.5">
                {correlation.recommendations.map((rec: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <Target className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {rec}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Risk Signals */}
      {loadingSignals ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardBody className="h-16 bg-slate-50 rounded animate-pulse" />
            </Card>
          ))}
        </div>
      ) : signals && signals.signals.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Financial Risk Signals
              </h2>
              <Badge variant={signals.compositeScore >= 50 ? 'danger' : signals.compositeScore >= 25 ? 'warning' : 'success'}>
                Score: {signals.compositeScore}/100
              </Badge>
            </div>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {signals.signals.map((sig: any, i: number) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    sig.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                    sig.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                    sig.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                    'bg-yellow-50 text-yellow-700'
                  )}
                >
                  {sig.severity === 'CRITICAL' ? <XCircle className="h-4 w-4" /> :
                   sig.severity === 'HIGH' ? <AlertTriangle className="h-4 w-4" /> :
                   <AlertTriangle className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">
                      {SIGNAL_LABELS[sig.signalType] ?? sig.signalType}
                    </span>
                    <Badge variant={SEVERITY_VARIANT[sig.severity] ?? 'neutral'}>
                      {sig.severity}
                    </Badge>
                    <Badge variant="neutral">
                      {sig.confidence} confidence
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{sig.explanation}</p>
                  {sig.deviationPercent !== null && (
                    <p className="text-xs text-slate-500 mt-1">
                      Deviation: {sig.deviationPercent}%{sig.expectedValue != null ? ` (expected: ${sig.expectedValue})` : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : signals && signals.signals.length === 0 ? (
        <Card>
          <CardBody className="py-8 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
            <p className="text-sm font-semibold text-slate-700">No financial anomalies detected</p>
            <p className="text-xs text-slate-500 mt-1">Financial signals are clean for this project.</p>
          </CardBody>
        </Card>
      ) : null}

      {/* Physical vs Financial Progress */}
      {reconciliation && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Physical vs Financial Progress</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Financial Progress</p>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-vojas-500 rounded-full"
                    style={{
                      width: `${Math.min(100, lifecycle ? (lifecycle.expended / Math.max(1, lifecycle.sanctioned)) * 100 : 0)}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-slate-600">
                  {lifecycle ? `${lifecycle.utilizationPercent.toFixed(1)}% of sanctioned amount` : '—'}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Satellite Progress</p>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      reconciliation.correlation.financialVsPhysical === 'MATCH' ? 'bg-green-500' :
                      'bg-red-500'
                    )}
                    style={{
                      width: `${Math.min(100, reconciliation.physical.satelliteProgressPercent ?? 0)}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-slate-600">
                  {reconciliation.physical.satelliteProgressPercent != null
                    ? `${reconciliation.physical.satelliteProgressPercent}% construction visible`
                    : 'No satellite data'}
                </p>
              </div>
            </div>

            {/* Correlation badge */}
            <div className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
              reconciliation.correlation.financialVsPhysical === 'MATCH' ? 'bg-green-50 text-green-800 border border-green-200' :
              reconciliation.correlation.financialVsPhysical === 'SUSPICIOUS_UNDERPEND' ? 'bg-red-50 text-red-800 border border-red-200' :
              reconciliation.correlation.financialVsPhysical === 'SUSPICIOUS_OVERPEND' ? 'bg-orange-50 text-orange-800 border border-orange-200' :
              'bg-slate-50 text-slate-600 border border-slate-200'
            )}>
              {reconciliation.correlation.financialVsPhysical === 'MATCH' ? <CheckCircle2 className="h-4 w-4" /> :
               reconciliation.correlation.financialVsPhysical !== 'INSUFFICIENT_DATA' ? <AlertTriangle className="h-4 w-4" /> :
               <Clock className="h-4 w-4" />}
              {reconciliation.correlation.explanation}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ─── Transactions Panel ────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  SANCTION: 'bg-purple-50 text-purple-700 border-purple-200',
  ALLOCATION: 'bg-blue-50 text-blue-700 border-blue-200',
  RELEASE: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  EXPENDITURE: 'bg-vojas-50 text-vojas-700 border-vojas-200',
  PAYMENT: 'bg-vojas-50 text-vojas-700 border-vojas-200',
  MILESTONE_PAYMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  BALANCE: 'bg-slate-50 text-slate-600 border-slate-200',
};

function TransactionsPanel({ observations, isLoading }: { observations: any[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 3, 5].map((i) => (
          <Card key={i}>
            <CardBody className="h-16 bg-slate-50 rounded animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  if (!observations || observations.length === 0) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <DollarSign className="h-8 w-8 mx-auto mb-3 text-slate-400" />
          <p className="text-sm font-semibold text-slate-600">No financial transactions</p>
          <p className="text-xs text-slate-500 mt-1">No financial observations recorded for this project yet.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {observations.map((obs: any) => (
              <tr key={obs.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                  {formatDate(obs.date)}
                </td>
                <td className="px-5 py-3">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full border font-medium',
                    TYPE_COLORS[obs.type.toUpperCase()] ?? 'bg-slate-50 text-slate-600 border-slate-200'
                  )}>
                    {obs.type}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-900 max-w-xs truncate">
                  {obs.description}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                  {obs.amount > 0 ? formatCurrency(obs.amount) : '—'}
                </td>
                <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                  {obs.vendor ?? '—'}
                </td>
                <td className="px-5 py-3">
                  <Badge
                    variant={obs.status === 'PAID' || obs.status === 'AUTHORIZED' ? 'success' :
                             obs.status === 'PENDING' ? 'warning' :
                             obs.status === 'REJECTED' ? 'danger' : 'neutral'}
                  >
                    {obs.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

// ─── Reconciliation Panel ──────────────────────────────────────────────────────

function ReconciliationPanel({ reconciliation, isLoading }: { reconciliation: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardBody className="h-24 bg-slate-50 rounded animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  if (!reconciliation) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <p className="text-sm text-slate-500">Reconciliation data unavailable</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Financial summary */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Financial Summary</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Total Expenditure</p>
              <p className="text-lg font-bold text-slate-900">
                {formatCurrency(reconciliation.financial.totalExpenditure)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Transactions</p>
              <p className="text-lg font-bold text-slate-900">{reconciliation.financial.transactionCount}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Last Transaction</p>
              <p className="text-lg font-bold text-slate-900">
                {reconciliation.financial.lastTransactionDate
                  ? formatDate(reconciliation.financial.lastTransactionDate)
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Invoices</p>
              <p className="text-lg font-bold text-slate-900">{reconciliation.documents.invoiceCount}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Timeline status */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Timeline Status</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Days Elapsed</p>
              <p className="text-lg font-bold text-slate-900">
                {reconciliation.timeline.daysElapsed != null ? `${reconciliation.timeline.daysElapsed}d` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Days Remaining</p>
              <p className="text-lg font-bold text-slate-900">
                {reconciliation.timeline.daysRemaining != null ? `${reconciliation.timeline.daysRemaining}d` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Expected Duration</p>
              <p className="text-lg font-bold text-slate-900">
                {reconciliation.timeline.expectedDurationDays != null
                  ? `${reconciliation.timeline.expectedDurationDays}d`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">On Track</p>
              <div className="flex items-center gap-1.5 mt-1">
                {reconciliation.timeline.onTrack
                  ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                  : <XCircle className="h-5 w-5 text-red-500" />}
                <span className={cn(
                  'text-lg font-bold',
                  reconciliation.timeline.onTrack ? 'text-green-700' : 'text-red-700'
                )}>
                  {reconciliation.timeline.onTrack ? 'Yes' : 'Delayed'}
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Correlation detail */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Correlation Analysis</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Financial vs Satellite</p>
              <Badge
                variant={
                  reconciliation.correlation.financialVsPhysical === 'MATCH' ? 'success' :
                  reconciliation.correlation.financialVsPhysical === 'SUSPICIOUS_UNDERPEND' ? 'danger' :
                  reconciliation.correlation.financialVsPhysical === 'SUSPICIOUS_OVERPEND' ? 'warning' :
                  'neutral'
                }
              >
                {reconciliation.correlation.financialVsPhysical.replace(/_/g, ' ')}
              </Badge>
              <p className="text-sm text-slate-600 mt-2">{reconciliation.correlation.explanation}</p>
              {reconciliation.correlation.discrepancyPercent != null && (
                <p className="text-xs text-slate-500 mt-1">
                  Discrepancy: {reconciliation.correlation.discrepancyPercent.toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ─── Benchmark Panel ──────────────────────────────────────────────────────────

function BenchmarkPanel({
  benchmark,
  isLoading,
  scope,
  onScopeChange,
}: {
  benchmark: any;
  isLoading: boolean;
  scope: 'sector' | 'district' | 'state' | 'national';
  onScopeChange: (s: 'sector' | 'district' | 'state' | 'national') => void;
}) {
  const scopes: Array<'sector' | 'district' | 'state' | 'national'> = ['sector', 'district', 'state', 'national'];

  if (isLoading) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-slate-500" />
          <p className="text-sm text-slate-500">Computing peer benchmarks…</p>
        </CardBody>
      </Card>
    );
  }

  if (!benchmark) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <BarChart2 className="h-8 w-8 mx-auto mb-3 text-slate-400" />
          <p className="text-sm font-semibold text-slate-600">Peer benchmarking unavailable</p>
          <p className="text-xs text-slate-500 mt-1">Not enough comparable projects found for benchmarking.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scope selector */}
      <div className="flex gap-2">
        {scopes.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={scope === s ? 'primary' : 'secondary'}
            onClick={() => onScopeChange(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)} Peers
          </Button>
        ))}
      </div>

      {/* Unit cost comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Unit Cost Comparison</h2>
            <Badge
              variant={benchmark.isOutlier ? 'warning' : 'success'}
            >
              {benchmark.isOutlier ? `Outlier (z=${benchmark.zScore})` : 'Within normal range'}
            </Badge>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-end gap-8">
            <div>
              <p className="text-xs text-slate-500">This Project</p>
              <p className="text-2xl font-bold text-vojas-700">
                ₹{benchmark.ourUnitCost.toLocaleString('en-IN')}
                <span className="text-sm font-normal text-slate-500 ml-1">/unit</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Median (Peers)</p>
              <p className="text-2xl font-bold text-slate-500">
                ₹{benchmark.unitCostStats.median.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Percentile</p>
              <p className="text-2xl font-bold text-slate-500">
                {benchmark.percentile != null ? `${benchmark.percentile.toFixed(0)}th` : '—'}
              </p>
            </div>
          </div>

          {/* Mini bar chart */}
          <div className="space-y-1.5">
            {[
              { label: 'P10', value: benchmark.unitCostStats.p10 },
              { label: 'P25', value: benchmark.unitCostStats.p25 },
              { label: 'Median', value: benchmark.unitCostStats.median },
              { label: 'P75', value: benchmark.unitCostStats.p75 },
              { label: 'P90', value: benchmark.unitCostStats.p90 },
              { label: 'This project', value: benchmark.ourUnitCost, highlight: true },
            ].map((item) => {
              const maxVal = Math.max(...[
                benchmark.unitCostStats.p90,
                benchmark.ourUnitCost,
              ]);
              const pct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
              return (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-16 text-right shrink-0">{item.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        item.highlight ? 'bg-vojas-600' : 'bg-slate-300'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-20">₹{item.value.toLocaleString('en-IN')}</span>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">
            Peer Statistics ({benchmark.unitCostStats.count} projects)
          </h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Mean', value: benchmark.unitCostStats.mean },
              { label: 'Std Dev', value: benchmark.unitCostStats.stdDev },
              { label: 'Min', value: benchmark.unitCostStats.min },
              { label: 'Max', value: benchmark.unitCostStats.max },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-sm font-semibold text-slate-900">
                  ₹{stat.value.toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
