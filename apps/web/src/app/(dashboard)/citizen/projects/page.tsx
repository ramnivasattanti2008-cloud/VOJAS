'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, Search, Filter, Building2, CheckCircle, Clock,
  AlertTriangle, ChevronRight, Eye, Star, Grid, List,
  X, Satellite
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePublicProjects } from '@/hooks/usePublicProjects';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { ProjectSector, ProjectStatus } from '@vojas/shared';

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  COMPLETED: { label: 'Completed', variant: 'success' },
  VERIFIED: { label: 'Verified', variant: 'success' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  APPROVED: { label: 'Approved', variant: 'info' },
  SANCTIONED: { label: 'Sanctioned', variant: 'info' },
  PROPOSED: { label: 'Proposed', variant: 'neutral' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
};

// Project Card View Component
function ProjectCardView({ project, onClick }: { project: any; onClick: () => void }) {
  const statusConfig = STATUS_CONFIG[project.status] ?? { label: project.status, variant: 'neutral' as const };

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-vojas-200 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <Badge variant={statusConfig.variant} className="mb-2">
            {statusConfig.label}
          </Badge>
          <h3 className="font-semibold text-slate-900 line-clamp-2">{project.name}</h3>
        </div>
        <Button variant="ghost" size="sm" className="flex-shrink-0">
          <Eye className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="h-4 w-4 text-slate-400" />
          <span className="truncate">
            {project.district ? `${project.district}, ` : ''}{project.state || ''}
          </span>
        </div>

        {/* Sector */}
        <div className="flex items-center gap-2">
          <Badge variant="neutral" className="text-xs">
            {project.sectorLabel || project.sector}
          </Badge>
        </div>

        {/* Progress */}
        {project.progressPercent !== undefined && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Progress</span>
              <span className="font-medium">{project.progressPercent}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-vojas-500 rounded-full transition-all"
                style={{ width: `${project.progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Financial */}
        {project.approvedAmount && (
          <div className="pt-3 border-t border-slate-100">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Sanctioned</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(project.approvedAmount)}
              </span>
            </div>
            {project.spentAmount && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">Spent</span>
                <span className="font-medium text-slate-700">
                  {formatCurrency(project.spentAmount)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Data Quality */}
        {project.dataQuality && (
          <div className="pt-3 border-t border-slate-100">
            <Badge
              variant={
                project.dataQuality === 'HIGH' ? 'success' :
                project.dataQuality === 'MEDIUM' ? 'warning' : 'neutral'
              }
              className="text-xs"
            >
              {project.dataQuality} Data Quality
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

// Project List View Component
function ProjectListView({ project, onClick }: { project: any; onClick: () => void }) {
  const statusConfig = STATUS_CONFIG[project.status] ?? { label: project.status, variant: 'neutral' as const };

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm hover:border-vojas-200 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Building2 className="h-6 w-6 text-slate-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-medium text-slate-900 truncate">{project.name}</h3>
            <Badge variant={statusConfig.variant} className="text-xs">
              {statusConfig.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {project.district ? `${project.district}, ` : ''}{project.state || ''}
            </span>
            <Badge variant="neutral" className="text-xs">
              {project.sectorLabel || project.sector}
            </Badge>
          </div>
        </div>

        <div className="hidden md:block text-right flex-shrink-0">
          {project.approvedAmount && (
            <p className="text-sm font-semibold text-slate-900">
              {formatCurrency(project.approvedAmount)}
            </p>
          )}
          {project.progressPercent !== undefined && (
            <p className="text-xs text-slate-500 mt-1">
              {project.progressPercent}% complete
            </p>
          )}
        </div>

        <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
      </div>
    </div>
  );
}

// Loading Skeleton
function ProjectListSkeleton({ view }: { view: 'grid' | 'list' }) {
  if (view === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}>
            <CardBody className="space-y-3">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i}>
          <CardBody className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-8 w-24" />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export default function CitizenProjectsPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [sectorFilter, setSectorFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const filters = useMemo(() => ({
    state: stateFilter || undefined,
    sector: (sectorFilter || undefined) as ProjectSector | undefined,
    status: (statusFilter || undefined) as ProjectStatus | undefined,
    search: search || undefined,
    limit: 50,
  }), [stateFilter, sectorFilter, statusFilter, search]);

  const { data, isLoading } = usePublicProjects(filters);
  const projects = data?.data ?? [];
  const total = data?.total ?? 0;

  const hasFilters = !!(stateFilter || sectorFilter || statusFilter);

  // Extract unique states and sectors for filter dropdowns
  const states = useMemo(() => {
    const uniqueStates = [...new Set(projects.map((p: any) => p.state).filter(Boolean))];
    return uniqueStates.sort();
  }, [projects]);

  const sectors = useMemo(() => {
    const uniqueSectors = [...new Set(projects.map((p: any) => p.sectorLabel || p.sector).filter(Boolean))];
    return uniqueSectors.sort();
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nearby Projects</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isLoading ? 'Loading...' : `${total} public projects available`}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'grid' ? 'bg-vojas-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              )}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 transition-colors border-l border-slate-200',
                viewMode === 'list' ? 'bg-vojas-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              )}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <CardBody className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search projects by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            aria-label="Search projects"
          />
        </div>

        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          onClick={() => setShowFilters((s) => !s)}
          leftIcon={<Filter className="h-4 w-4" />}
        >
          Filters
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStateFilter('');
              setSectorFilter('');
              setStatusFilter('');
            }}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
      </CardBody>

      {/* Filter Panel */}
      {showFilters && (
        <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">State</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500 bg-white"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
            >
              <option value="">All States</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Sector</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500 bg-white"
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
            >
              <option value="">All Sectors</option>
              {sectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Status</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PROPOSED">Proposed</option>
              <option value="APPROVED">Approved</option>
              <option value="SANCTIONED">Sanctioned</option>
            </select>
          </div>
        </CardBody>
      )}

      {/* Stats Summary */}
      {!isLoading && projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{projects.length}</p>
                <p className="text-xs text-slate-500">Projects</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {projects.filter((p: any) => ['COMPLETED', 'VERIFIED'].includes(p.status)).length}
                </p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {projects.filter((p: any) => p.status === 'IN_PROGRESS').length}
                </p>
                <p className="text-xs text-slate-500">In Progress</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Satellite className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {projects.filter((p: any) => p.progressPercent > 0 && p.progressPercent < 100).length}
                </p>
                <p className="text-xs text-slate-500">Ongoing</p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Projects List */}
      {isLoading ? (
        <ProjectListSkeleton view={viewMode} />
      ) : projects.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {hasFilters || search ? 'No projects match your filters' : 'No projects available'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {hasFilters || search
                ? 'Try adjusting your search or filters'
                : 'Check back later for public project data'}
            </p>
            {(hasFilters || search) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setStateFilter('');
                  setSectorFilter('');
                  setStatusFilter('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardBody>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: any) => (
            <ProjectCardView
              key={project.id}
              project={project}
              onClick={() => router.push(`/projects/${project.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project: any) => (
            <ProjectListView
              key={project.id}
              project={project}
              onClick={() => router.push(`/projects/${project.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
