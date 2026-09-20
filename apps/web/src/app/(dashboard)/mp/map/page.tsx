'use client';

/**
 * MP Constituency Map — M14
 * Geographic view of constituency projects with markers and boundaries.
 */

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useMPProjects } from '@/hooks/useMP';
import { formatCurrency } from '@/lib/utils';
import { ProjectStatus } from '@vojas/shared';
import {
    AlertTriangle,
    ChevronRight,
    Layers,
    MapPin,
    X
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

const InteractiveGisMap = dynamic(
  () => import('@/components/map/InteractiveGisMap').then((m) => m.InteractiveGisMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] rounded-2xl bg-slate-950 flex items-center justify-center text-sm text-slate-400 font-mono">
        INITIALIZING TACTICAL GIS MAP ENGINE…
      </div>
    ),
  }
);

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

  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [hoveredProject, setHoveredProject] = useState<any>(null);
  const [showLayers, setShowLayers] = useState({
    projects: true,
    attention: true,
    signals: false,
    boundaries: true,
  });
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  // Fetch all projects for the constituency — resolved server-side from the
  // authenticated user's admin-linked MP record.
  const { data, isLoading } = useMPProjects({ limit: 500 });
  const isLinked = data ? (data as { linked?: boolean }).linked !== false : true;
  const projects = data?.data ?? [];

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p: any) => {
      if (filterStatus && p.status !== filterStatus) return false;
      if (selectedDistrict && p.district !== selectedDistrict) return false;
      // Only show projects with coordinates
      return p.latitude != null && p.longitude != null;
    });
  }, [projects, filterStatus, selectedDistrict]);

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

      {!isLoading && !isLinked && (
        <Card>
          <CardBody className="text-center py-8">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">MP account not linked</p>
            <p className="text-xs text-slate-500 mt-1">
              This account has not yet been linked to an MP record by an administrator.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map Area */}
        <div className="lg:col-span-9">
          <InteractiveGisMap
            projects={filteredProjects.map((p: any) => ({
              id: p.id,
              title: p.name || p.title || 'Constituency Project',
              latitude: Number(p.latitude),
              longitude: Number(p.longitude),
              district: p.district,
              state: p.state,
              constituency: p.constituency,
              sanctionedAmount: p.approvedAmount ?? p.sanctionedAmount,
              expenditure: p.spentAmount ?? p.expenditure,
              status: p.status,
              contractorName: p.contractor ?? p.contractorName,
            }))}
            heightClass="h-[620px]"
            className="rounded-2xl"
          />
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
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="font-semibold text-slate-900">Districts</h3>
              {selectedDistrict && (
                <button
                  onClick={() => setSelectedDistrict(null)}
                  className="text-xs text-vojas-600 hover:text-vojas-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  Clear filter <X className="h-3 w-3" />
                </button>
              )}
            </CardHeader>
            <CardBody className="p-0 max-h-[400px] overflow-y-auto">
              <div className="divide-y divide-slate-100">
                {Object.entries(projectsByDistrict)
                  .sort(([, a], [, b]) => (b as any[]).length - (a as any[]).length)
                  .map(([district, districtProjects]) => (
                    <div
                      key={district}
                      className={`px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                        selectedDistrict === district ? 'bg-vojas-50/80 border-l-4 border-vojas-600' : ''
                      }`}
                      onClick={() => setSelectedDistrict(selectedDistrict === district ? null : district)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900">{district}</p>
                        <Badge variant={selectedDistrict === district ? 'primary' : 'neutral'}>
                          {districtProjects.length}
                        </Badge>
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
