'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Star, Building2, Bell, Clock, MapPin, CheckCircle,
  AlertCircle, ChevronRight, Search, Trash2, Filter, X,
  Eye, TrendingUp
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  COMPLETED: { label: 'Completed', variant: 'success' },
  VERIFIED: { label: 'Verified', variant: 'success' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  APPROVED: { label: 'Approved', variant: 'info' },
  SANCTIONED: { label: 'Sanctioned', variant: 'info' },
  PROPOSED: { label: 'Proposed', variant: 'neutral' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
};

// Mock watchlist data (in real app, this would come from API/user preferences)
interface WatchlistProject {
  id: string;
  name: string;
  sector: string;
  sectorLabel: string;
  status: string;
  state: string;
  district: string;
  approvedAmount: number;
  spentAmount?: number;
  progressPercent?: number;
  followedAt: string;
  lastUpdated: string;
  updatesCount: number;
  anomalyCount: number;
}

const MOCK_WATCHLIST: WatchlistProject[] = [
  {
    id: '1',
    name: 'Construction of Primary Health Centre',
    sector: 'HEALTH',
    sectorLabel: 'Health',
    status: 'IN_PROGRESS',
    state: 'Karnataka',
    district: 'Bangalore Rural',
    approvedAmount: 2500000,
    spentAmount: 1200000,
    progressPercent: 48,
    followedAt: '2024-01-15',
    lastUpdated: '2024-03-10',
    updatesCount: 5,
    anomalyCount: 1,
  },
  {
    id: '2',
    name: 'Rural Road Connectivity Project',
    sector: 'TRANSPORT',
    sectorLabel: 'Transport',
    status: 'IN_PROGRESS',
    state: 'Maharashtra',
    district: 'Pune',
    approvedAmount: 5000000,
    spentAmount: 4800000,
    progressPercent: 96,
    followedAt: '2024-02-01',
    lastUpdated: '2024-03-12',
    updatesCount: 12,
    anomalyCount: 0,
  },
  {
    id: '3',
    name: 'Drinking Water Supply Scheme',
    sector: 'WATER_SANITATION',
    sectorLabel: 'Water & Sanitation',
    status: 'COMPLETED',
    state: 'Tamil Nadu',
    district: 'Coimbatore',
    approvedAmount: 3500000,
    spentAmount: 3400000,
    progressPercent: 100,
    followedAt: '2023-11-20',
    lastUpdated: '2024-02-28',
    updatesCount: 8,
    anomalyCount: 0,
  },
];

// Watchlist Card Component
function WatchlistCard({
  project,
  onView,
  onRemove,
}: {
  project: WatchlistProject;
  onView: () => void;
  onRemove: () => void;
}) {
  const statusConfig = STATUS_CONFIG[project.status] ?? { label: project.status, variant: 'neutral' as const };

  return (
    <Card className="hover:shadow-md hover:border-vojas-200 transition-all">
      <CardBody>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant={statusConfig.variant}>
                {statusConfig.label}
              </Badge>
              <Badge variant="neutral" className="text-xs">
                {project.sectorLabel}
              </Badge>
              {project.anomalyCount > 0 && (
                <Badge variant="warning" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {project.anomalyCount} Anomalies
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-slate-900 text-lg">{project.name}</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-slate-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>{project.district}, {project.state}</span>
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
                  className={cn(
                    'h-full rounded-full transition-all',
                    project.status === 'COMPLETED' || project.status === 'VERIFIED'
                      ? 'bg-green-500'
                      : 'bg-vojas-500'
                  )}
                  style={{ width: `${project.progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Financial */}
          <div className="pt-3 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Sanctioned</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatCurrency(project.approvedAmount)}
                </p>
              </div>
              {project.spentAmount && (
                <div>
                  <p className="text-xs text-slate-500">Spent</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatCurrency(project.spentAmount)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Meta Info */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Bell className="h-3 w-3" />
                {project.updatesCount} updates
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(project.lastUpdated)}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={onView}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              View
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// Empty State Component
function EmptyWatchlist() {
  const router = useRouter();

  return (
    <Card>
      <CardBody className="py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <Star className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          Your watchlist is empty
        </h3>
        <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
          Follow projects that matter to you to receive updates, track progress, and stay informed about anomalies.
        </p>
        <Button
          variant="primary"
          leftIcon={<Building2 className="h-4 w-4" />}
          onClick={() => router.push('/citizen/projects')}
        >
          Browse Projects
        </Button>
      </CardBody>
    </Card>
  );
}

// Loading Skeleton
function WatchlistSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-2 w-full rounded-full" />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export default function CitizenWatchlistPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [watchlist, setWatchlist] = useState<WatchlistProject[]>(MOCK_WATCHLIST);
  const [showFilters, setShowFilters] = useState(false);

  // Filter watchlist
  const filteredWatchlist = useMemo(() => {
    return watchlist.filter(project => {
      const matchesSearch = search
        ? project.name.toLowerCase().includes(search.toLowerCase()) ||
          project.district.toLowerCase().includes(search.toLowerCase()) ||
          project.state.toLowerCase().includes(search.toLowerCase())
        : true;

      const matchesStatus = statusFilter
        ? project.status === statusFilter
        : true;

      return matchesSearch && matchesStatus;
    });
  }, [watchlist, search, statusFilter]);

  const hasFilters = !!(statusFilter || search);

  // Remove from watchlist
  const handleRemove = (projectId: string) => {
    setWatchlist(prev => prev.filter(p => p.id !== projectId));
  };

  // Stats
  const stats = useMemo(() => {
    return {
      total: watchlist.length,
      inProgress: watchlist.filter(p => p.status === 'IN_PROGRESS').length,
      completed: watchlist.filter(p => ['COMPLETED', 'VERIFIED'].includes(p.status)).length,
      withAnomalies: watchlist.filter(p => p.anomalyCount > 0).length,
    };
  }, [watchlist]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Watchlist</h1>
          <p className="text-slate-500 text-sm mt-1">
            {watchlist.length === 0
              ? 'No projects followed yet'
              : `Following ${watchlist.length} project${watchlist.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<Building2 className="h-4 w-4" />}
          onClick={() => router.push('/citizen/projects')}
        >
          Browse Projects
        </Button>
      </div>

      {/* Stats */}
      {watchlist.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-vojas-50 flex items-center justify-center">
                <Star className="h-5 w-5 text-vojas-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Following</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{stats.inProgress}</p>
                <p className="text-xs text-slate-500">In Progress</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{stats.completed}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{stats.withAnomalies}</p>
                <p className="text-xs text-slate-500">With Alerts</p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <CardBody className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search your watchlist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            aria-label="Search watchlist"
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
              setStatusFilter('');
              setSearch('');
            }}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
      </CardBody>

      {/* Filter Panel */}
      {showFilters && (
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Status</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="PROPOSED">Proposed</option>
            </select>
          </div>
        </CardBody>
      )}

      {/* Watchlist */}
      {watchlist.length === 0 ? (
        <EmptyWatchlist />
      ) : filteredWatchlist.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No projects match your search
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Try adjusting your search or filters
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
            >
              Clear Filters
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredWatchlist.map(project => (
            <WatchlistCard
              key={project.id}
              project={project}
              onView={() => router.push(`/projects/${project.id}`)}
              onRemove={() => handleRemove(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
