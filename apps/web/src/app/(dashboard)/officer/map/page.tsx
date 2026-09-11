'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useOfficerMapLayers } from '@/hooks/useOfficer';
import {
    AlertTriangle,
    Eye,
    EyeOff,
    FileText,
    Filter,
    Layers,
    Map,
    MapPin,
    Satellite,
    Shield,
    Users,
    X
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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

  const mappedProjects = useMemo(() => {
    return (data?.projects ?? [])
      .filter((p: any) => p.latitude != null && p.longitude != null && !isNaN(p.latitude) && !isNaN(p.longitude))
      .map((p: any) => ({
        id: p.id,
        title: p.name || p.title || 'Untitled Project',
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        district: p.district,
        state: p.state,
        constituency: p.constituency,
        sanctionedAmount: p.sanctionedAmount,
        expenditure: p.expenditure,
        status: p.status,
        contractorName: p.contractorName,
      }));
  }, [data?.projects]);

  const mappedRisks = useMemo(() => {
    return (data?.riskFindings ?? [])
      .filter((f: any) => f.latitude != null && f.longitude != null && !isNaN(f.latitude) && !isNaN(f.longitude))
      .map((f: any) => ({
        id: f.id,
        title: f.title || 'Risk Anomaly',
        latitude: Number(f.latitude),
        longitude: Number(f.longitude),
        severity: (f.severity || 'HIGH') as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
        district: f.district,
        description: f.description,
        projectId: f.projectId,
      }));
  }, [data?.riskFindings]);

  const mappedCitizen = useMemo(() => {
    return (data?.citizenSignals ?? [])
      .filter((cs: any) => cs.latitude != null && cs.longitude != null && !isNaN(cs.latitude) && !isNaN(cs.longitude))
      .map((cs: any) => ({
        id: cs.id,
        title: cs.title || 'Citizen Grievance',
        latitude: Number(cs.latitude),
        longitude: Number(cs.longitude),
        status: cs.status || 'REPORTED',
        district: cs.district,
        description: cs.description,
      }));
  }, [data?.citizenSignals]);

  const mappedSatellite = useMemo(() => {
    return (data?.satelliteEvidence ?? [])
      .filter((se: any) => se.latitude != null && se.longitude != null && !isNaN(se.latitude) && !isNaN(se.longitude))
      .map((se: any) => ({
        id: se.id,
        title: se.title || 'Satellite Observation',
        latitude: Number(se.latitude),
        longitude: Number(se.longitude),
        observationDate: se.observationDate,
        ndvi: se.ndvi,
        ndbi: se.ndbi,
        changeScore: se.changeScore,
        district: se.district,
      }));
  }, [data?.satelliteEvidence]);

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
          <InteractiveGisMap
            projects={mappedProjects}
            riskFindings={mappedRisks}
            citizenSignals={mappedCitizen}
            satelliteObservations={mappedSatellite}
            heightClass="h-[640px]"
            className="rounded-2xl"
          />
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
