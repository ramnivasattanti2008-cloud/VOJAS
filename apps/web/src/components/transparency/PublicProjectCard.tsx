'use client';

import { Badge } from '@/components/ui/Badge';
import { cn, formatCurrency } from '@/lib/utils';
import type { PublicProjectListItem } from '@vojas/api-client';
import { CheckCircle2, Clock, MapPin, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function PublicProjectCard({ project }: { project: PublicProjectListItem }) {
  const hasLocation = project.latitude != null && project.longitude != null;
  const isDone = project.status === 'COMPLETED' || project.status === 'VERIFIED';

  const progressPercent =
    project.approvedAmount > 0
      ? Math.min(100, Math.round((project.spentAmount / project.approvedAmount) * 100))
      : isDone
      ? 100
      : 0;

  return (
    <Link
      href={`/explore/${project.id}`}
      className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-vojas-400 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-vojas-700 transition-colors">
          {project.name}
        </h3>

        {/* Prominent DONE / NOT DONE marker */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          {isDone ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              DONE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
              <Clock className="w-3 h-3 text-amber-600" />
              NOT DONE
            </span>
          )}
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
            {project.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
        <MapPin className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
        {[project.district, project.state].filter(Boolean).join(', ') || 'Location not available'}
      </p>

      {/* Progress meter bar */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Physical / Fund Progress</span>
          <span className={cn('font-semibold font-mono', isDone ? 'text-emerald-700' : 'text-slate-700')}>
            {progressPercent}%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', isDone ? 'bg-emerald-500' : 'bg-vojas-500')}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
        <Badge variant="neutral">{project.sector.replace(/_/g, ' ')}</Badge>
        {!hasLocation && <span className="text-[11px] text-slate-400">No mapped location</span>}
      </div>

      {project.mp && (
        <div className="mt-2.5 flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-slate-400 text-[11px]">MP:</span>
            <span className="font-medium text-slate-700 truncate">{project.mp.name}</span>
          </div>
          {project.mp.party && (
            <span className="text-[10px] font-semibold text-vojas-700 bg-vojas-50 px-1.5 py-0.5 rounded border border-vojas-200 shrink-0">
              {project.mp.party}
            </span>
          )}
        </div>
      )}

      {project.projectRisk && (
        <div
          className={cn(
            'mt-2.5 px-2.5 py-2 rounded-lg border text-xs flex flex-col gap-1',
            project.projectRisk.riskLevel === 'CRITICAL'
              ? 'bg-rose-50/90 border-rose-200 text-rose-900'
              : project.projectRisk.riskLevel === 'HIGH'
              ? 'bg-amber-50/90 border-amber-200 text-amber-900'
              : project.projectRisk.riskLevel === 'MEDIUM'
              ? 'bg-sky-50/80 border-sky-200 text-slate-800'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-[11px] tracking-wide">
              <Sparkles className="w-3 h-3 text-vojas-600" />
              <span>AI RISK AUDIT</span>
            </div>
            <span
              className={cn(
                'font-mono font-bold text-[10px] px-1.5 py-0.5 rounded text-white shadow-2xs',
                project.projectRisk.riskLevel === 'CRITICAL'
                  ? 'bg-rose-600'
                  : project.projectRisk.riskLevel === 'HIGH'
                  ? 'bg-amber-600'
                  : project.projectRisk.riskLevel === 'MEDIUM'
                  ? 'bg-sky-700'
                  : 'bg-emerald-600'
              )}
            >
              {project.projectRisk.riskScore}/100 · {project.projectRisk.riskLevel}
            </span>
          </div>
          {project.projectRisk.primaryDriver && (
            <p className="text-[11px] leading-tight text-slate-600 line-clamp-1 italic">
              {project.projectRisk.primaryDriver}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div>
          <p className="text-slate-400 text-[11px]">Sanctioned</p>
          <p className="font-semibold text-slate-700 font-mono">{formatCurrency(project.approvedAmount)}</p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-[11px]">Spent</p>
          <p className="font-semibold text-slate-700 font-mono">{formatCurrency(project.spentAmount)}</p>
        </div>
      </div>
    </Link>
  );
}
