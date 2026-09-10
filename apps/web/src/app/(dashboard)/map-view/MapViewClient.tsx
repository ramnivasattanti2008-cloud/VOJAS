'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Layers, Search, X, CheckCircle2, Clock, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useProjects } from '@/hooks/useProjects';
import { formatCurrency, cn } from '@/lib/utils';
import type { MapProjectItem } from '@/components/map/UnifiedMap';

// Dynamically import UnifiedMap to avoid WebGL SSR errors
const UnifiedMap = dynamic(
  () => import('@/components/map/UnifiedMap').then((m) => m.UnifiedMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex flex-col items-center justify-center bg-slate-900 text-slate-400 rounded-xl border border-slate-800">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Initializing Satellite & GIS Engine…</p>
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
  SANCTIONED: 'info',
  VERIFIED: 'success',
};

export function MapViewClient() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { data, isLoading } = useProjects({
    search: search || undefined,
    state: state || undefined,
    limit: 500,
  });

  const rawProjects = data?.data ?? [];

  // Adapt projects to MapProjectItem
  const mapProjects: MapProjectItem[] = useMemo(() => {
    return rawProjects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      latitude: p.latitude,
      longitude: p.longitude,
      approvedAmount: p.approvedAmount ?? p.sanctionedAmount,
      state: p.state,
      district: p.district,
      sector: p.sector,
      riskLevel: p.riskLevel,
    }));
  }, [rawProjects]);

  const withCoords = useMemo(
    () => mapProjects.filter((p) => p.latitude != null && p.longitude != null),
    [mapProjects]
  );
  const withoutCoords = mapProjects.length - withCoords.length;

  const selectedProject = useMemo(
    () => (selectedProjectId ? mapProjects.find((p) => p.id === selectedProjectId) : null),
    [selectedProjectId, mapProjects]
  );

  const handleSelectProject = useCallback((p: MapProjectItem | null) => {
    setSelectedProjectId(p ? p.id : null);
  }, []);

  // Distinct states for filter
  const stateOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    mapProjects.forEach((p) => {
      if (p.state) counts[p.state] = (counts[p.state] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [mapProjects]);

  return (
    <div className="space-y-6">
      {/* Header & Quick Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>Geospatial Project Map</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold uppercase tracking-wider">
              Live GIS
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Real coordinates from official MPLADS records verified on high-resolution Sentinel-2 and Esri satellite basemaps.
          </p>
        </div>

        {/* Mapped stats pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{withCoords.length} Verified On Map</span>
          </div>
          {withoutCoords > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>{withoutCoords} Coordinate Pending</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search mapped works by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            aria-label="Search projects"
          />
        </div>

        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-vojas-200"
          aria-label="Filter by state"
        >
          <option value="">All States & UTs</option>
          {stateOptions.map(([stateName, count]) => (
            <option key={stateName} value={stateName}>
              {stateName} ({count})
            </option>
          ))}
        </select>

        {(search || state) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setState('');
            }}
            leftIcon={<X className="h-4 w-4" />}
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Main Map + Side Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Real Map View */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-3">
          <UnifiedMap
            projects={mapProjects}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
            height="620px"
            defaultBasemap="hybrid"
          />
          <p className="text-xs text-slate-400">
            💡 Tip: Click cluster circles to drill down. Use the top-left toggle to switch between Hybrid Satellite, Street, and Tactical Dark modes.
          </p>
        </div>

        {/* Sidebar: Selected Project or Project Roster */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {selectedProject ? (
            <Card className="border-vojas-200 shadow-md">
              <div className="px-4 py-3 bg-vojas-50/70 border-b border-vojas-100 flex items-center justify-between">
                <span className="text-xs font-bold text-vojas-800 uppercase tracking-wider">
                  Selected Work
                </span>
                <button
                  onClick={() => setSelectedProjectId(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CardBody className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={STATUS_VARIANT[selectedProject.status] ?? 'neutral'}>
                    {selectedProject.status.replace(/_/g, ' ')}
                  </Badge>
                  {selectedProject.riskLevel && (
                    <span
                      className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        selectedProject.riskLevel === 'HIGH' || selectedProject.riskLevel === 'CRITICAL'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {selectedProject.riskLevel} Risk
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-sm leading-snug">
                  {selectedProject.name}
                </h3>

                <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2">
                  {selectedProject.approvedAmount && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Approved Budget:</span>
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(selectedProject.approvedAmount)}
                      </span>
                    </div>
                  )}
                  {selectedProject.district && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">District:</span>
                      <span className="font-medium text-slate-800">{selectedProject.district}</span>
                    </div>
                  )}
                  {selectedProject.state && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">State:</span>
                      <span className="font-medium text-slate-800">{selectedProject.state}</span>
                    </div>
                  )}
                  {selectedProject.sector && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Sector:</span>
                      <span className="font-medium text-slate-800">
                        {selectedProject.sector.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <a
                    href={`/projects/${selectedProject.id}`}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-vojas-600 hover:bg-vojas-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                  >
                    <span>Full Project Inspection</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={`/projects/${selectedProject.id}/time-machine`}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
                  >
                    <span>🛰️ Satellite Time Machine</span>
                  </a>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-vojas-600" />
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Recent Mapped Works
                  </h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {withCoords.length} total
                </span>
              </div>
              <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
                {withCoords.slice(0, 25).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex flex-col gap-1 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900 line-clamp-1">
                        {p.name}
                      </p>
                      <Badge variant={STATUS_VARIANT[p.status] ?? 'neutral'} className="text-[9px] shrink-0">
                        {p.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{p.district ? `${p.district}, ` : ''}{p.state ?? ''}</span>
                      {p.approvedAmount && (
                        <span className="font-semibold text-slate-700">
                          {formatCurrency(p.approvedAmount)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* State Distribution Card */}
          <Card>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-400" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Distribution by State
              </h2>
            </div>
            <CardBody className="p-3 max-h-48 overflow-y-auto space-y-1.5">
              {stateOptions.slice(0, 8).map(([stateName, count]) => (
                <button
                  key={stateName}
                  onClick={() => setState(stateName === state ? '' : stateName)}
                  className={cn(
                    'w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-colors cursor-pointer',
                    state === stateName ? 'bg-vojas-100 font-semibold text-vojas-800' : 'hover:bg-slate-50 text-slate-700'
                  )}
                >
                  <span>{stateName}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                    {count}
                  </span>
                </button>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
