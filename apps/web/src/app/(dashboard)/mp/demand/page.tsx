'use client';

/**
 * MP Development Demand — M14
 * Citizen development requests and demand clusters visualization.
 */

import { useState, useMemo } from 'react';
import {
  Target, MapPin, Users, AlertTriangle, CheckCircle2,
  X, ArrowUpRight, ChevronRight, Activity
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useMPDemandClusters } from '@/hooks/useMP';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { ProjectSector } from '@vojas/shared';

const SECTOR_LABELS: Partial<Record<ProjectSector, string>> = {
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
  PUBLIC_ADMIN: 'Public Admin',
  FINANCE_PROCUREMENT: 'Finance',
  JUSTICE: 'Justice',
  LEGISLATIVE: 'Legislative',
  PUBLIC_SAFETY: 'Public Safety',
};

const DEMAND_TYPES = [
  { id: 'CITIZEN', label: 'Citizen Demand', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'OFFICIAL', label: 'Official Requirement', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  { id: 'ADMIN', label: 'Administrative Priority', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
];

const INTENSITY_CONFIG = {
  LOW: { variant: 'success' as const, label: 'Low', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  MEDIUM: { variant: 'warning' as const, label: 'Medium', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  HIGH: { variant: 'danger' as const, label: 'High', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const mockDemands = [
  { id: '1', location: 'Ward 5, Mainpuri', requestCount: 45, sector: 'TRANSPORT', primaryIssue: 'Road construction needed', intensity: 'HIGH' as const, type: 'CITIZEN' as const },
  { id: '2', location: 'Block A, Rural', requestCount: 32, sector: 'WATER_SANITATION', primaryIssue: 'Clean water supply', intensity: 'HIGH' as const, type: 'CITIZEN' as const },
  { id: '3', location: 'District HQ', requestCount: 28, sector: 'HEALTH', primaryIssue: 'Primary health center upgrade', intensity: 'MEDIUM' as const, type: 'OFFICIAL' as const },
  { id: '4', location: 'Village Cluster 3', requestCount: 24, sector: 'EDUCATION', primaryIssue: 'Secondary school construction', intensity: 'MEDIUM' as const, type: 'CITIZEN' as const },
  { id: '5', location: 'Industrial Area', requestCount: 18, sector: 'ENERGY', primaryIssue: 'Power supply improvement', intensity: 'MEDIUM' as const, type: 'OFFICIAL' as const },
  { id: '6', location: 'Township B', requestCount: 15, sector: 'HOUSING', primaryIssue: 'Affordable housing scheme', intensity: 'LOW' as const, type: 'ADMIN' as const },
  { id: '7', location: 'Gram Panchayat D', requestCount: 12, sector: 'AGRICULTURE', primaryIssue: 'Irrigation facilities', intensity: 'LOW' as const, type: 'CITIZEN' as const },
  { id: '8', location: 'Urban Ward 12', requestCount: 10, sector: 'ENVIRONMENT', primaryIssue: 'Solid waste management', intensity: 'LOW' as const, type: 'ADMIN' as const },
];

export default function MPDemandPage() {
  const { user } = useAuth();
  const mpId = (user as any)?.mpId ?? 'current-mp';
  useMPDemandClusters(mpId);

  const [filterType, setFilterType] = useState<string>('');
  const [filterIntensity, setFilterIntensity] = useState<string>('');
  const [filterSector, setFilterSector] = useState<string>('');

  const demands = mockDemands;

  const filteredDemands = useMemo(() => {
    return demands.filter((d) => {
      if (filterType && d.type !== filterType) return false;
      if (filterIntensity && d.intensity !== filterIntensity) return false;
      if (filterSector && d.sector !== filterSector) return false;
      return true;
    });
  }, [demands, filterType, filterIntensity, filterSector]);

  const byIntensity = useMemo(() => ({
    HIGH: filteredDemands.filter((d) => d.intensity === 'HIGH'),
    MEDIUM: filteredDemands.filter((d) => d.intensity === 'MEDIUM'),
    LOW: filteredDemands.filter((d) => d.intensity === 'LOW'),
  }), [filteredDemands]);

  const bySector = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredDemands.forEach((d) => {
      grouped[d.sector] = (grouped[d.sector] ?? 0) + d.requestCount;
    });
    return Object.entries(grouped)
      .sort(([, a], [, b]) => b - a)
      .map(([sector, count]) => ({ sector, count }));
  }, [filteredDemands]);

  const clearFilters = () => {
    setFilterType('');
    setFilterIntensity('');
    setFilterSector('');
  };

  const hasFilters = !!(filterType || filterIntensity || filterSector);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Target className="h-4 w-4" />
            <span>My Constituency</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Development Demand</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filteredDemands.length} demand clusters identified
          </p>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEMAND_TYPES.map((type) => (
              <div
                key={type.id}
                className={cn('p-4 rounded-lg border-2', type.bgColor, type.borderColor)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn('w-3 h-3 rounded-full', type.color.replace('text-', 'bg-'))} />
                  <h3 className={cn('font-semibold', type.color)}>{type.label}</h3>
                </div>
                <p className="text-xs text-slate-600">
                  {type.id === 'CITIZEN' && 'Direct requests from constituency residents through official channels'}
                  {type.id === 'OFFICIAL' && 'Requirements identified by government departments and officials'}
                  {type.id === 'ADMIN' && 'Priorities set by administrative decisions and policy mandates'}
                </p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">High Priority</p>
                <p className="text-xl font-bold text-red-600">{byIntensity.HIGH.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Activity className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Medium Priority</p>
                <p className="text-xl font-bold text-amber-600">{byIntensity.MEDIUM.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Low Priority</p>
                <p className="text-xl font-bold text-emerald-600">{byIntensity.LOW.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-vojas-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-vojas-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Requests</p>
                <p className="text-xl font-bold text-vojas-600">
                  {filteredDemands.reduce((sum, d) => sum + d.requestCount, 0)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Demand Clusters</h2>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} leftIcon={<X className="h-3 w-3" />}>
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-vojas-500"
                >
                  <option value="">All Types</option>
                  {DEMAND_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <select
                  value={filterIntensity}
                  onChange={(e) => setFilterIntensity(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-vojas-500"
                >
                  <option value="">All Priorities</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </select>
                <select
                  value={filterSector}
                  onChange={(e) => setFilterSector(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-vojas-500"
                >
                  <option value="">All Sectors</option>
                  {Object.entries(SECTOR_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredDemands.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No demands match your filters</p>
                  </div>
                ) : (
                  filteredDemands.map((demand) => {
                    const intensity = INTENSITY_CONFIG[demand.intensity];
                    const typeInfo = DEMAND_TYPES.find((t) => t.id === demand.type);

                    return (
                      <div key={demand.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className={cn('w-3 h-3 rounded-full mt-1.5', intensity.bgColor)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <h3 className="font-semibold text-slate-900">{demand.primaryIssue}</h3>
                                <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {demand.location}
                                </p>
                              </div>
                              <Badge variant={intensity.variant}>{intensity.label} Priority</Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="neutral">{SECTOR_LABELS[demand.sector as ProjectSector] ?? demand.sector}</Badge>
                              <Badge variant="neutral" className={cn('text-xs', typeInfo?.color)}>{typeInfo?.label}</Badge>
                              <span className="text-sm text-slate-600 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {demand.requestCount} requests
                              </span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">By Sector</h2>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-slate-100">
                {bySector.map(({ sector, count }) => {
                  const maxCount = Math.max(...bySector.map((s) => s.count));
                  const percentage = (count / maxCount) * 100;

                  return (
                    <div key={sector} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-900">
                          {SECTOR_LABELS[sector as ProjectSector] ?? sector}
                        </p>
                        <span className="text-sm text-slate-600">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-vojas-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <Button variant="secondary" className="w-full justify-start" leftIcon={<Target className="h-4 w-4" />}>
                Generate Demand Report
              </Button>
              <Button variant="secondary" className="w-full justify-start" leftIcon={<MapPin className="h-4 w-4" />}>
                View Cluster Map
              </Button>
              <Button variant="secondary" className="w-full justify-start" leftIcon={<ArrowUpRight className="h-4 w-4" />}>
                Submit to Ministry
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
