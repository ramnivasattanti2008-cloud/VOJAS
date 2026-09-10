'use client';

/**
 * MP Project Portfolio — M14
 * Sortable/filterable project list for constituency.
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Filter, X, Grid3X3, List, Map, ChevronUp, ChevronDown,
  Building2, CheckCircle2, Clock, AlertTriangle, ArrowUpDown
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ExportButton } from '@/components/ui/ExportButton';
import { useMPProjects, type MPProjectFilters } from '@/hooks/useMP';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, cn } from '@/lib/utils';
import { ProjectSector, ProjectStatus } from '@vojas/shared';

// Sector labels
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

// Status variants
const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  [ProjectStatus.COMPLETED]: 'success',
  [ProjectStatus.VERIFIED]: 'success',
  [ProjectStatus.IN_PROGRESS]: 'info',
  [ProjectStatus.APPROVED]: 'info',
  [ProjectStatus.SANCTIONED]: 'info',
  [ProjectStatus.PROPOSED]: 'neutral',
  [ProjectStatus.CANCELLED]: 'danger',
  [ProjectStatus.UNSANCTIONED]: 'danger',
};

type ViewMode = 'table' | 'grid' | 'map';
type SortField = 'name' | 'status' | 'sector' | 'amount' | 'progress' | 'district';
type SortDirection = 'asc' | 'desc';

export default function MPProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const mpId = (user as any)?.mpId ?? 'current-mp';

  // Filters
  const [filters, setFilters] = useState<MPProjectFilters>({});
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Fetch projects
  const { data, isLoading, error } = useMPProjects(mpId, {
    ...filters,
    search: search || undefined,
  });

  const projects = data?.data ?? [];

  // Sorting
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a: any, b: any) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = (a.name ?? '').localeCompare(b.name ?? '');
          break;
        case 'status':
          comparison = (a.status ?? '').localeCompare(b.status ?? '');
          break;
        case 'sector':
          comparison = (a.sector ?? '').localeCompare(b.sector ?? '');
          break;
        case 'amount':
          comparison = (a.sanctionedAmount ?? 0) - (b.sanctionedAmount ?? 0);
          break;
        case 'progress':
          comparison = (a.progressPercent ?? 0) - (b.progressPercent ?? 0);
          break;
        case 'district':
          comparison = (a.district ?? '').localeCompare(b.district ?? '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [projects, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setFilters({});
    setSearch('');
  };

  const hasActiveFilters = !!(filters.status || filters.sector || filters.district || search);

  // Stats
  const stats = useMemo(() => ({
    total: projects.length,
    completed: projects.filter((p: any) => p.status === ProjectStatus.COMPLETED).length,
    inProgress: projects.filter((p: any) => [ProjectStatus.IN_PROGRESS, ProjectStatus.APPROVED, ProjectStatus.SANCTIONED].includes(p.status)).length,
    delayed: projects.filter((p: any) => p.status === ProjectStatus.IN_PROGRESS && (p.progressPercent ?? 0) < 50).length,
  }), [projects]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Building2 className="h-4 w-4" />
            <span>My Constituency</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Project Portfolio</h1>
          <p className="text-sm text-slate-500 mt-1">
            {data?.total != null ? `${data.total} projects in your constituency` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            csvEndpoint={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/export/projects`}
            csvParams={{ mpId, status: filters?.status, sector: filters?.sector, district: filters?.district, search: filters?.search, page: filters?.page?.toString(), limit: filters?.limit?.toString() }}
            filenameHint="mp-projects"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-lg font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Completed</p>
                <p className="text-lg font-bold text-emerald-600">{stats.completed}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">In Progress</p>
                <p className="text-lg font-bold text-blue-600">{stats.inProgress}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Attention</p>
                <p className="text-lg font-bold text-red-600">{stats.delayed}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500 focus:border-transparent"
          />
        </div>

        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          leftIcon={<Filter className="h-4 w-4" />}
          onClick={() => setShowFilters((s) => !s)}
        >
          Filters
          {hasActiveFilters && (
            <span className="ml-1 bg-white/20 rounded-full px-1.5 py-0.5 text-xs">!</span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} leftIcon={<X className="h-3 w-3" />}>
            Clear
          </Button>
        )}

        {/* View Mode Toggle */}
        <div className="flex border border-slate-200 rounded-lg overflow-hidden ml-auto">
          {([
            { mode: 'table' as ViewMode, icon: List, label: 'Table' },
            { mode: 'grid' as ViewMode, icon: Grid3X3, label: 'Cards' },
            { mode: 'map' as ViewMode, icon: Map, label: 'Map' },
          ] as const).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'px-3 py-2 text-sm flex items-center gap-1.5 transition-colors',
                viewMode === mode ? 'bg-vojas-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white rounded-xl border border-slate-200">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Status</label>
            <select
              value={filters.status ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value as ProjectStatus) || undefined }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
            >
              <option value="">All Status</option>
              {Object.values(ProjectStatus).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Sector Filter */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Sector</label>
            <select
              value={filters.sector ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, sector: (e.target.value as ProjectSector) || undefined }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
            >
              <option value="">All Sectors</option>
              {Object.values(ProjectSector).map((s) => (
                <option key={s} value={s}>{SECTOR_LABELS[s] ?? s}</option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">District</label>
            <input
              type="text"
              placeholder="Filter by district"
              value={filters.district ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, district: e.target.value || undefined }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
            />
          </div>
        </CardBody>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load projects'}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {[
                    { field: 'name' as SortField, label: 'Project', className: 'text-left' },
                    { field: 'status' as SortField, label: 'Status', className: 'text-left' },
                    { field: 'sector' as SortField, label: 'Sector', className: 'text-left' },
                    { field: 'district' as SortField, label: 'Location', className: 'text-left' },
                    { field: 'amount' as SortField, label: 'Amount', className: 'text-right' },
                    { field: 'progress' as SortField, label: 'Progress', className: 'text-right' },
                  ].map(({ field, label, className }) => (
                    <th
                      key={field}
                      onClick={() => handleSort(field)}
                      className={cn(
                        'px-4 py-3 text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100',
                        className
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        {sortField === field ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-slate-100 rounded animate-pulse w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sortedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      No projects found
                    </td>
                  </tr>
                ) : (
                  sortedProjects.map((project: any) => (
                    <tr
                      key={project.id}
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900 max-w-[200px] truncate">
                          {project.name}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANTS[project.status] ?? 'neutral'}>
                          {project.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600">
                          {SECTOR_LABELS[project.sector as ProjectSector] ?? project.sector}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600">
                          {project.district ? `${project.district}, ` : ''}{project.state ?? ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-slate-900">
                          {formatCurrency(project.sanctionedAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-vojas-500 rounded-full"
                              style={{ width: `${project.progressPercent ?? 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-10 text-right">
                            {project.progressPercent ?? 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardBody className="p-4">
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-3 animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded w-1/2 mb-4 animate-pulse" />
                  <div className="h-2 bg-slate-100 rounded w-full animate-pulse" />
                </CardBody>
              </Card>
            ))
          ) : sortedProjects.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400">
              No projects found
            </div>
          ) : (
            sortedProjects.map((project: any) => (
              <Card
                key={project.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardBody className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-slate-900 text-sm line-clamp-2">
                      {project.name}
                    </h3>
                    <Badge variant={STATUS_VARIANTS[project.status] ?? 'neutral'} className="shrink-0">
                      {project.status}
                    </Badge>
                  </div>

                  <Badge variant="neutral" className="mb-3 text-xs">
                    {SECTOR_LABELS[project.sector as keyof typeof SECTOR_LABELS] ?? project.sector}
                  </Badge>

                  <p className="text-xs text-slate-500 mb-3">
                    {project.district ? `${project.district}, ` : ''}{project.state ?? ''}
                  </p>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Progress</span>
                      <span className="font-medium">{project.progressPercent ?? 0}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-vojas-500 rounded-full"
                        style={{ width: `${project.progressPercent ?? 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Sanctioned</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatCurrency(project.sanctionedAmount)}
                    </span>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Map View Placeholder */}
      {viewMode === 'map' && (
        <Card>
          <CardBody className="py-12 text-center">
            <Map className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 mb-4">Map view available on the dedicated Map page</p>
            <Button onClick={() => router.push('/mp/map')}>Go to Map</Button>
          </CardBody>
        </Card>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={data.page === 1}
            onClick={() => {/* TODO: Implement pagination */}}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={data.page === data.totalPages}
            onClick={() => {/* TODO: Implement pagination */}}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
