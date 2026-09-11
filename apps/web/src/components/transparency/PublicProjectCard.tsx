'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import type { PublicProjectListItem } from '@vojas/api-client';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'> = {
  COMPLETED: 'success',
  VERIFIED: 'success',
  IN_PROGRESS: 'info',
  APPROVED: 'primary',
  SANCTIONED: 'primary',
  CANCELLED: 'danger',
  UNSANCTIONED: 'neutral',
  PROPOSED: 'neutral',
};

export function PublicProjectCard({ project }: { project: PublicProjectListItem }) {
  const hasLocation = project.latitude != null && project.longitude != null;

  return (
    <Link
      href={`/explore/${project.id}`}
      className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-vojas-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">{project.name}</h3>
        <Badge variant={STATUS_VARIANT[project.status] ?? 'neutral'} className="shrink-0">
          {project.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
        <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
        {[project.district, project.state].filter(Boolean).join(', ') || 'Location not available'}
      </p>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <Badge variant="neutral">{project.sector.replace(/_/g, ' ')}</Badge>
        {!hasLocation && (
          <span className="text-[11px] text-slate-400">No mapped location</span>
        )}
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

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div>
          <p className="text-slate-400">Sanctioned</p>
          <p className="font-semibold text-slate-700">{formatCurrency(project.approvedAmount)}</p>
        </div>
        <div className="text-right">
          <p className="text-slate-400">Spent</p>
          <p className="font-semibold text-slate-700">{formatCurrency(project.spentAmount)}</p>
        </div>
      </div>
    </Link>
  );
}
