'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  Map,
  Layers,
  Filter,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  MapPin,
  Satellite,
  FileText,
  Users,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useOfficerMapLayers } from '@/hooks/useOfficer';

// Layer types
const LAYER_TYPES = [
  { key: 'projects', label: 'Projects', icon: MapPin, color: 'text-blue-600' },
  { key: 'riskFindings', label: 'Risk Findings', icon: AlertTriangle, color: 'text-red-600' },
  { key: 'cases', label: 'Cases', icon: Shield, color: 'text-purple-600' },
  { key: 'citizenSignals', label: 'Citizen Signals', icon: Users, color: 'text-green-600' },
  { key: 'satelliteEvidence', label: 'Satellite Evidence', icon: Satellite, color: 'text-indigo-600' },
  { key: 'fieldInspections', label: 'Field Inspections', icon: FileText, color: 'text-amber-600' },
] as const;

type LayerKey = typeof LAYER_TYPES[number]['key'];

export default function OfficerMapPage() {
  const [activeLayers, setActiveLayers] = useState<Record<LayerKey, boolean>>({
    projects: true,
    riskFindings: true,
    cases: true,
    citizenSignals: false,
    satelliteEvidence: false,
    fieldInspections: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sectorFilter, setSectorFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<any>(null);

  const { data, isLoading } = useOfficerMapLayers({
    projects: activeLayers.projects,
    riskFindings: activeLayers.riskFindings,
    cases: activeLayers.cases,
    citizenSignals: activeLayers.citizenSignals,
    satelliteEvidence: activeLayers.satelliteEvidence,
    fieldInspections: activeLayers.fieldInspections,
    sector: sectorFilter || undefined,
    state: stateFilter || undefined,
  });

  const toggleLayer = (key: LayerKey) => {
    setActiveLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getEntityHref = (entity: any, type: LayerKey) => {
    switch (type) {
      case 'projects':
        return `/projects/${entity.id}`;
      case 'riskFindings':
      case 'cases':
        return `/officer/cases/${entity.id}`;
      default:
        return '#';
    }
  };

  const getEntityColor = (entity: any, type: LayerKey) => {
    switch (type) {
      case 'riskFindings':
        return entity.severity === 'CRITICAL' ? 'bg-red-500' : entity.severity === 'HIGH' ? 'bg-orange-500' : entity.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-400';
      case 'cases':
        return entity.priority === 'CRITICAL' ? 'bg-red-500' : entity.priority === 'HIGH' ? 'bg-orange-500' : entity.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-400';
      case 'fieldInspections':
        return entity.status === 'COMPLETED' ? 'bg-green-500' : entity.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-400';
      default:
        return 'bg-blue-500';
    }
  };

  // Count entities per layer
  const layerCounts = useMemo(() => ({
    projects: data?.projects?.length ?? 0,
    riskFindings: data?.riskFindings?.length ?? 0,
    cases: data?.cases?.length ?? 0,
    citizenSignals: data?.citizenSignals?.length ?? 0,
    satelliteEvidence: data?.satelliteEvidence?.length ?? 0,
    fieldInspections: data?.fieldInspections?.length ?? 0,
  }), [data]);

  const totalVisible = Object.entries(activeLayers).filter(([key, active]) => active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Map className="h-6 w-6 text-vojas-600" />
            Officer Map
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Spatial view of cases, findings, and evidence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/officer">
            <Button variant="secondary" size="sm">Back to Dashboard</Button>
          </Link>
          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters((s) => !s)}
          >
            Filters
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Sector</label>
              <input
                type="text"
                placeholder="Filter by sector..."
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">State</label>
              <input
                type="text"
                placeholder="Filter by state..."
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSectorFilter(''); setStateFilter(''); }}
                leftIcon={<X className="h-3 w-3" />}
              >
                Clear Filters
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Layer Controls */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Layers:</span>
            </div>
            {LAYER_TYPES.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  activeLayers[key]
                    ? 'bg-vojas-100 text-vojas-700 border border-vojas-300'
                    : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {activeLayers[key] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <Icon className={`h-4 w-4 ${activeLayers[key] ? color : 'text-slate-400'}`} />
                {label}
                <Badge variant="neutral" className="text-xs">{layerCounts[key]}</Badge>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Map Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card className="h-[600px]">
            <CardBody className="p-0 relative h-full">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Map className="h-12 w-12 text-slate-300 animate-pulse mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Loading map data...</p>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                  {/* India Map placeholder with entity markers */}
                  <div className="relative w-full h-full">
                    <svg
                      viewBox="0 0 1000 850"
                      className="w-full h-full opacity-30"
                      style={{ maxHeight: '600px' }}
                    >
                      <rect x="0" y="0" width="1000" height="850" fill="#e2e8f0" />
                      {/* Simplified India outline */}
                      <path
                        d="M150,300 Q200,250 300,280 Q400,200 500,250 Q600,180 700,220 Q800,280 850,350 Q800,450 750,500 Q650,550 550,520 Q450,580 350,550 Q250,500 200,420 Q150,350 150,300 Z"
                        fill="#cbd5e1"
                        stroke="#94a3b8"
                        strokeWidth="2"
                      />
                    </svg>

                    {/* Entity markers would be positioned here based on lat/lng */}
                    {/* For demo, show a few sample markers */}
                    {activeLayers.projects && data?.projects?.slice(0, 10).map((p, i) => (
                      <div
                        key={`project-${p.id}`}
                        className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-125 transition-transform"
                        style={{
                          left: `${20 + (i % 5) * 15}%`,
                          top: `${25 + Math.floor(i / 5) * 20}%`,
                        }}
                        onClick={() => setSelectedEntity({ ...p, type: 'project' })}
                        title={p.name}
                      />
                    ))}

                    {activeLayers.riskFindings && data?.riskFindings?.slice(0, 5).map((f, i) => (
                      <div
                        key={`finding-${f.id}`}
                        className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-125 transition-transform"
                        style={{
                          left: `${35 + (i % 4) * 12}%`,
                          top: `${35 + Math.floor(i / 4) * 18}%`,
                        }}
                        onClick={() => setSelectedEntity({ ...f, type: 'riskFinding' })}
                        title={f.title}
                      />
                    ))}

                    {activeLayers.cases && data?.cases?.slice(0, 5).map((c, i) => (
                      <div
                        key={`case-${c.id}`}
                        className="absolute w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-125 transition-transform"
                        style={{
                          left: `${55 + (i % 4) * 10}%`,
                          top: `${40 + Math.floor(i / 4) * 15}%`,
                        }}
                        onClick={() => setSelectedEntity({ ...c, type: 'case' })}
                        title={c.title}
                      />
                    ))}
                  </div>

                  {/* Map Legend */}
                  <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-3 border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-600 mb-2">Legend</p>
                    <div className="space-y-1.5">
                      {LAYER_TYPES.filter(({ key }) => activeLayers[key]).map(({ key, label, color }) => (
                        <div key={key} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${key === 'projects' ? 'bg-blue-500' : key === 'riskFindings' ? 'bg-red-500' : key === 'cases' ? 'bg-purple-500' : 'bg-vojas-500'}`} />
                          <span className="text-xs text-slate-600">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Entity Panel */}
              {selectedEntity && (
                <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {selectedEntity.type === 'project' ? 'Project' : selectedEntity.type === 'riskFinding' ? 'Risk Finding' : 'Case'}
                    </h3>
                    <button
                      onClick={() => setSelectedEntity(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-sm font-medium text-slate-700">
                      {selectedEntity.name || selectedEntity.title}
                    </p>
                    {(selectedEntity.sector || selectedEntity.severity || selectedEntity.priority) && (
                      <div className="flex items-center gap-2">
                        {selectedEntity.sector && <Badge variant="neutral">{selectedEntity.sector}</Badge>}
                        {selectedEntity.severity && (
                          <Badge variant={selectedEntity.severity === 'CRITICAL' || selectedEntity.severity === 'HIGH' ? 'danger' : 'warning'}>
                            {selectedEntity.severity}
                          </Badge>
                        )}
                        {selectedEntity.priority && (
                          <Badge variant={selectedEntity.priority === 'CRITICAL' || selectedEntity.priority === 'HIGH' ? 'danger' : 'warning'}>
                            {selectedEntity.priority}
                          </Badge>
                        )}
                        {selectedEntity.status && <Badge variant="info">{selectedEntity.status}</Badge>}
                      </div>
                    )}
                    <div className="pt-2">
                      <Link href={getEntityHref(selectedEntity, selectedEntity.type === 'project' ? 'projects' : selectedEntity.type === 'riskFinding' ? 'riskFindings' : 'cases')}>
                        <Button variant="primary" size="sm" className="w-full">
                          Open {selectedEntity.type === 'project' ? 'Project' : 'Case'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Entity List Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {activeLayers.cases && data?.cases && data.cases.length > 0 && (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  Cases ({data.cases.length})
                </h3>
              </CardHeader>
              <CardBody className="p-0 max-h-64 overflow-y-auto">
                <div className="divide-y divide-slate-100">
                  {data.cases.slice(0, 10).map((c) => (
                    <Link
                      key={c.id}
                      href={`/officer/cases/${c.id}`}
                      className="block px-4 py-2 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getEntityColor(c, 'cases')}`} />
                        <span className="text-sm text-slate-700 truncate flex-1">{c.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={c.priority === 'CRITICAL' ? 'danger' : c.priority === 'HIGH' ? 'warning' : 'neutral'} className="text-xs">
                          {c.priority}
                        </Badge>
                        <span className="text-xs text-slate-400">{c.status}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {activeLayers.riskFindings && data?.riskFindings && data.riskFindings.length > 0 && (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Risk Findings ({data.riskFindings.length})
                </h3>
              </CardHeader>
              <CardBody className="p-0 max-h-64 overflow-y-auto">
                <div className="divide-y divide-slate-100">
                  {data.riskFindings.slice(0, 10).map((f) => (
                    <Link
                      key={f.id}
                      href={`/officer/cases/${f.id}`}
                      className="block px-4 py-2 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getEntityColor(f, 'riskFindings')}`} />
                        <span className="text-sm text-slate-700 truncate flex-1">{f.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={f.severity === 'CRITICAL' || f.severity === 'HIGH' ? 'danger' : 'warning'} className="text-xs">
                          {f.severity}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {activeLayers.projects && data?.projects && data.projects.length > 0 && (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Projects ({data.projects.length})
                </h3>
              </CardHeader>
              <CardBody className="p-0 max-h-64 overflow-y-auto">
                <div className="divide-y divide-slate-100">
                  {data.projects.slice(0, 10).map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="block px-4 py-2 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-sm text-slate-700 truncate flex-1">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="neutral" className="text-xs">{p.sector}</Badge>
                        <Badge variant="info" className="text-xs">{p.status}</Badge>
                      </div>
                    </Link>
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
