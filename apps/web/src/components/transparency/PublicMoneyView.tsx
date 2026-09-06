'use client';

import { useMemo } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

interface PublicMoneyViewProps {
  approvedAmount?: number | null;
  releasedAmount?: number | null;
  spentAmount?: number | null;
  sanctionedAmount?: number | null;
  className?: string;
}

function formatINR(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '—';
  if (amount >= 1_00_00_000) {
    return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (amount >= 1_00_000) {
    return `₹${(amount / 1_00_000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

function ProgressBar({ value, max, color, label }: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-600">
        <span className="font-medium">{label}</span>
        <span className="font-semibold tabular-nums">{formatINR(value)}</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct.toFixed(1)}%` }}
        />
      </div>
    </div>
  );
}

export function PublicMoneyView({
  approvedAmount,
  releasedAmount,
  spentAmount,
  sanctionedAmount,
  className,
}: PublicMoneyViewProps) {
  const values = useMemo(() => {
    const approved = approvedAmount ?? sanctionedAmount ?? 0;
    const released = releasedAmount ?? 0;
    const spent = spentAmount ?? 0;
    const remaining = approved - spent;
    const releasePct = approved > 0 ? (released / approved) * 100 : 0;
    const spendPct = approved > 0 ? (spent / approved) * 100 : 0;

    return { approved, released, spent, remaining, releasePct, spendPct };
  }, [approvedAmount, releasedAmount, spentAmount, sanctionedAmount]);

  const hasAnyData = values.approved > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Public Financial Information</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
            SOURCE: REPORTED
          </span>
        </div>
      </CardHeader>
      <CardBody className="space-y-5">
        {!hasAnyData ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Financial information not available for this project.
          </div>
        ) : (
          <>
            {/* Summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Approved</p>
                <p className="text-sm font-bold text-slate-800 tabular-nums">{formatINR(values.approved)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Released</p>
                <p className="text-sm font-bold text-blue-600 tabular-nums">{formatINR(values.released)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Expended</p>
                <p className="text-sm font-bold text-emerald-600 tabular-nums">{formatINR(values.spent)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Remaining</p>
                <p className="text-sm font-bold text-amber-600 tabular-nums">{formatINR(values.remaining)}</p>
              </div>
            </div>

            {/* Visualization */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Allocation Breakdown</h3>

              <ProgressBar
                value={values.approved}
                max={values.approved}
                color="bg-slate-400"
                label="APPROVED"
              />
              <ProgressBar
                value={values.released}
                max={values.approved}
                color="bg-blue-400"
                label={`RELEASED (${values.releasePct.toFixed(0)}%)`}
              />
              <ProgressBar
                value={values.spent}
                max={values.approved}
                color="bg-emerald-500"
                label={`EXPENDED (${values.spendPct.toFixed(0)}%)`}
              />
              <ProgressBar
                value={values.remaining}
                max={values.approved}
                color="bg-amber-400"
                label="REMAINING"
              />
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
              Financial values are sourced from official government reports. All figures are subject to verification.
              &ldquo;Released&rdquo; indicates funds transferred to implementing agencies. &ldquo;Expended&rdquo; indicates actual spending as reported.
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
}
