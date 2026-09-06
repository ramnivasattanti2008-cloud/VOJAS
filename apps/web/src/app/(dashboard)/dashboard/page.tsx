'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight, ChevronLeft, Search, Filter,
  Map, Table2, Calendar, X,
  Building2, TrendingUp, AlertCircle, CheckCircle2, Clock,
  DollarSign, Target, Loader2, Home
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useProjects } from '@/hooks/useProjects';
import { formatCurrency, cn } from '@/lib/utils';
import { ProjectStatus, ProjectSector } from '@vojas/shared';
import { INDIAN_STATES, STATE_PATHS, STATE_CENTROIDS, LABELED_STATES } from '@/data/indiaStates';

// Sector display labels
const SECTOR_LABELS: Record<string, string> = {
  [ProjectSector.PUBLIC_INFRASTRUCTURE]: 'Public Infrastructure',
  [ProjectSector.WATER_SANITATION]: 'Water & Sanitation',
  [ProjectSector.EDUCATION]: 'Education',
  [ProjectSector.HEALTH]: 'Health',
  [ProjectSector.AGRICULTURE]: 'Agriculture',
  [ProjectSector.ENVIRONMENT]: 'Environment',
  [ProjectSector.TRANSPORT]: 'Transport',
  [ProjectSector.ENERGY]: 'Energy',
  [ProjectSector.HOUSING]: 'Housing',
  [ProjectSector.RURAL_DEVELOPMENT]: 'Rural Development',
  [ProjectSector.SOCIAL_WELFARE]: 'Social Welfare',
  [ProjectSector.PUBLIC_ADMIN]: 'Public Admin',
  [ProjectSector.FINANCE_PROCUREMENT]: 'Finance',
  [ProjectSector.JUSTICE]: 'Justice',
  [ProjectSector.LEGISLATIVE]: 'Legislative',
  [ProjectSector.PUBLIC_SAFETY]: 'Public Safety',
};

// Status display config
const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  [ProjectStatus.COMPLETED]: { label: 'Completed', variant: 'success' },
  [ProjectStatus.IN_PROGRESS]: { label: 'In Progress', variant: 'info' },
  [ProjectStatus.PROPOSED]: { label: 'Proposed', variant: 'neutral' },
  [ProjectStatus.APPROVED]: { label: 'Approved', variant: 'info' },
  [ProjectStatus.SANCTIONED]: { label: 'Sanctioned', variant: 'info' },
  [ProjectStatus.VERIFIED]: { label: 'Verified', variant: 'success' },
  [ProjectStatus.CANCELLED]: { label: 'Cancelled', variant: 'danger' },
  [ProjectStatus.UNSANCTIONED]: { label: 'Unsanctioned', variant: 'danger' },
};

type DrillDownLevel = 'india' | 'state' | 'district';
type ViewMode = 'map' | 'table' | 'timeline';

interface StateData {
  state: string;
  projectCount: number;
  completedCount: number;
  inProgressCount: number;
  delayedCount: number;
  totalSanctioned: number;
  totalSpent: number;
  districts: Record<string, {
    district: string;
    projectCount: number;
    completedCount: number;
    inProgressCount: number;
    delayedCount: number;
  }>;
}

interface TooltipData {
  state: string;
  x: number;
  y: number;
  data: StateData;
}

// Helper to get color based on project density
function getStateColor(projectCount: number, maxCount: number, isSelected: boolean, isHovered: boolean): string {
  if (isSelected) return 'fill-vojas-600';
  if (isHovered) return 'fill-vojas-400';
  if (projectCount === 0) return 'fill-slate-100';

  const intensity = Math.min(projectCount / Math.max(maxCount, 1), 1);
  if (intensity < 0.2) return 'fill-blue-100';
  if (intensity < 0.4) return 'fill-blue-200';
  if (intensity < 0.6) return 'fill-blue-300';
  if (intensity < 0.8) return 'fill-blue-400';
  return 'fill-blue-500';
}

