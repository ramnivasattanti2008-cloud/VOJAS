'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useSectorConfig, useSectorSummary, useSectorAlerts } from '@/hooks/useSectors';
import { SectorDashboard } from '@/components/sector/SectorDashboard';
import type { ProjectSector } from '@vojas/shared';

export function AnalyticsSectorClient() {
  const params = useParams<{ code: string }>();
  const code = params.code as ProjectSector;

  const { data: sector, isLoading: sectorLoading } = useSectorConfig(code);
  const { data: summaryList, isLoading: summaryLoading } = useSectorSummary();
  const { data: alerts } = useSectorAlerts(code);

  const stats = summaryList?.find((s) => s.sector === code);

  if (!sectorLoading && !sector) {
    return (
      <div className="space-y-4">
        <Link href="/insights" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to Analytics
        </Link>
        <p className="text-sm text-slate-500">Unknown sector.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link href="/insights" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Analytics
        </Link>
        <div className="flex items-center gap-3">
          {sector && <span className="text-3xl" aria-hidden="true">{sector.icon}</span>}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{sector?.name ?? code.replace(/_/g, ' ')}</h1>
            {sector?.description && <p className="text-sm text-slate-500 mt-0.5">{sector.description}</p>}
          </div>
        </div>
        <Link
          href={`/explore?sector=${code}`}
          className="inline-block mt-3 text-sm font-medium text-vojas-600 hover:underline"
        >
          View all {stats?.total ?? ''} projects in this sector →
        </Link>
      </div>

      <SectorDashboard
        sector={sector!}
        stats={stats}
        alerts={alerts}
        isLoading={sectorLoading || summaryLoading}
      />
    </div>
  );
}
