'use client';

/**
 * MP Constituency Map — M14
 * Geographic view of constituency projects with markers and boundaries.
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, Layers, Eye, EyeOff, AlertTriangle, CheckCircle2,
  Clock, Filter, X, Building2, ChevronRight
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useMPProjects } from '@/hooks/useMP';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, cn } from '@/lib/utils';
import { ProjectStatus } from '@vojas/shared';

// Status colors for map markers
const STATUS_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  [ProjectStatus.COMPLETED]: { fill: '#10b981', stroke: '#059669', label: 'Completed' },
  [ProjectStatus.IN_PROGRESS]: { fill: '#3b82f6', stroke: '#2563eb', label: 'In Progress' },
  [ProjectStatus.VERIFIED]: { fill: '#10b981', stroke: '#059669', label: 'Verified' },
  [ProjectStatus.APPROVED]: { fill: '#8b5cf6', stroke: '#7c3aed', label: 'Approved' },
  [ProjectStatus.SANCTIONED]: { fill: '#8b5cf6', stroke: '#7c3aed', label: 'Sanctioned' },
  [ProjectStatus.PROPOSED]: { fill: '#94a3b8', stroke: '#64748b', label: 'Proposed' },
  [ProjectStatus.CANCELLED]: { fill: '#ef4444', stroke: '#dc2626', label: 'Cancelled' },
  [ProjectStatus.UNSANCTIONED]: { fill: '#ef4444', stroke: '#dc2626', label: 'Unsanctioned' },
};

export default function MPMapPage() {
  const router = useRouter();
  const { user } = useAuth();
  const mpId = (user as any)?.mpId ?? 'current-mp';

  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [hoveredProject, setHoveredProject] = useState<any>(null);
  const [showLayers, setShowLayers] = useState({
    projects: true,
    attention: true,
    signals: false,
    boundaries: true,
  });
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Fetch all projects for the constituency
  const { data, isLoading } = useMPProjects(mpId, { limit: 500 });
  const projects = data?.data ?? [];

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p: any) => {
      if (filterStatus && p.status !== filterStatus) return false;
      // Only show projects with coordinates
      return p.latitude && p.longitude;
    });
  }, [projects, filterStatus]);

  // Get projects needing attention
  const attentionProjects = useMemo(() => {
    return projects.filter((p: any) =>
      p.status === ProjectStatus.IN_PROGRESS &&
      p.riskLevel === 'HIGH' ||
      (p.progressPercent ?? 100) < 25
    );
  }, [projects]);

  // Group projects by district
  const projectsByDistrict = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    filteredProjects.forEach((p: any) => {
      const district = p.district ?? 'Unknown';
      if (!grouped[district]) grouped[district] = [];
      grouped[district].push(p);
    });
    return grouped;
  }, [filteredProjects]);

  // Legend items
  const legendItems = Object.entries(STATUS_COLORS).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <MapPin className="h-4 w-4" />
            <span>My Constituency</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Constituency Map</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filteredProjects.length} projects plotted • {attentionProjects.length} need attention
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            leftIcon={<Layers className="h-4 w-4" />}
            onClick={() => setShowLayers((l) => ({ ...l, boundaries: !l.boundaries }))}
          >
            {showLayers.boundaries ? 'Hide' : 'Show'} Boundaries
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map Area */}
        <div className="lg:col-span-9">
          <Card className="relative">
            <CardBody className="p-0">
              {/* Map Controls */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                {/* Status Filter */}
                <div className="bg-white rounded-lg shadow-md p-2 flex flex-col gap-1">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-vojas-500"
                  >
                    <option value="">All Status</option>
                    {legendItems.map(([status]) => (
                      <option key={status} value={status}>{STATUS_COLORS[status].label}</option>
                    ))}
                  </select>
                </div>

                {/* Layer Toggles */}
                <div className="bg-white rounded-lg shadow-md p-2 flex flex-col gap-1">
                  <button
                    onClick={() => setShowLayers((l) => ({ ...l, projects: !l.projects }))}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
                      showLayers.projects ? 'bg-vojas-50 text-vojas-700' : 'text-slate-600'
                    )}
                  >
                    {showLayers.projects ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    Projects
                  </button>
                  <button
                    onClick={() => setShowLayers((l) => ({ ...l, attention: !l.attention }))}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
                      showLayers.attention ? 'bg-red-50 text-red-700' : 'text-slate-600'
                    )}
                  >
                    {showLayers.attention ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    Attention
                  </button>
                </div>
              </div>

              {/* Map Legend */}
              <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-3 py-2">
                <p className="text-xs font-medium text-slate-600 mb-2">Project Status</p>
                <div className="flex flex-wrap gap-3">
                  {legendItems.map(([status, config]) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
                      className={cn(
                        'flex items-center gap-1.5 text-xs transition-opacity',
                        filterStatus && filterStatus !== status ? 'opacity-40' : 'opacity-100'
                      )}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: config.fill, border: `2px solid ${config.stroke}` }}
                      />
                      <span className="text-slate-600">{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Canvas */}
              <div className="relative bg-slate-100 rounded-xl overflow-hidden" style={{ minHeight: '600px' }}>
                {/* Placeholder for actual map - would use MapLibre/Leaflet */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500 mb-2">Interactive Map View</p>
                    <p className="text-xs text-slate-400 mb-4">
                      {showLayers.projects ? `${filteredProjects.length} project markers` : 'Projects layer hidden'}
                    </p>

                    {/* Simulated Map Grid */}
                    <div className="relative w-96 h-64 bg-slate-200/50 rounded-lg border-2 border-dashed border-slate-300 overflow-hidden">
                      {/* District boundaries placeholder */}
                      {Object.entries(projectsByDistrict).slice(0, 4).map(([district, districtProjects], i) => (
                        <div
                          key={district}
                          className={cn(
                            'absolute bg-white/30 rounded-lg border border-slate-300',
                            i === 0 && 'top-2 left-2 w-1/2 h-1/2',
                            i === 1 && 'top-2 right-2 w-1/2 h-1/3',
                            i === 2 && 'bottom-2 left-2 w-1/3 h-1/3',
                            i === 3 && 'bottom-2 right-2 w-1/2 h-1/3'
                          )}
                        >
                          <p className="text-[8px] text-slate-500 p-1">{district}</p>
                          {/* Project markers */}
                          {showLayers.projects && districtProjects.slice(0, 5).map((project: any, j: number) => {
                            const config = STATUS_COLORS[project.status] ?? STATUS_COLORS[ProjectStatus.PROPOSED];
                            return (
                              <button
                                key={project.id}
                                onClick={() => setSelectedProject(project)}
                                onMouseEnter={() => setHoveredProject(project)}
                                onMouseLeave={() => setHoveredProject(null)}
                                className={cn(
                                  'absolute w-4 h-4 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-150',
                                  showLayers.attention && attentionProjects.includes(project) && 'ring-2 ring-red-500'
                                )}
                                style={{
                                  backgroundColor: config.fill,
                                  border: `2px solid ${config.stroke}`,
                                  left: `${20 + j * 15}%`,
                                  top: `${30 + (i % 2) * 30}%`,
                                }}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hover Tooltip */}
                {hoveredProject && (
                  <div className="absolute top-4 right-4 bg-slate-900 text-white rounded-lg shadow-xl px-4 py-3 z-20 max-w-xs">
                    <p className="font-semibold text-sm mb-1">{hoveredProject.name}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge
                        variant={
                          hoveredProject.status === ProjectStatus.COMPLETED ? 'success' :
                          hoveredProject.status === ProjectStatus.IN_PROGRESS ? 'info' :
                          hoveredProject.status === ProjectStatus.CANCELLED ? 'danger' : 'neutral'
                        }
                      >
                        {hoveredProject.status}
                      </Badge>
                      <span className="text-slate-400">
                        {hoveredProject.district ?? hoveredProject.state}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatCurrency(hoveredProject.sanctionedAmount)} • {hoveredProject.progressPercent ?? 0}%
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          {/* Selected Project Detail */}
          {selectedProject && (
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Selected Project</h3>
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardBody>
                <h4 className="font-medium text-slate-900 mb-2">{selectedProject.name}</h4>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Status</span>
                    <Badge variant={
                      selectedProject.status === ProjectStatus.COMPLETED ? 'success' :
                      selectedProject.status === ProjectStatus.IN_PROGRESS ? 'info' : 'neutral'
                    }>
                      {selectedProject.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Amount</span>
                    <span className="font-medium">{formatCurrency(selectedProject.sanctionedAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Progress</span>
                    <span className="font-medium">{selectedProject.progressPercent ?? 0}%</span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => router.push(`/projects/${selectedProject.id}`)}
                  rightIcon={<ChevronRight className="h-4 w-4" />}
                >
                  View Details
                </Button>
              </CardBody>
            </Card>
          )}

          {/* Districts List */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Districts</h3>
            </CardHeader>
            <CardBody className="p-0 max-h-[400px] overflow-y-auto">
              <div className="divide-y divide-slate-100">
                {Object.entries(projectsByDistrict)
                  .sort(([, a], [, b]) => (b as any[]).length - (a as any[]).length)
                  .map(([district, districtProjects]) => (
                    <div
                      key={district}
                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => {/* TODO: Zoom to district */}}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900">{district}</p>
                        <Badge variant="neutral">{districtProjects.length}</Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {districtProjects.slice(0, 4).map((p: any) => {
                          const config = STATUS_COLORS[p.status] ?? { fill: '#94a3b8' };
                          return (
                            <span
                              key={p.id}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: config.fill }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </CardBody>
          </Card>

          {/* Attention Needed */}
          {attentionProjects.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <h3 className="font-semibold text-slate-900">Needs Attention</h3>
                </div>
              </CardHeader>
              <CardBody className="p-0 max-h-[300px] overflow-y-auto">
                <div className="divide-y divide-slate-100">
                  {attentionProjects.slice(0, 5).map((project: any) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-slate-900 truncate">{project.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="danger" className="text-xs">
                          {project.progressPercent ?? 0}% progress
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {project.district ?? project.state}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
