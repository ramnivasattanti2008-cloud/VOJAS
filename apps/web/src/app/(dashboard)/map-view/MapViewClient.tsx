'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Layers, AlertTriangle, Search, X } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useProjects } from '@/hooks/useProjects';
import { formatCurrency } from '@/lib/utils';
import { ProjectStatus } from '@vojas/shared';
import type { ProjectSector } from '@vojas/shared';

const InteractiveGisMap = dynamic(
  () => import('@/components/map/InteractiveGisMap').then((m) => m.InteractiveGisMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] rounded-2xl bg-slate-950 flex items-center justify-center text-sm text-slate-400 font-mono">
        INITIALIZING TACTICAL GIS MAP ENGINE…
      </div>
    ),
  }
);

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  COMPLETED: 'success',
  IN_PROGRESS: 'info',
  CANCELLED: 'danger',
  PROPOSED: 'neutral',
  APPROVED: 'info',
  VERIFIED: 'success',
};

const SECTOR_COLORS: Partial<Record<ProjectSector, string>> = {
  PUBLIC_INFRASTRUCTURE: '#6366f1',
  WATER_SANITATION: '#0ea5e9',
  EDUCATION: '#f59e0b',
  HEALTH: '#ef4444',
  AGRICULTURE: '#22c55e',
  ENVIRONMENT: '#10b981',
  TRANSPORT: '#8b5cf6',
  ENERGY: '#eab308',
  HOUSING: '#f97316',
};

export function MapViewClient() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { data, isLoading } = useProjects({
    search: search || undefined,
    state: state || undefined,
    limit: 200,
  });

  const projects = data?.data ?? [];
  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : null;

  const mappedProjects = useMemo(() => {
    return projects
      .filter((p: any) => p.latitude != null && p.longitude != null && !isNaN(p.latitude) && !isNaN(p.longitude))
      .map((p: any) => ({
        id: p.id,
        title: p.name || p.title || 'MPLADS Project',
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        district: p.district,
        state: p.state,
        constituency: p.constituency,
        sanctionedAmount: p.sanctionedAmount,
        expenditure: p.expenditure,
        status: p.status,
        contractorName: p.contractorName,
      }));
  }, [projects]);

  const handleMarkerClick = useCallback((projectId: string) => {
    setSelectedProjectId((prev) => (prev === projectId ? null : projectId));
  }, []);

  // Group projects by state for summary
  const byState = projects.reduce<Record<string, number>>((acc, p) => {
    if (p.state) acc[p.state] = (acc[p.state] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Map View</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {isLoading ? 'Loading…' : `${projects.length} projects on map`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            aria-label="Search projects"
          />
        </div>
        <Input
          label="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="Filter by state"
          className="max-w-[200px]"
        />
        <Button
          variant="ghost"
          size="md"
          onClick={() => {
            setSearch('');
            setState('');
          }}
          leftIcon={<X className="h-4 w-4" />}
        >
          Reset
        </Button>
      </div>

      {/* Map + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map area — India SVG + project markers */}
        {/* Map area */}
        <div className="lg:col-span-2">
          <InteractiveGisMap
            projects={mappedProjects}
            heightClass="h-[560px]"
            className="rounded-2xl"
          />
        </div>

        {/* Sidebar — state summary + project list */}
        <div className="space-y-4">
          {/* State summary */}
          <Card>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-900">By State</h2>
            </div>
            <CardBody className="space-y-2 max-h-60 overflow-y-auto">
              {Object.entries(byState)
                .sort((a, b) => b[1] - a[1])
                .map(([stateName, count]) => (
                  <div key={stateName} className="flex justify-between text-sm">
                    <span className="text-slate-700">{stateName}</span>
                    <span className="font-medium text-slate-900">{count}</span>
                  </div>
                ))}
            </CardBody>
          </Card>

          {/* Recent / selected projects list */}
          <Card>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-900">Projects</h2>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {projects.slice(0, 30).map((p) => (
                <button
                  key={p.id}
                  className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors ${
                    p.id === selectedProjectId ? 'bg-vojas-50' : ''
                  }`}
                  onClick={() => handleMarkerClick(p.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.district ? `${p.district}, ` : ''}{p.state ?? ''}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[p.status] ?? 'neutral'} className="shrink-0 text-[10px]">
                      {p.status}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
