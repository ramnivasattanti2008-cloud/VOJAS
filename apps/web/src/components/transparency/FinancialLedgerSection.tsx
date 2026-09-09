'use client';

import { DollarSign, FileText } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import type { PublicProjectDetail } from '@vojas/api-client';

interface FinancialLedgerSectionProps {
  project: PublicProjectDetail;
}

export function FinancialLedgerSection({ project }: FinancialLedgerSectionProps) {
  const approved = project.approvedAmount ?? 0;
  const spent = project.spentAmount ?? 0;
  const unspent = Math.max(0, approved - spent);
  const utilizationRate = approved > 0 ? (spent / approved) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-tight">Public Money &amp; Financial Ledger</h3>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Official financial allocations and cumulative expenditure records for this MPLADS work.
          </p>
        </div>
        <span className="text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full font-bold">
          {utilizationRate.toFixed(1)}% Utilized
        </span>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50/20">
          <CardBody className="p-4 space-y-1">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
              1. Sanctioned Budget
            </span>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(approved)}</div>
            <p className="text-[11px] text-slate-500">Total approved fund allocation</p>
          </CardBody>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/20">
          <CardBody className="p-4 space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              2. Reported Expenditure
            </span>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(spent)}</div>
            <p className="text-[11px] text-slate-500">Cumulative utilized funds</p>
          </CardBody>
        </Card>

        <Card className="border-amber-200 bg-amber-50/20">
          <CardBody className="p-4 space-y-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
              3. Unspent Balance
            </span>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(unspent)}</div>
            <p className="text-[11px] text-slate-500">Remaining unreleased or unutilized</p>
          </CardBody>
        </Card>
      </div>

      {/* 3. Utilization Progress Bar */}
      <Card>
        <CardHeader>
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Fund Utilization Progress
          </h4>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>Progress: {utilizationRate.toFixed(1)}%</span>
            <span>Unspent: {(100 - utilizationRate).toFixed(1)}%</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden p-0.5 border border-slate-200">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, utilizationRate))}%` }}
            />
          </div>

          <div className="grid grid-cols-2 text-[11px] text-slate-500 pt-1">
            <div>Executing Agency: <strong>{project.district || 'District Administration'}, {project.state}</strong></div>
            <div className="text-right">Contractor: <strong>{project.contractor || 'Not assigned / In-house'}</strong></div>
          </div>
        </CardBody>
      </Card>

      {/* 4. Financial Audit & Truth Caveat */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <FileText className="h-4 w-4 text-blue-600" />
          Financial Provenance &amp; Verification Note
        </div>
        <p className="leading-relaxed text-[11px]">
          All figures shown above are mirrored directly from official administrative records on the Ministry of Statistics and Programme Implementation (MoSPI) MPLADS portal.
        </p>
        <p className="leading-relaxed text-[11px] text-slate-500 border-t border-slate-200 pt-2">
          <strong>Important Caveat:</strong> Satellite observations monitor physical ground disturbance (earthworks, concrete structures, tree cover). Satellite data <em>cannot</em> inspect bank transfers, contractor invoices, material pricing, or audit compliance.
        </p>
      </div>
    </div>
  );
}