// India Map SVG Component
function IndiaMap({
  stateData,
  selectedState,
  onStateClick,
  onStateHover,
  onStateLeave,
  hoveredState
}: {
  stateData: Record<string, StateData>;
  selectedState: string | null;
  onStateClick: (state: string) => void;
  onStateHover: (state: string | null, event?: React.MouseEvent) => void;
  onStateLeave: () => void;
  hoveredState: string | null;
}) {
  const maxCount = useMemo(() => {
    return Math.max(...Object.values(stateData).map(s => s.projectCount), 1);
  }, [stateData]);

  return (
    <svg
      viewBox="0 0 1000 850"
      className="w-full h-full"
      style={{ maxHeight: 'calc(100vh - 280px)' }}
    >
      {/* Ocean background */}
      <rect x="0" y="0" width="1000" height="850" fill="#f0f9ff" />

      {/* State paths */}
      {INDIAN_STATES.map((state) => {
        const path = STATE_PATHS[state.id];
        const data = stateData[state.id];
        const isSelected = selectedState === state.id;
        const isHovered = hoveredState === state.id;

        return (
          <g key={state.id}>
            <path
              d={path}
              className={cn(
                'transition-all duration-200 cursor-pointer',
                getStateColor(data?.projectCount ?? 0, maxCount, isSelected, isHovered)
              )}
              stroke={isSelected ? '#1e40af' : isHovered ? '#3b82f6' : '#cbd5e1'}
              strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
              onClick={() => onStateClick(state.id)}
              onMouseEnter={(e) => onStateHover(state.id, e)}
              onMouseLeave={onStateLeave}
            />
            {/* State label for larger states */}
            {LABELED_STATES.has(state.id) && (
              <text
                x={STATE_CENTROIDS[state.id]?.x ?? 0}
                y={STATE_CENTROIDS[state.id]?.y ?? 0}
                className="pointer-events-none select-none"
                textAnchor="middle"
                fontSize="12"
                fontWeight="500"
                fill={data?.projectCount ? '#1e3a8a' : '#94a3b8'}
              >
                {state.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Stats Overlay Component
function StatsOverlay({
  totalProjects,
  completed,
  inProgress,
  delayed,
  totalSanctioned,
  totalSpent,
  isLoading
}: {
  totalProjects: number;
  completed: number;
  inProgress: number;
  delayed: number;
  totalSanctioned: number;
  totalSpent: number;
  isLoading: boolean;
}) {
  const stats = [
    { label: 'Total Projects', value: totalProjects.toLocaleString('en-IN'), icon: Building2, color: 'text-blue-600' },
    { label: 'Completed', value: completed.toLocaleString('en-IN'), icon: CheckCircle2, color: 'text-green-600' },
    { label: 'In Progress', value: inProgress.toLocaleString('en-IN'), icon: Clock, color: 'text-amber-600' },
    { label: 'Delayed', value: delayed.toLocaleString('en-IN'), icon: AlertCircle, color: 'text-red-600' },
    { label: 'Total Sanctioned', value: formatCurrency(totalSanctioned), icon: DollarSign, color: 'text-vojas-600' },
    { label: 'Total Spent', value: formatCurrency(totalSpent), icon: TrendingUp, color: 'text-purple-600' },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 lg:gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 lg:px-4 lg:py-3 border border-slate-200 shadow-sm">
            <div className="h-4 w-16 bg-slate-200 rounded animate-pulse mb-1" />
            <div className="h-6 w-12 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 lg:gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 lg:px-4 lg:py-3 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <stat.icon className={cn('h-3 w-3 lg:h-4 lg:w-4', stat.color)} />
            <span className="text-[10px] lg:text-xs text-slate-500 font-medium">{stat.label}</span>
          </div>
          <p className="text-sm lg:text-lg font-bold text-slate-900 truncate">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

// State Tooltip Component
function StateTooltip({ data, x, y }: TooltipData) {
  return (
    <div
      className="fixed z-50 bg-slate-900 text-white rounded-lg shadow-xl px-4 py-3 pointer-events-none"
      style={{ left: x + 12, top: y + 12 }}
    >
      <p className="font-semibold text-sm mb-2">{data.state}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-slate-400">Projects:</span>
        <span className="font-medium">{data.projectCount.toLocaleString('en-IN')}</span>
        <span className="text-slate-400">Completed:</span>
        <span className="font-medium text-green-400">{data.completedCount}</span>
        <span className="text-slate-400">In Progress:</span>
        <span className="font-medium text-blue-400">{data.inProgressCount}</span>
        <span className="text-slate-400">Sanctioned:</span>
        <span className="font-medium">{formatCurrency(data.totalSanctioned)}</span>
      </div>
    </div>
  );
}

// Filter Bar Component
function FilterBar({
  sectorFilter,
  setSectorFilter,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
}: {
  sectorFilter: string;
  setSectorFilter: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
}) {
  const sectors = Object.entries(SECTOR_LABELS);
  const statuses = Object.entries(STATUS_CONFIG);

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vojas-500 focus:border-transparent"
        />
      </div>

      {/* Sector Filter */}
      <select
        value={sectorFilter}
        onChange={(e) => setSectorFilter(e.target.value)}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vojas-500 bg-white"
      >
        <option value="">All Sectors</option>
        {sectors.map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      {/* Status Filter */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vojas-500 bg-white"
      >
        <option value="">All Status</option>
        {statuses.map(([key, config]) => (
          <option key={key} value={key}>{config.label}</option>
        ))}
      </select>

      {/* View Mode Toggle */}
      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setViewMode('map')}
          className={cn(
            'px-3 py-2 text-sm flex items-center gap-1.5 transition-colors',
            viewMode === 'map' ? 'bg-vojas-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
          )}
        >
          <Map className="h-4 w-4" />
          <span className="hidden sm:inline">Map</span>
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={cn(
            'px-3 py-2 text-sm flex items-center gap-1.5 transition-colors border-l border-slate-200',
            viewMode === 'table' ? 'bg-vojas-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
          )}
        >
          <Table2 className="h-4 w-4" />
          <span className="hidden sm:inline">Table</span>
        </button>
        <button
          onClick={() => setViewMode('timeline')}
          className={cn(
            'px-3 py-2 text-sm flex items-center gap-1.5 transition-colors border-l border-slate-200',
            viewMode === 'timeline' ? 'bg-vojas-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
          )}
        >
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Timeline</span>
        </button>
      </div>

      {/* Clear Filters */}
      {(sectorFilter || statusFilter || searchQuery) && (
        <button
          onClick={() => {
            setSectorFilter('');
            setStatusFilter('');
            setSearchQuery('');
          }}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Clear filters"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Project Card Component
function ProjectCard({ project, onClick }: { project: any; onClick: () => void }) {
  const statusConfig = STATUS_CONFIG[project.status] ?? { label: project.status, variant: 'neutral' as const };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-vojas-300 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-slate-900 truncate">{project.name}</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {project.district ? `${project.district}, ` : ''}{project.state ?? ''}
          </p>
        </div>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Badge variant="neutral" className="text-xs">
          {SECTOR_LABELS[project.sector] ?? project.sector}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Progress</span>
          <span className="font-medium text-slate-700">{project.progressPercent ?? 0}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-vojas-500 rounded-full transition-all duration-500"
            style={{ width: `${project.progressPercent ?? 0}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Sanctioned</span>
        <span className="font-semibold text-slate-900">{formatCurrency(project.sanctionedAmount ?? project.approvedAmount)}</span>
      </div>
    </div>
  );
}

// Main Command Center Page
export default function CommandCenterPage() {
  const router = useRouter();

  // State
  const [drillDownLevel, setDrillDownLevel] = useState<DrillDownLevel>('india');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

  // Filters
  const [sectorFilter, setSectorFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('map');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Build filter params based on drill-down
  const filterParams = useMemo(() => {
    const params: any = {
      limit: 1000,
      ...(sectorFilter && { sector: sectorFilter }),
      ...(statusFilter && { status: statusFilter }),
      ...(searchQuery && { search: searchQuery }),
    };

    if (drillDownLevel === 'state' && selectedState) {
      params.state = selectedState;
    } else if (drillDownLevel === 'district' && selectedState && selectedDistrict) {
      params.state = selectedState;
      params.district = selectedDistrict;
    }

    return params;
  }, [drillDownLevel, selectedState, selectedDistrict, sectorFilter, statusFilter, searchQuery]);

  // Fetch projects
  const { data: projectsData, isLoading } = useProjects(filterParams);
  const projects = projectsData?.data ?? [];

  // Calculate state-wise aggregation
  const stateDataMap = useMemo<Record<string, StateData>>(() => {
    const map: Record<string, StateData> = {};

    // Initialize all states with zero counts
    INDIAN_STATES.forEach(state => {
      map[state.id] = {
        state: state.name,
        projectCount: 0,
        completedCount: 0,
        inProgressCount: 0,
        delayedCount: 0,
        totalSanctioned: 0,
        totalSpent: 0,
        districts: {},
      };
    });

    // Aggregate project data
    projects.forEach((project: any) => {
      const stateKey = project.state?.toUpperCase().replace(/\s+/g, '_');
      if (stateKey && map[stateKey]) {
        map[stateKey].projectCount++;
        map[stateKey].totalSanctioned += project.sanctionedAmount ?? project.approvedAmount ?? 0;
        map[stateKey].totalSpent += project.spentAmount ?? 0;

        if (project.status === ProjectStatus.COMPLETED || project.status === ProjectStatus.VERIFIED) {
          map[stateKey].completedCount++;
        } else if (project.status === ProjectStatus.IN_PROGRESS || project.status === ProjectStatus.APPROVED || project.status === ProjectStatus.SANCTIONED) {
          map[stateKey].inProgressCount++;
        }

        // Track delayed projects (simplified: projects in progress > 2 years)
        if (project.status === ProjectStatus.IN_PROGRESS && project.startDate) {
          const startDate = new Date(project.startDate);
          const now = new Date();
          const yearsDiff = (now.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          if (yearsDiff > 2) {
            map[stateKey].delayedCount++;
          }
        }

        // Track districts
        if (project.district) {
          if (!map[stateKey].districts[project.district]) {
            map[stateKey].districts[project.district] = {
              district: project.district,
              projectCount: 0,
              completedCount: 0,
              inProgressCount: 0,
              delayedCount: 0,
            };
          }
          map[stateKey].districts[project.district].projectCount++;
        }
      }
    });

    return map;
  }, [projects]);

  // Calculate totals
  const totals = useMemo(() => {
    return {
      totalProjects: projects.length,
      completed: projects.filter((p: any) => p.status === ProjectStatus.COMPLETED || p.status === ProjectStatus.VERIFIED).length,
      inProgress: projects.filter((p: any) =>
        [ProjectStatus.IN_PROGRESS, ProjectStatus.APPROVED, ProjectStatus.SANCTIONED].includes(p.status)
      ).length,
      delayed: stateDataMap && Object.values(stateDataMap).reduce((sum, s) => sum + s.delayedCount, 0),
      totalSanctioned: projects.reduce((sum: number, p: any) => sum + (p.sanctionedAmount ?? p.approvedAmount ?? 0), 0),
      totalSpent: projects.reduce((sum: number, p: any) => sum + (p.spentAmount ?? 0), 0),
    };
  }, [projects, stateDataMap]);

  // Get sorted states for sidebar
  const sortedStates = useMemo(() => {
    return Object.entries(stateDataMap)
      .filter(([_, data]) => data.projectCount > 0)
      .sort((a, b) => b[1].projectCount - a[1].projectCount);
  }, [stateDataMap]);

  // Get districts for selected state
  const stateDistricts = useMemo(() => {
    if (!selectedState || !stateDataMap[selectedState]) return [];
    const state = stateDataMap[selectedState];
    return Object.values(state.districts).sort((a, b) => b.projectCount - a.projectCount);
  }, [selectedState, stateDataMap]);

  // Paginated projects
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return projects.slice(start, start + pageSize);
  }, [projects, currentPage]);

  const totalPages = Math.ceil(projects.length / pageSize);

  // Handlers
  const handleStateClick = useCallback((stateId: string) => {
    setSelectedState(stateId);
    setDrillDownLevel('state');
    setSelectedDistrict(null);
    setCurrentPage(1);
  }, []);

  const handleDistrictClick = useCallback((district: string) => {
    setSelectedDistrict(district);
    setDrillDownLevel('district');
    setCurrentPage(1);
  }, []);

  const handleBack = useCallback(() => {
    if (drillDownLevel === 'district') {
      setSelectedDistrict(null);
      setDrillDownLevel('state');
    } else if (drillDownLevel === 'state') {
      setSelectedState(null);
      setDrillDownLevel('india');
    }
    setCurrentPage(1);
  }, [drillDownLevel]);

  const handleReset = useCallback(() => {
    setDrillDownLevel('india');
    setSelectedState(null);
    setSelectedDistrict(null);
    setCurrentPage(1);
  }, []);

  const handleStateHover = useCallback((stateId: string | null, event?: React.MouseEvent) => {
    setHoveredState(stateId);
    if (stateId && stateDataMap[stateId] && event) {
      setTooltipData({
        state: stateDataMap[stateId].state,
        x: event.clientX,
        y: event.clientY,
        data: stateDataMap[stateId],
      });
    } else {
      setTooltipData(null);
    }
  }, [stateDataMap]);

  const handleProjectClick = useCallback((projectId: string) => {
    router.push(`/projects/${projectId}`);
  }, [router]);

  // Get breadcrumb text
  const breadcrumbText = useMemo(() => {
    if (drillDownLevel === 'india') return 'INDIA';
    if (drillDownLevel === 'state') {
      const stateName = stateDataMap[selectedState ?? '']?.state ?? selectedState;
      return `INDIA → ${stateName}`;
    }
    return `INDIA → ${selectedState ? stateDataMap[selectedState]?.state : ''} → ${selectedDistrict}`;
  }, [drillDownLevel, selectedState, selectedDistrict, stateDataMap]);

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Command Center</h1>
          <p className="text-slate-500 text-sm mt-1">India MPLAD Project Intelligence</p>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        sectorFilter={sectorFilter}
        setSectorFilter={setSectorFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sidebar - States/Districts */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Browse</h3>
                <button
                  onClick={handleReset}
                  className="text-xs text-vojas-600 hover:text-vojas-700 flex items-center gap-1"
                >
                  <Home className="h-3 w-3" />
                  Reset
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono bg-slate-100 px-2 py-1 rounded">
                {breadcrumbText}
              </p>
            </CardHeader>
            <CardBody className="p-0 max-h-[calc(100vh-400px)] overflow-y-auto">
              {/* Back Button */}
              {drillDownLevel !== 'india' && (
                <button
                  onClick={handleBack}
                  className="w-full px-4 py-2 text-left text-sm text-vojas-600 hover:bg-vojas-50 flex items-center gap-2 border-b border-slate-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              )}

              {/* State List */}
              {drillDownLevel === 'india' && (
                <div className="divide-y divide-slate-100">
                  {sortedStates.length === 0 && !isLoading ? (
                    <div className="px-4 py-8 text-center text-slate-400 text-sm">
                      No state data available
                    </div>
                  ) : isLoading ? (
                    <div className="p-4 space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    sortedStates.map(([stateId, data]) => (
                      <button
                        key={stateId}
                        onClick={() => handleStateClick(stateId)}
                        className={cn(
                          'w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between',
                          selectedState === stateId && 'bg-vojas-50'
                        )}
                      >
                        <span className="text-sm font-medium text-slate-900">{data.state}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {data.projectCount}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* District List */}
              {drillDownLevel === 'state' && selectedState && (
                <div className="divide-y divide-slate-100">
                  {stateDistricts.length === 0 && !isLoading ? (
                    <div className="px-4 py-8 text-center text-slate-400 text-sm">
                      No district data available
                    </div>
                  ) : isLoading ? (
                    <div className="p-4 space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    stateDistricts.map((district) => (
                      <button
                        key={district.district}
                        onClick={() => handleDistrictClick(district.district)}
                        className={cn(
                          'w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between',
                          selectedDistrict === district.district && 'bg-vojas-50'
                        )}
                      >
                        <span className="text-sm text-slate-700">{district.district}</span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {district.projectCount}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Map / Content Area */}
        <div className="lg:col-span-9 order-1 lg:order-2 space-y-4">
          {/* Map View */}
          {viewMode === 'map' && (
            <Card>
              <CardBody className="p-0 relative">
                {/* Stats Overlay */}
                <div className="absolute top-4 right-4 z-10">
                  <StatsOverlay
                    totalProjects={totals.totalProjects}
                    completed={totals.completed}
                    inProgress={totals.inProgress}
                    delayed={totals.delayed}
                    totalSanctioned={totals.totalSanctioned}
                    totalSpent={totals.totalSpent}
                    isLoading={isLoading}
                  />
                </div>

                {/* India Map */}
                <div className="p-4">
                  <IndiaMap
                    stateData={stateDataMap}
                    selectedState={selectedState}
                    onStateClick={handleStateClick}
                    onStateHover={handleStateHover}
                    onStateLeave={() => {
                      setHoveredState(null);
                      setTooltipData(null);
                    }}
                    hoveredState={hoveredState}
                  />
                </div>

                {/* Map Legend */}
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-200 shadow-sm">
                  <p className="text-xs font-medium text-slate-600 mb-2">Project Density</p>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-3 bg-slate-100 rounded" />
                    <span className="text-[10px] text-slate-500">No data</span>
                    <div className="w-4 h-3 bg-blue-100 rounded ml-2" />
                    <span className="text-[10px] text-slate-500">Low</span>
                    <div className="w-4 h-3 bg-blue-300 rounded" />
                    <span className="text-[10px] text-slate-500">Medium</span>
                    <div className="w-4 h-3 bg-blue-500 rounded" />
                    <span className="text-[10px] text-slate-500">High</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">
                    All Projects
                    {drillDownLevel !== 'india' && ` in ${stateDataMap[selectedState ?? '']?.state}`}
                  </h3>
                  <span className="text-sm text-slate-500">
                    {projects.length.toLocaleString('en-IN')} projects
                  </span>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Sector</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Location</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Sanctioned</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Progress</th>
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
                    ) : paginatedProjects.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No projects found
                        </td>
                      </tr>
                    ) : (
                      paginatedProjects.map((project: any) => {
                        const statusConfig = STATUS_CONFIG[project.status] ?? { label: project.status, variant: 'neutral' as const };
                        return (
                          <tr
                            key={project.id}
                            onClick={() => handleProjectClick(project.id)}
                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{project.name}</p>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="neutral" className="text-xs">
                                {SECTOR_LABELS[project.sector] ?? project.sector}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={statusConfig.variant} className="text-xs">
                                {statusConfig.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {project.district ? `${project.district}, ` : ''}{project.state ?? ''}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">
                              {formatCurrency(project.sanctionedAmount ?? project.approvedAmount)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-vojas-500 rounded-full"
                                    style={{ width: `${project.progressPercent ?? 0}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-600">{project.progressPercent ?? 0}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Timeline View */}
          {viewMode === 'timeline' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Project Timeline</h3>
                  <span className="text-sm text-slate-500">
                    {projects.length.toLocaleString('en-IN')} projects
                  </span>
                </div>
              </CardHeader>
              <CardBody className="space-y-4 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
                  ))
                ) : paginatedProjects.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">No projects found</div>
                ) : (
                  paginatedProjects.map((project: any) => {
                    const statusConfig = STATUS_CONFIG[project.status] ?? { label: project.status, variant: 'neutral' as const };
                    const startDate = project.startDate ? new Date(project.startDate) : null;
                    const endDate = project.endDate ? new Date(project.endDate) : null;
                    const now = new Date();

                    // Calculate timeline position (simplified)
                    let progressWidth = 0;
                    if (startDate && endDate) {
                      const total = endDate.getTime() - startDate.getTime();
                      const elapsed = Math.min(now.getTime() - startDate.getTime(), total);
                      progressWidth = (elapsed / total) * 100;
                    } else if (project.progressPercent) {
                      progressWidth = project.progressPercent;
                    }

                    return (
                      <div
                        key={project.id}
                        onClick={() => handleProjectClick(project.id)}
                        className="p-4 border border-slate-200 rounded-lg hover:border-vojas-300 hover:shadow-sm cursor-pointer transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-slate-900">{project.name}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {project.district ? `${project.district}, ` : ''}{project.state ?? ''}
                            </p>
                          </div>
                          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                        </div>

                        <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
                          {/* Timeline bar */}
                          <div className="absolute inset-0 flex items-center px-2">
                            <div className="w-full relative">
                              {/* Progress fill */}
                              <div
                                className="absolute h-2 bg-vojas-500 rounded-full top-1/2 -translate-y-1/2 transition-all"
                                style={{ width: `${progressWidth}%` }}
                              />
                              {/* Current position marker */}
                              {progressWidth > 0 && progressWidth < 100 && (
                                <div
                                  className="absolute w-3 h-3 bg-vojas-600 rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-sm"
                                  style={{ left: `${progressWidth}%` }}
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between mt-2 text-xs text-slate-500">
                          <span>{startDate ? startDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Not started'}</span>
                          <span>{endDate ? endDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'No end date'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardBody>
            </Card>
          )}

          {/* Project Cards Grid (visible in map view) */}
          {viewMode === 'map' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">
                  {drillDownLevel === 'india' ? 'All Projects' :
                    drillDownLevel === 'state' ?
                      `Projects in ${stateDataMap[selectedState ?? '']?.state}` :
                      `Projects in ${selectedDistrict}`}
                </h3>
                <span className="text-sm text-slate-500">
                  {projects.length.toLocaleString('en-IN')} projects • Page {currentPage} of {totalPages || 1}
                </span>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-48 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : paginatedProjects.length === 0 ? (
                <Card>
                  <CardBody className="py-12 text-center text-slate-400">
                    <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No projects match your criteria</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-4"
                      onClick={handleReset}
                    >
                      Reset View
                    </Button>
                  </CardBody>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paginatedProjects.map((project: any) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => handleProjectClick(project.id)}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    leftIcon={<ChevronLeft className="h-4 w-4" />}
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                            currentPage === pageNum
                              ? 'bg-vojas-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Pagination for Table/Timeline views */}
          {viewMode !== 'map' && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Previous
              </Button>

              <span className="text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* State Tooltip */}
      {tooltipData && (
        <StateTooltip
          state={tooltipData.state}
          x={tooltipData.x}
          y={tooltipData.y}
          data={tooltipData.data}
        />
      )}
    </div>
  );
}
