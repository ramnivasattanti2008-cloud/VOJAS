'use client';

import { useState, useCallback } from 'react';
import { MapPin, Layers, AlertTriangle, Search, X } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useProjects } from '@/hooks/useProjects';
import { formatCurrency } from '@/lib/utils';
import { ProjectStatus } from '@vojas/shared';
import type { ProjectSector } from '@vojas/shared';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  COMPLETED: 'success',
  IN_PROGRESS: 'info',
  CANCELLED: 'danger',
  PROPOSED: 'neutral',
  APPROVED: 'info',
  VERIFIED: 'success',
};

const SECTOR_COLORS: Partial<Record<ProjectSector, string>> = {
  PUBLIC_INFRASTRUCTURE: '#6366f1',
  WATER_SANITATION: '#0ea5e9',
  EDUCATION: '#f59e0b',
  HEALTH: '#ef4444',
  AGRICULTURE: '#22c55e',
  ENVIRONMENT: '#10b981',
  TRANSPORT: '#8b5cf6',
  ENERGY: '#eab308',
  HOUSING: '#f97316',
};

export function MapViewClient() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { data, isLoading } = useProjects({
    search: search || undefined,
    state: state || undefined,
    limit: 200,
  });

  const projects = data?.data ?? [];
  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : null;

  const handleMarkerClick = useCallback((projectId: string) => {
    setSelectedProjectId((prev) => (prev === projectId ? null : projectId));
  }, []);

  // Group projects by state for summary
  const byState = projects.reduce<Record<string, number>>((acc, p) => {
    if (p.state) acc[p.state] = (acc[p.state] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Map View</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {isLoading ? 'Loading…' : `${projects.length} projects on map`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            aria-label="Search projects"
          />
        </div>
        <Input
          label="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="Filter by state"
          className="max-w-[200px]"
        />
        <Button
          variant="ghost"
          size="md"
          onClick={() => {
            setSearch('');
            setState('');
          }}
          leftIcon={<X className="h-4 w-4" />}
        >
          Reset
        </Button>
      </div>

      {/* Map + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map area — India SVG + project markers */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 relative" style={{ minHeight: 480 }}>
              {/* India SVG map background */}
              <svg
                viewBox="0 0 600 650"
                className="w-full h-auto"
                aria-label="Map of India showing project locations"
                role="img"
              >
                {/* Simplified India outline */}
                <path
                  d="M280 20 L310 15 L330 25 L360 20 L400 35 L430 50 L460 80 L480 120 L490 170 L500 220 L495 280 L480 330 L460 370 L430 400 L400 420 L360 440 L320 450 L290 460 L260 450 L240 420 L220 380 L200 340 L180 300 L160 260 L150 220 L160 180 L180 150 L200 130 L230 110 L260 90 L270 60 L280 20Z"
                  fill="#cbd5e1"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
                {/* Placeholder region dots */}
                {Object.entries(byState).slice(0, 8).map(([stateName, count], i) => {
                  // Scatter points across the map proportionally
                  const positions = [
                    [180, 120], [220, 150], [260, 180], [300, 160], [340, 190],
                    [380, 160], [420, 200], [460, 170],
                  ];
                  const [cx, cy] = positions[i % positions.length];
                  const radius = Math.min(count * 2, 20);
                  return (
                    <circle
                      key={stateName}
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill={SECTOR_COLORS[projects[i]?.sector as ProjectSector] ?? '#6366f1'}
                      opacity="0.7"
                      aria-label={`${count} projects in ${stateName}`}
                    />
                  );
                })}
                {/* Project dots — simplified to show 8 clusters */}
                {projects.slice(0, 60).map((p, i) => {
                  const seed = p.id.charCodeAt(0) + p.id.charCodeAt(p.id.length - 1);
                  const cx = 160 + (seed % 380);
                  const cy = 40 + ((seed * 7) % 480);
                  const color = SECTOR_COLORS[p.sector as ProjectSector] ?? '#6366f1';
                  const isSelected = p.id === selectedProjectId;
                  return (
                    <circle
                      key={p.id}
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 8 : 4}
                      fill={color}
                      stroke={isSelected ? '#fff' : 'none'}
                      strokeWidth={isSelected ? 2 : 0}
                      className="cursor-pointer transition-all duration-200"
                      onClick={() => handleMarkerClick(p.id)}
                      opacity={selectedProjectId && !isSelected ? 0.4 : 0.9}
                      aria-label={`${p.name} — ${p.state}`}
                    />
                  );
                })}
              </svg>

              {/* Selected project info overlay */}
              {selectedProject && (
                <div className="absolute top-4 right-4 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 text-sm line-clamp-2">
                      {selectedProject.name}
                    </h3>
                    <button
                      onClick={() => setSelectedProjectId(null)}
                      className="text-slate-400 hover:text-slate-600 shrink-0"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p>{selectedProject.district ? `${selectedProject.district}, ` : ''}{selectedProject.state}</p>
                    <p className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANT[selectedProject.status] ?? 'neutral'}>
                        {selectedProject.status}
                      </Badge>
                      <span>{selectedProject.sector?.replace(/_/g, ' ')}</span>
                    </p>
                    {selectedProject.sanctionedAmount && (
                      <p className="font-medium text-slate-900">
                        {formatCurrency(selectedProject.sanctionedAmount)}
                      </p>
                    )}
                    {selectedProject.progressPercent != null && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-vojas-500 rounded-full"
                            style={{ width: `${selectedProject.progressPercent}%` }}
                          />
                        </div>
                        <span className="shrink-0">{selectedProject.progressPercent}%</span>
                      </div>
                    )}
                  </div>
                  <a
                    href={`/projects/${selectedProject.id}`}
                    className="mt-3 block w-full text-center text-xs font-medium text-vojas-600 hover:text-vojas-700 border border-vojas-200 rounded-lg py-1.5 transition-colors"
                  >
                    View Project →
                  </a>
                </div>
              )}
            </div>
            {/* Legend */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-4 flex-wrap text-xs">
              <span className="text-slate-500 font-medium">Sectors:</span>
              {Object.entries(SECTOR_COLORS).slice(0, 7).map(([sector, color]) => (
                <span key={sector} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                  {sector.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar — state summary + project list */}
        <div className="space-y-4">
          {/* State summary */}
          <Card>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-900">By State</h2>
            </div>
            <CardBody className="space-y-2 max-h-60 overflow-y-auto">
              {Object.entries(byState)
                .sort((a, b) => b[1] - a[1])
                .map(([stateName, count]) => (
                  <div key={stateName} className="flex justify-between text-sm">
                    <span className="text-slate-700">{stateName}</span>
                    <span className="font-medium text-slate-900">{count}</span>
                  </div>
                ))}
            </CardBody>
          </Card>

          {/* Recent / selected projects list */}
          <Card>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-900">Projects</h2>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {projects.slice(0, 30).map((p) => (
                <button
                  key={p.id}
                  className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors ${
                    p.id === selectedProjectId ? 'bg-vojas-50' : ''
                  }`}
                  onClick={() => handleMarkerClick(p.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.district ? `${p.district}, ` : ''}{p.state ?? ''}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[p.status] ?? 'neutral'} className="shrink-0 text-[10px]">
                      {p.status}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
