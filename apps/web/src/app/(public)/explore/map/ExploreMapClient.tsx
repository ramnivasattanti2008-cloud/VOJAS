'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createProjectsApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import { usePublicProjects } from '@/hooks/usePublicProjects';
import { Card } from '@/components/ui/Card';

const projectsApi = createProjectsApi(apiClient);

// MapLibre touches `window` at import time, so keep it out of the SSR bundle.
const PublicProjectsMap = dynamic(
  () => import('@/components/transparency/PublicProjectsMap').then((m) => m.PublicProjectsMap),
  { ssr: false, loading: () => <div className="h-[480px] flex items-center justify-center text-sm text-slate-400">Loading map…</div> }
);

const MAP_PAGE_SIZE = 100;

export function ExploreMapClient() {
  // Set when arriving from a project detail page's "View on Map" link
  // (/explore/map?focus=<projectId>) — centers and opens that project's
  // marker once it's loaded.
  const focusProjectId = useSearchParams().get('focus') ?? undefined;

  const [search, setSearch] = useState('');
  const [state, setState] = useState('');

  const { data, isLoading, isError } = usePublicProjects({
    search: search || undefined,
    state: state || undefined,
    limit: MAP_PAGE_SIZE,
  });

  const { data: stateSummaries } = useQuery({
    queryKey: ['public-states-list'],
    queryFn: () => projectsApi.public.getStateSummaries(),
    staleTime: 5 * 60 * 1000,
  });

  const projects = data?.data ?? [];
  const withCoords = projects.filter((p) => p.latitude != null && p.longitude != null);
  const withoutCoords = projects.length - withCoords.length;

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
          <p className="text-sm font-medium text-red-700">Could not load the map</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-24 border border-slate-200 rounded-xl bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-vojas-500" aria-hidden="true" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <PublicProjectsMap projects={projects} className="w-full" focusProjectId={focusProjectId} />
        </Card>
      )}

      {!isLoading && withoutCoords > 0 && (
        <p className="text-xs text-slate-400">
          {withoutCoords} matching project{withoutCoords === 1 ? '' : 's'} {withoutCoords === 1 ? 'has' : 'have'} no
          recorded coordinates and cannot be shown on the map.
        </p>
      )}
    </div>
  );
}
