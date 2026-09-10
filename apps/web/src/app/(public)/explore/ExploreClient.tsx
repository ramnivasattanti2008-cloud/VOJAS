'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, X, Loader2, AlertTriangle, Download } from 'lucide-react';
import { ProjectSector, ProjectStatus } from '@vojas/shared';
import { usePublicProjects } from '@/hooks/usePublicProjects';
import { useQuery } from '@tanstack/react-query';
import { createProjectsApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import { PublicProjectCard } from '@/components/transparency/PublicProjectCard';
import { Button } from '@/components/ui/Button';

const projectsApi = createProjectsApi(apiClient);
const PAGE_SIZE = 20;

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function ExploreClient() {
  // Pre-fill from links elsewhere in the app (Budget Tracker, Analytics,
  // Map) — e.g. /explore?sector=HEALTH&state=Kerala. Read once on mount;
  // the filter UI below is the source of truth after that.
  const initialParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(() => initialParams.get('search') ?? '');
  const [state, setState] = useState(() => initialParams.get('state') ?? '');
  const [sector, setSector] = useState(() => initialParams.get('sector') ?? '');
  const [status, setStatus] = useState(() => initialParams.get('status') ?? '');
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const search = useDebounced(searchInput, 400);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [search, state, sector, status]);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      state: state || undefined,
      sector: (sector || undefined) as ProjectSector | undefined,
      status: (status || undefined) as ProjectStatus | undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [search, state, sector, status, page]
  );

  const { data, isLoading, isFetching, isError, error, refetch } = usePublicProjects(filters);

  // States list for the filter dropdown — real, derived from the database
  // (not a hardcoded/fabricated list of Indian states).
  const { data: stateSummaries } = useQuery({
    queryKey: ['public-states-list'],
    queryFn: () => projectsApi.public.getStateSummaries(),
    staleTime: 5 * 60 * 1000,
  });

  const hasFilters = Boolean(search || state || sector || status);
  const projects = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const exportData = await projectsApi.public.list({
        ...filters,
        page: 1,
        limit: 1000,
      });

      const records = exportData.data;
      if (!records || records.length === 0) {
        alert('No projects found to export.');
        return;
      }

      const headers = [
        'Project ID',
        'Project Name',
        'Sector',
        'Status',
        'State',
        'District',
        'Approved Amount (INR)',
        'Spent Amount (INR)',
        'Utilization (%)',
        'Latitude',
        'Longitude',
        'Has Coordinates',
        'Source Registry',
        'Source Work ID',
      ];

      const escapeCsv = (str: unknown) => {
        if (str == null) return '""';
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
      };

      const rows = records.map((p) => {
        const utilPercent = p.approvedAmount > 0 ? ((p.spentAmount / p.approvedAmount) * 100).toFixed(1) : '0.0';
        return [
          escapeCsv(p.id),
          escapeCsv(p.name),
          escapeCsv(p.sector),
          escapeCsv(p.status),
          escapeCsv(p.state ?? 'Not Recorded'),
          escapeCsv(p.district ?? 'Not Recorded'),
          p.approvedAmount ?? 0,
          p.spentAmount ?? 0,
          utilPercent,
          p.latitude != null ? p.latitude : 'Not Geocoded',
          p.longitude != null ? p.longitude : 'Not Geocoded',
          p.latitude != null ? 'YES' : 'NO',
          escapeCsv(p.source ?? 'MoSPI MPLADS'),
          escapeCsv(p.sourceWorkId ?? 'Not Recorded'),
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stateSuffix = state ? `_${state.replace(/\s+/g, '_')}` : '';
      link.href = url;
      link.setAttribute('download', `vojas_mplad_projects${stateSuffix}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV', err);
      alert('Could not generate export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Explore Projects</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isLoading ? 'Loading…' : `${data?.total ?? 0} MPLAD project${data?.total === 1 ? '' : 's'} found`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting || isLoading || projects.length === 0}
            leftIcon={isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          >
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by project name or description…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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

        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-vojas-200"
          aria-label="Filter by sector"
        >
          <option value="">All sectors</option>
          {Object.values(ProjectSector).map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-vojas-200"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {Object.values(ProjectStatus).map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="md"
            leftIcon={<X className="h-4 w-4" />}
            onClick={() => {
              setSearchInput('');
              setState('');
              setSector('');
              setStatus('');
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-vojas-500 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-slate-400">Loading projects…</p>
          </div>
        </div>
      ) : isError ? (
        <div className="text-center py-16 border border-red-100 bg-red-50 rounded-xl">
          <AlertTriangle className="h-6 w-6 text-red-400 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm font-medium text-red-700">Could not load projects</p>
          <p className="text-xs text-red-500 mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 border border-slate-200 bg-white rounded-xl">
          <p className="text-sm font-medium text-slate-600">No projects found</p>
          <p className="text-xs text-slate-400 mt-1">
            {hasFilters ? 'Try adjusting or clearing your filters.' : 'No projects are available yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${isFetching ? 'opacity-60' : ''}`}>
            {projects.map((p) => (
              <PublicProjectCard key={p.id} project={p} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
