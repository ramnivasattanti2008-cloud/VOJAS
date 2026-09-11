'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createProjectsApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import { usePublicProjects } from '@/hooks/usePublicProjects';
import { Card } from '@/components/ui/Card';
import type { MapProjectItem } from '@/components/map/InteractiveGisMap';

const projectsApi = createProjectsApi(apiClient);

// MapLibre touches `window` at import time, so keep it out of the SSR bundle.
const InteractiveGisMap = dynamic(
  () => import('@/components/map/InteractiveGisMap').then((m) => m.InteractiveGisMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[620px] flex items-center justify-center text-sm text-slate-400 bg-slate-50 rounded-xl">
        <Loader2 className="h-5 w-5 animate-spin mr-2 text-blue-600" /> Loading GIS Engine…
      </div>
    ),
  }
);

const MAP_PAGE_SIZE = 100;

export function ExploreMapClient() {
  const focusProjectId = useSearchParams().get('focus') ?? undefined;

  const [search, setSearch] = useState('');
  const [state, setState] = useState('');

  const { data, isLoading, isError, refetch } = usePublicProjects({
    search: search || undefined,
    state: state || undefined,
    limit: MAP_PAGE_SIZE,
    hasCoordinates: true,
  });

  const { data: stateSummaries } = useQuery({
    queryKey: ['public-states-list'],
    queryFn: () => projectsApi.public.getStateSummaries(),
    staleTime: 5 * 60 * 1000,
  });

  const projects = data?.data ?? [];
  const withCoords = projects.filter((p) => p.latitude != null && p.longitude != null);

  const mapProjects: MapProjectItem[] = withCoords.map((p) => ({
    id: p.id,
    title: p.name,
    latitude: p.latitude as number,
    longitude: p.longitude as number,
    district: p.district,
    state: p.state,
    status: p.status,
    sanctionedAmount: p.approvedAmount,
    spentAmount: p.spentAmount,
    sector: p.sector,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Project Map</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isLoading
            ? 'Loading…'
            : `Showing ${withCoords.length} mapped project${withCoords.length === 1 ? '' : 's'}${
                data && data.total > MAP_PAGE_SIZE ? ` of ${data.total} matching` : ''
              }`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search projects…"
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
          <option value="">All states</option>
          {(stateSummaries ?? []).map((s) => (
            <option key={s.state} value={s.state}>
              {s.state} ({s.totalProjects})
            </option>
          ))}
        </select>
      </div>

      {isError ? (
        <div className="text-center py-16 border border-red-100 bg-red-50 rounded-xl">
          <AlertTriangle className="h-6 w-6 text-red-400 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm font-medium text-red-700">Could not load project locations</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-24 border border-slate-200 rounded-xl bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" aria-hidden="true" />
          <span className="text-sm text-slate-500 font-medium">Loading mapped projects…</span>
        </div>
      ) : (
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <InteractiveGisMap
            projects={mapProjects}
            initialSelectedId={focusProjectId}
            heightClass="h-[620px]"
          />
        </Card>
      )}

      {!isLoading && (
        <p className="text-xs text-slate-400">
          Showing official projects with recorded geospatial coordinates. VOJAS strictly never fabricates coordinates where none are recorded in official records.
        </p>
      )}
    </div>
  );
}
