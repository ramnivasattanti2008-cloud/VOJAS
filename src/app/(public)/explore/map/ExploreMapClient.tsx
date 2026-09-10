'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Search, AlertTriangle, CheckCircle2, Clock, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createProjectsApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import { usePublicProjects } from '@/hooks/usePublicProjects';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const projectsApi = createProjectsApi(apiClient);

// Dynamically import UnifiedMap to avoid SSR WebGL issues
const UnifiedMap = dynamic(
  () => import('@/components/map/UnifiedMap').then((m) => m.UnifiedMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[640px] flex flex-col items-center justify-center bg-slate-900 text-slate-400 rounded-xl">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Loading Interactive Satellite & Project Map…</p>
      </div>
    ),
  }
);

const MAP_PAGE_SIZE = 500;

export function ExploreMapClient() {
  const focusProjectId = useSearchParams().get('focus') ?? undefined;

  const [search, setSearch] = useState('');
  const [state, setState] = useState('');

  const { data, isLoading, isError } = usePublicProjects({
    search: search || undefined,
    state: state || undefined,
    hasCoordinates: true,
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
      {/* Title & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>Public Infrastructure Map</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold uppercase tracking-wider">
              High-Resolution Satellite
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse public MPLADS works with verified geographic coordinates on satellite imagery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{withCoords.length} Mapped Works</span>
          </div>
          {withoutCoords > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{withoutCoords} No Coordinates</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search projects by title or description..."
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
          {(stateSummaries ?? []).map((s) => (
            <option key={s.state} value={s.state}>
              {s.state} ({s.totalProjects})
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
            Clear
          </Button>
        )}
      </div>

      {/* Map Card */}
      {isError ? (
        <div className="text-center py-16 border border-red-100 bg-red-50 rounded-xl">
          <AlertTriangle className="h-6 w-6 text-red-400 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm font-medium text-red-700">Could not load project locations</p>
        </div>
      ) : (
        <Card className="overflow-hidden border-slate-200 shadow-md">
          <UnifiedMap
            projects={projects}
            className="w-full"
            height="640px"
            focusProjectId={focusProjectId}
            publicMode={true}
            defaultBasemap="hybrid"
          />
        </Card>
      )}

      {!isLoading && withoutCoords > 0 && (
        <p className="text-xs text-slate-400">
          Note: {withoutCoords} recorded project{withoutCoords === 1 ? '' : 's'} in this query {withoutCoords === 1 ? 'has' : 'have'} no verified geographic coordinates recorded in official gazettes and cannot be shown on the map.
        </p>
      )}
    </div>
  );
}
