'use client';

import { useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Filter, X } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { CardBody } from '@/components/ui/Card';
import { useProjects } from '@/hooks/useProjects';
import { formatCurrency } from '@/lib/utils';
import { ProjectStatus } from '@vojas/shared';
import type { Project } from '@vojas/api-client';
import type { ProjectSector } from '@vojas/shared';
import type { Column } from '@/components/ui/DataTable';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  [ProjectStatus.COMPLETED]: 'success',
  [ProjectStatus.IN_PROGRESS]: 'info',
  [ProjectStatus.CANCELLED]: 'danger',
  [ProjectStatus.VERIFIED]: 'success',
  [ProjectStatus.APPROVED]: 'info',
  [ProjectStatus.PROPOSED]: 'neutral',
  [ProjectStatus.SANCTIONED]: 'neutral',
  [ProjectStatus.UNSANCTIONED]: 'danger',
};

const SECTOR_LABELS: Partial<Record<ProjectSector, string>> = {
  PUBLIC_INFRASTRUCTURE: 'Public Infra',
  WATER_SANITATION: 'Water & Sanitation',
  EDUCATION: 'Education',
  HEALTH: 'Health',
  AGRICULTURE: 'Agriculture',
  ENVIRONMENT: 'Environment',
  TRANSPORT: 'Transport',
  ENERGY: 'Energy',
  HOUSING: 'Housing',
  RURAL_DEVELOPMENT: 'Rural Dev',
  SOCIAL_WELFARE: 'Social Welfare',
  PUBLIC_ADMIN: 'Public Admin',
  FINANCE_PROCUREMENT: 'Finance',
  JUSTICE: 'Justice',
  LEGISLATIVE: 'Legislative',
  PUBLIC_SAFETY: 'Public Safety',
};

export default function ProjectsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<{
    state?: string;
    district?: string;
    sector?: ProjectSector;
    status?: ProjectStatus;
  }>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useProjects({
    search: search || undefined,
    state: filters.state,
    district: filters.district,
    sector: filters.sector,
    status: filters.status,
    limit: 50,
  });

  const projects = data?.data ?? [];

  const columns: Column<Project>[] = [
    {
      key: 'name',
      header: 'Project',
      className: 'min-w-[200px]',
      render: (p) => (
        <div>
          <p className="font-medium text-slate-900">{p.name}</p>
          <p className="text-xs text-slate-500">
            {SECTOR_LABELS[p.sector] ?? p.sector}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <Badge variant={statusVariant[p.status] ?? 'neutral'}>{p.status}</Badge>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (p) => (
        <span className="text-slate-600 text-xs">
          {p.district ? `${p.district}, ` : ''}{p.state ?? '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Sanctioned',
      render: (p) => (
        <span className="text-slate-900 font-medium text-xs">
          {formatCurrency(p.sanctionedAmount)}
        </span>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (p) =>
        p.progressPercent != null ? (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-vojas-500 rounded-full transition-all"
                style={{ width: `${p.progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{p.progressPercent}%</span>
          </div>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
  ];

  const hasFilters = !!(filters.state || filters.district || filters.sector || filters.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {data?.total != null ? `${data.total} projects found` : 'Loading...'}
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>New Project</Button>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search projects..."
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            aria-label="Search projects"
          />
        </div>

        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          size="md"
          leftIcon={<Filter className="h-4 w-4" />}
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
        >
          Filters
          {hasFilters && (
            <span className="ml-1 bg-vojas-700 text-white rounded-full px-1.5 py-0.5 text-xs">
              !
            </span>
          )}
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({})}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white rounded-xl border border-slate-200">
          <Input
            label="State"
            value={filters.state ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value || undefined }))}
            placeholder="e.g. Karnataka"
          />
          <Input
            label="District"
            value={filters.district ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, district: e.target.value || undefined }))}
            placeholder="e.g. Bangalore"
          />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Status</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
              value={filters.status ?? ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: (e.target.value as ProjectStatus) || undefined,
                }))
              }
            >
              <option value="">All statuses</option>
              {Object.values(ProjectStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </CardBody>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load projects'}
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        rows={projects}
        isLoading={isLoading}
        onRowClick={(p) => router.push(`/projects/${p.id}`)}
        emptyMessage="No projects found. Try adjusting your search or filters."
      />
    </div>
  );
}
