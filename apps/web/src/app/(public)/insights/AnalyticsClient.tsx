'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin, CheckCircle2, Activity, AlertTriangle } from 'lucide-react';
import { createProjectsApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import { useSectorOverview } from '@/hooks/useSectors';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const projectsApi = createProjectsApi(apiClient);

function StatCard({ icon: Icon, label, value, color }: { icon: typeof MapPin; label: string; value: number | string; color: string }) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 mb-2">
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <p className="text-xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </CardBody>
    </Card>
  );
}

export function AnalyticsClient() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['public-analytics-summary'],
    queryFn: () => projectsApi.public.getSummary(),
  });
  const { data: overview, isLoading: overviewLoading } = useSectorOverview();

  const sectorsWithProjects = (overview?.projectStats ?? [])
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Project counts and status across all 16 MPLAD sectors, sourced from the same database as the rest
          of VOJAS — no separate or estimated figures.
        </p>
      </div>

      {summaryLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-vojas-500" />
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={MapPin} label="Total Projects" value={summary.totalProjects} color="text-indigo-600" />
          <StatCard icon={CheckCircle2} label="Completed" value={summary.completedProjects} color="text-emerald-600" />
          <StatCard icon={Activity} label="In Progress" value={summary.inProgressProjects} color="text-blue-600" />
          <StatCard icon={AlertTriangle} label="Delayed" value={summary.delayedProjects} color="text-amber-600" />
        </div>
      ) : null}

      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">By Sector</h2>
        {overviewLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-vojas-500" />
          </div>
        ) : sectorsWithProjects.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-sm text-slate-400 text-center py-6">No sector data available yet.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectorsWithProjects.map((s) => {
              const cfg = overview?.sectors.find((c) => c.code === s.sector);
              return (
                <Link key={s.sector} href={`/insights/${s.sector}`}>
                  <Card className="h-full hover:border-vojas-300 hover:shadow-sm transition-all">
                    <CardBody className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl" aria-hidden="true">{cfg?.icon ?? '📁'}</span>
                          <h3 className="font-semibold text-slate-800 text-sm">{cfg?.shortName ?? s.sector.replace(/_/g, ' ')}</h3>
                        </div>
                        <Badge variant="neutral">{s.total}</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-400">Completed</p>
                          <p className="font-semibold text-emerald-600">{s.completed}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">In Progress</p>
                          <p className="font-semibold text-blue-600">{s.inProgress}</p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
