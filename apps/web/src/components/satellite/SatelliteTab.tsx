'use client';

import { useState, useMemo } from 'react';
import { useSatelliteStatus, useSatelliteTimeline, useSatelliteObservations, useSatelliteChange, useProgressComparison, useTriggerSatelliteSync } from '@/hooks/useSatellite';
import { ProjectMap } from '@/components/satellite/SatelliteMap';
import { TimeMachine } from '@/components/satellite/TimeMachine';
import { ObservationCard } from '@/components/satellite/ObservationCard';
import { ProgressComparisonPanel } from '@/components/satellite/ProgressComparisonPanel';
import { EvidenceChain } from '@/components/satellite/EvidenceChain';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  RefreshCw, MapPin, Eye, BarChart2, CheckCircle2, AlertCircle,
  Clock, Loader2, CloudOff, ExternalLink, ArrowRight, Info,
  Layers, AlertTriangle,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { SatelliteObservation } from '@vojas/api-client';

type SubTab = 'timemachine' | 'observations' | 'comparison';

interface SatelliteTabProps {
  projectId: string;
  lat: number;
  lng: number;
  projectName?: string;
}

export function SatelliteTab({ projectId, lat, lng, projectName }: SatelliteTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('timemachine');
  const [selectedObsIndex, setSelectedObsIndex] = useState(0);

  const { data: status, isLoading: statusLoading } = useSatelliteStatus(projectId);
  const { data: timelineData, isLoading: timelineLoading } = useSatelliteTimeline(projectId);
  const { data: obsData, isLoading: obsLoading } = useSatelliteObservations(projectId);
  const { data: changeData } = useSatelliteChange(projectId);
  const { data: comparison } = useProgressComparison(projectId);
  const syncMutation = useTriggerSatelliteSync(projectId);

  const entries = timelineData?.entries ?? [];
  const observations = obsData?.observations ?? [];

  const selectedEntry = entries[selectedObsIndex];
  const selectedObservation = useMemo((): SatelliteObservation | null => {
    if (selectedEntry?.observationId) {
      return observations.find((o) => o.id === selectedEntry.observationId) ?? null;
    }
    return null;
  }, [selectedEntry, observations]);

  // Sync button — only admins/officers
  const handleSync = () => {
    if (confirm('Trigger a satellite sync for this project? This will search for real Sentinel-2 observations and generate weekly checkpoints.')) {
      syncMutation.mutate();
    }
  };

  // Loading state
  if (statusLoading && !status) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-48 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const notConfigured = status?.providerStatus === 'NOT_CONFIGURED';
  const noCoords = status?.reason === 'NO_COORDINATES';
  const processing = status?.processingStatus === 'PROCESSING';
  const hasData = (status?.observationCount ?? 0) > 0;

  // State: not configured
  if (notConfigured) {
    return (
      <div className="space-y-6">
        <StatusBanner
          icon={<AlertCircle className="h-5 w-5" />}
          title="Satellite provider not configured"
          description="Set CDSE_CLIENT_ID and CDSE_CLIENT_SECRET in the API environment to enable real Sentinel-2 imagery."
          variant="warning"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProjectMap lat={lat} lng={lng} projectName={projectName} className="h-64 rounded-xl" />
          </div>
          <EvidenceChain hasBaseline={false} hasLatest={false} analysisCount={0} />
        </div>
      </div>
    );
  }

  // State: no coordinates
  if (noCoords) {
    return (
      <div className="space-y-6">
        <StatusBanner
          icon={<MapPin className="h-5 w-5" />}
          title="No project coordinates"
          description="This project has no latitude/longitude — satellite search is not possible."
          variant="muted"
        />
        <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500">
          <MapPin className="h-8 w-8 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">Project coordinates are required for satellite imagery.</p>
        </div>
      </div>
    );
  }

  // State: no data yet
  if (!hasData && !processing) {
    return (
      <div className="space-y-6">
        <StatusBanner
          icon={<CloudOff className="h-5 w-5" />}
          title="No satellite observations yet"
          description={`${status?.message ?? 'No real Sentinel-2 observations have been ingested for this project.'}`}
          variant="muted"
        />
        <div className="flex items-center justify-between">
          <div />
          <Button
            variant="primary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={handleSync}
            isLoading={syncMutation.isPending}
          >
            Sync satellite data
          </Button>
        </div>
        <ProjectMap lat={lat} lng={lng} observation={null} projectName={projectName} className="h-64 rounded-xl" />
        <EvidenceChain hasBaseline={false} hasLatest={false} analysisCount={0} />
      </div>
    );
  }

  // Main interface
  const latestObs = observations[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {status?.observationCount ?? 0} observation{status?.observationCount !== 1 ? 's' : ''}
          </Badge>
          {status?.baseline && (
            <Badge variant="info">
              Baseline {formatDate(status.baseline.observationDate)}
            </Badge>
          )}
          {status?.latest && (
            <Badge variant="neutral">
              Latest {formatDate(status.latest.observationDate)}
            </Badge>
          )}
          {processing && (
            <Badge variant="warning">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Syncing…
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {entries.length} weekly checkpoint{entries.length !== 1 ? 's' : ''}
          </span>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={cn('h-4 w-4', syncMutation.isPending && 'animate-spin')} />}
            onClick={handleSync}
            isLoading={syncMutation.isPending}
          >
            Sync
          </Button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1" aria-label="Satellite views">
          {([
            { key: 'timemachine', label: 'Time Machine', icon: Eye },
            { key: 'observations', label: 'Observations', icon: Layers },
            { key: 'comparison', label: 'Progress Comparison', icon: BarChart2 },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                subTab === key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Time Machine view */}
      {subTab === 'timemachine' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Map */}
            <ProjectMap
              lat={lat}
              lng={lng}
              observation={selectedObservation}
              projectName={projectName}
              className="h-80 rounded-xl"
            />

            {/* Time Machine */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Project Time Machine</h3>
                  <span className="text-xs text-slate-500">Drag to explore</span>
                </div>
              </CardHeader>
              <CardBody>
                {timelineLoading ? (
                  <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
                ) : (
                  <TimeMachine
                    entries={entries}
                    selectedIndex={selectedObsIndex}
                    onSelect={setSelectedObsIndex}
                  />
                )}
              </CardBody>
            </Card>
          </div>

          <div className="space-y-4">
            {/* Selected observation */}
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">
              Selected Observation
            </div>
            <ObservationCard observation={selectedObservation} targetDate={selectedEntry?.targetDate ?? undefined} />

            {/* Baseline summary */}
            {status?.baseline && (
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Baseline</div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatDate(status.baseline.observationDate)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Cloud {status.baseline.cloudCover}%</div>
              </div>
            )}

            {/* Latest */}
            {status?.latest && (
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Latest</div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatDate(status.latest.observationDate)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Cloud {status.latest.cloudCover}%</div>
              </div>
            )}

            <EvidenceChain
              hasBaseline={!!status?.baseline}
              hasLatest={!!status?.latest}
              analysisCount={changeData?.comparisons?.length ?? 0}
            />
          </div>
        </div>
      )}

      {/* Observations list */}
      {subTab === 'observations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              All Observations ({observations.length})
            </h3>
          </div>
          {obsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : observations.length === 0 ? (
            <Card>
              <CardBody className="py-12 text-center text-slate-500">
                No observations ingested yet.
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {observations.map((obs) => (
                <ObservationCard
                  key={obs.id}
                  observation={obs}
                  variant="compact"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progress comparison */}
      {subTab === 'comparison' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProgressComparisonPanel comparison={comparison ?? null} />
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Change Analyses ({changeData?.comparisons?.length ?? 0})</h3>
            {!changeData?.comparisons?.length ? (
              <Card>
                <CardBody className="py-10 text-center text-slate-500">
                  No change analyses yet. Run a sync to generate pairwise comparisons.
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-3">
                {changeData.comparisons.slice(0, 5).map((analysis) => (
                  <Card key={analysis.id}>
                    <CardBody>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Badge variant={
                            analysis.changeClassification === 'HIGH_OBSERVABLE_CHANGE' ? 'warning'
                              : analysis.changeClassification === 'MODERATE_OBSERVABLE_CHANGE' ? 'warning'
                              : analysis.changeClassification === 'LOW_OBSERVABLE_CHANGE' ? 'info'
                              : 'neutral'
                          }>
                            {analysis.changeClassification.replace(/_/g, ' ')}
                          </Badge>
                          <div className="text-xs text-slate-500 mt-2">
                            {analysis.baselineDate && `Baseline: ${formatDate(analysis.baselineDate)}`}
                            {analysis.comparisonDate && ` → Latest: ${formatDate(analysis.comparisonDate)}`}
                          </div>
                        </div>
                        <Badge variant={
                          analysis.confidence === 'HIGH' ? 'success'
                            : analysis.confidence === 'MEDIUM' ? 'warning'
                            : 'neutral'
                        }>
                          {analysis.confidence}
                        </Badge>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBanner({
  icon,
  title,
  description,
  variant,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant: 'success' | 'warning' | 'error' | 'muted' | 'info';
}) {
  const styles: Record<string, string> = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    muted: 'bg-slate-50 border-slate-200 text-slate-700',
  };
  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-xl border', styles[variant])}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs opacity-80 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
