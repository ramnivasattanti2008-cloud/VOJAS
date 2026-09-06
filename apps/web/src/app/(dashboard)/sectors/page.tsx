'use client';

/**
 * Sector Intelligence Directory — M13
 * Hub page showing all 16 sectors with project stats.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useSectorOverview } from '@/hooks/useSectors';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InformationClassificationBanner } from '@/components/transparency/InformationClassificationBanner';
import { cn, formatCurrency } from '@/lib/utils';
import { Layers, ArrowRight, MapPin, AlertTriangle, FileText, TrendingUp } from 'lucide-react';
import type { ProjectSector } from '@vojas/shared';

const SECTOR_LABELS: Record<string, string> = {
  PUBLIC_INFRASTRUCTURE: 'Public Infrastructure',
  WATER_SANITATION: 'Water & Sanitation',
  EDUCATION: 'Education',
  HEALTH: 'Health',
  AGRICULTURE: 'Agriculture',
  ENVIRONMENT: 'Environment',
  TRANSPORT: 'Transport',
  ENERGY: 'Energy',
  HOUSING: 'Housing',
  RURAL_DEVELOPMENT: 'Rural Development',
  SOCIAL_WELFARE: 'Social Welfare',
  PUBLIC_ADMIN: 'Public Administration',
  FINANCE_PROCUREMENT: 'Finance & Procurement',
  JUSTICE: 'Justice',
  LEGISLATIVE: 'Legislative',
  PUBLIC_SAFETY: 'Public Safety',
};

function getUtilization(stats: any): number {
  if (!stats?.totalAmount || stats.totalAmount === 0) return 0;
  return ((stats.spentAmount / stats.totalAmount) * 100);
}

export default function SectorsPage() {
  const { data: overview, isLoading } = useSectorOverview();
  const [filter, setFilter] = useState<string>('all');

  const sectors = overview?.sectors ?? [];
  const statsMap: Record<string, any> = {};
  if (overview?.projectStats) {
    for (const s of overview.projectStats) {
      statsMap[s.sector] = s;
    }
  }

  const filteredSectors = sectors.filter((s: any) => {
    if (filter === 'all') return true;
    const stats = statsMap[s.code];
    if (!stats) return false;
    if (filter === 'has-data') return stats.total > 0;
    if (filter === 'no-data') return stats.total === 0;
    return true;
  });

  const totalProjects = Object.values(statsMap).reduce((acc: number, s: any) => acc + (s?.total ?? 0), 0);
  const totalAmount = Object.values(statsMap).reduce((acc: number, s: any) => acc + (s?.totalAmount ?? 0), 0);
  const totalSpent = Object.values(statsMap).reduce((acc: number, s: any) => acc + (s?.spentAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Layers className="h-4 w-4" />
            <span>Intelligence Framework</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">16-Sector Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">
            Unified monitoring across all government sectors with AI-powered analytics.
          </p>
        </div>
      </div>

      {/* Information Classification */}
      <InformationClassificationBanner />

      {/* Overall Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Sectors', value: sectors.length, icon: Layers, color: 'text-indigo-600' },
          { label: 'Total Projects', value: totalProjects.toLocaleString(), icon: MapPin, color: 'text-slate-700' },
          { label: 'Total Sanctioned', value: formatCurrency(totalAmount), icon: TrendingUp, color: 'text-blue-600' },
          { label: 'Overall Utilization', value: totalAmount > 0 ? `${((totalSpent / totalAmount) * 100).toFixed(1)}%` : '—', icon: FileText, color: 'text-emerald-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn('h-4 w-4', color)} />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
              <p className={cn('text-lg font-bold', color)}>{value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All Sectors' },
          { key: 'has-data', label: 'With Data' },
          { key: 'no-data', label: 'No Data' },
        ].map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Sector Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="p-6 animate-pulse">
                <div className="h-8 bg-slate-200 rounded mb-3" />
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-4" />
                <div className="h-6 bg-slate-100 rounded w-1/2" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSectors.map((sector: any) => {
            const stats = statsMap[sector.code] ?? { total: 0, completed: 0, inProgress: 0, delayed: 0, totalAmount: 0, spentAmount: 0 };
            const utilization = getUtilization(stats);
            const indicatorCount = sector.indicators?.length ?? 0;
            const riskCount = sector.riskRules?.length ?? 0;
            const hasData = stats.total > 0;

            return (
              <Card key={sector.code} className={cn('transition-all hover:shadow-md', !hasData && 'opacity-60')}>
                <CardBody className="p-5">
                  {/* Sector Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{sector.icon}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800 leading-tight">
                          {SECTOR_LABELS[sector.code] ?? sector.name}
                        </h3>
                        <p className="text-xs text-slate-400">{sector.shortName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick description */}
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">{sector.description}</p>

                  {/* Stats */}
                  {hasData ? (
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Projects</span>
                        <span className="font-medium text-slate-700">{stats.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Completed</span>
                        <span className="font-medium text-emerald-600">{stats.completed.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">In Progress</span>
                        <span className="font-medium text-blue-600">{stats.inProgress.toLocaleString()}</span>
                      </div>
                      {utilization > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Utilization</span>
                          <span className={cn('font-medium', utilization > 80 ? 'text-emerald-600' : 'text-slate-700')}>
                            {utilization.toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {/* Mini utilization bar */}
                      {stats.totalAmount > 0 && (
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-3 mb-4 text-center">
                      <p className="text-xs text-slate-400">No project data yet</p>
                    </div>
                  )}

                  {/* Capabilities badges */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {indicatorCount > 0 && (
                      <Badge variant="neutral" className="text-xs">
                        {indicatorCount} indicators
                      </Badge>
                    )}
                    {riskCount > 0 && (
                      <Badge variant="warning" className="text-xs">
                        {riskCount} risk rules
                      </Badge>
                    )}
                    {sector.dataSources?.some((d: any) => d.apiAvailable) && (
                      <Badge variant="info" className="text-xs">
                        Live data
                      </Badge>
                    )}
                  </div>

                  {/* CTA */}
                  <Link href={`/sectors/${sector.code}`}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    >
                      View Sector
                    </Button>
                  </Link>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Framework Note */}
      <Card>
        <CardBody className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-700">About This Framework</p>
              <p className="text-xs text-slate-500 mt-1">
                This framework provides unified intelligence across all 16 government sectors. Each sector is powered by the same reusable architecture — indicators, risk rules, map layers, and AI context are configured per sector but share the same underlying systems. Indicators marked as AI-INTERPRETED are AI-generated and may not reflect official data.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
