'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, AlertCircle, Loader2, CloudOff,
  RefreshCw, Layers, ArrowRight, Info, ChevronRight, ExternalLink, CheckCircle2,
} from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import { useSatelliteStatus, useSatelliteTimeline, useSatelliteObservations, useProgressComparison, useTriggerSatelliteSync } from '@/hooks/useSatellite';
import { TimeMachineProvider, useTimeMachine } from '@/components/time-machine/TimeMachineContext';
import { TimeMachineMap } from '@/components/time-machine/TimeMachineMap';
import { TimeMachineTimeline } from '@/components/time-machine/TimeMachineTimeline';
import { ObservationDrawer } from '@/components/time-machine/TimeMachineDrawer';
import { TimeMachineControls } from '@/components/time-machine/TimeMachineControls';
import { TemporalProjectCard } from '@/components/time-machine/TemporalProjectCard';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import type { SatelliteObservation, TimelineEntry } from '@vojas/api-client';

export default function TimeMachinePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  return (
    <TimeMachineProvider>
      <TimeMachinePageInner projectId={projectId} />
    </TimeMachineProvider>
  );
}

function TimeMachinePageInner({ projectId }: { projectId: string }) {
  const router = useRouter();
  const {
    selectedObservationId, setSelectedObservationId,
    beforeObservationId, setBeforeObservationId,
    mode, playbackState,
  } = useTimeMachine();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [opacity, setOpacity] = useState(50);
  const [swipePosition, setSwipePosition] = useState(50);
  const [showChangeLayer, setShowChangeLayer] = useState(false);
  const [showFootprint, setShowFootprint] = useState(true);

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: status, isLoading: statusLoading } = useSatelliteStatus(projectId);
  const { data: timelineData, isLoading: timelineLoading } = useSatelliteTimeline(projectId);
  const { data: obsData, isLoading: obsLoading } = useSatelliteObservations(projectId);
  const { data: comparison } = useProgressComparison(projectId);
  const syncMutation = useTriggerSatelliteSync(projectId);

  const entries: TimelineEntry[] = timelineData?.entries ?? [];
  const observations: SatelliteObservation[] = obsData?.observations ?? [];

  // ── Derived selections ────────────────────────────────────────────────────────
  const selectedObservation = useMemo(
    () => observations.find((o) => o.id === selectedObservationId) ?? null,
    [observations, selectedObservationId],
  );

  const beforeObservation = useMemo(
    () => observations.find((o) => o.id === beforeObservationId) ?? null,
    [observations, beforeObservationId],
  );

  const selectedEntry = useMemo(
    () => {
      if (!selectedObservationId) return null;
      return entries.find((e) => e.observationId === selectedObservationId) ?? null;
    },
    [entries, selectedObservationId],
  );

  // When an observation is selected from the timeline, it becomes the "before" baseline
  const handleSelectObservation = useCallback((obsId: string) => {
    setSelectedObservationId(obsId);
    // If no "before" is set yet, set the baseline (earliest observation)
    if (!beforeObservationId) {
      const earliest = [...observations]
        .sort((a, b) => new Date(a.observationDate).getTime() - new Date(b.observationDate).getTime())[0];
      if (earliest && earliest.id !== obsId) {
        setBeforeObservationId(earliest.id);
      }
    }
    setDrawerOpen(true);
  }, [observations, beforeObservationId, setSelectedObservationId, setBeforeObservationId]);

  const handleClearBefore = useCallback(() => {
    setBeforeObservationId(null);
    setShowChangeLayer(false);
  }, [setBeforeObservationId]);

  // Auto-select the latest observation on mount if none selected
  useEffect(() => {
    if (observations.length > 0 && !selectedObservationId) {
      const latest = observations[0];
      setSelectedObservationId(latest.id);
      // Also set earliest as the before baseline
      const earliest = [...observations]
        .sort((a, b) => new Date(a.observationDate).getTime() - new Date(b.observationDate).getTime())[0];
      if (earliest && earliest.id !== latest.id) {
        setBeforeObservationId(earliest.id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observations.length > 0]);

  // When timeline entry without a valid observation is selected, find nearest obs
  const handleSelectEntry = useCallback((entry: TimelineEntry) => {
    if (entry.observationId) {
      handleSelectObservation(entry.observationId);
      return;
    }
    // No observation: show drawer in "no data" state
    setSelectedObservationId(null);
    setDrawerOpen(true);
  }, [handleSelectObservation]);

  // ── Handle sync ────────────────────────────────────────────────────────────────
  const handleSync = () => {
    if (confirm('Trigger a satellite sync for this project? This will search for real Sentinel-2 observations and generate weekly checkpoints.')) {
      syncMutation.mutate();
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (projectLoading || (statusLoading && !status)) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push('/projects')}>
          Back
        </Button>
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          Project not found.
        </div>
      </div>
    );
  }

  const notConfigured = status?.providerStatus === 'NOT_CONFIGURED';
  const noCoords = status?.reason === 'NO_COORDINATES';
  const processing = status?.processingStatus === 'PROCESSING';
  const hasData = (status?.observationCount ?? 0) > 0;
  const lat = project.latitude ?? 0;
  const lng = project.longitude ?? 0;

  // ── Error states ───────────────────────────────────────────────────────────────
  if (notConfigured || noCoords) {
    return (
      <div className="space-y-4">
        <StatusBanner
          icon={notConfigured ? <AlertCircle className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
          title={notConfigured ? 'Satellite provider not configured' : 'No project coordinates'}
          description={notConfigured
            ? 'Set CDSE_CLIENT_ID and CDSE_CLIENT_SECRET in the API environment to enable real Sentinel-2 imagery.'
            : 'This project has no latitude/longitude — satellite search is not possible.'}
          variant="warning"
        />
        <div className="flex justify-end">
          <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push(`/projects/${projectId}`)}>
            Back to project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push(`/projects/${projectId}`)}>
            Back
          </Button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{project.name}</h1>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>Time Machine</span>
              {project.district && <><span>·</span><span>{project.district}, {project.state}</span></>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {status?.observationCount != null && (
            <Badge variant={status.observationCount > 0 ? 'success' : 'neutral'}>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {status.observationCount} observation{status.observationCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {processing && (
            <Badge variant="warning">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Syncing…
            </Badge>
          )}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={cn('h-4 w-4', syncMutation.isPending && 'animate-spin')} />}
            onClick={handleSync}
            isLoading={syncMutation.isPending}
          >
            Sync
          </Button>
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-4 w-4" />}>
              Full project
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Main layout: map + sidebar ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Left: map + controls */}
        <div className="xl:col-span-3 space-y-4">
          {/* Full-width map */}
          <div className="h-[460px] rounded-xl overflow-hidden shadow-sm border border-slate-200">
            {hasData || processing ? (
              <TimeMachineMap
                lat={lat}
                lng={lng}
                observations={observations}
                beforeObservation={beforeObservation}
                selectedObservation={selectedObservation}
                projectName={project.name}
                mode={mode}
                opacity={opacity}
                swipePosition={swipePosition}
                showChangeLayer={showChangeLayer}
                showFootprint={showFootprint}
              />
            ) : (
              <NoDataMapState lat={lat} lng={lng} onSync={handleSync} syncPending={syncMutation.isPending} />
            )}
          </div>

          {/* Comparison controls */}
          {hasData && (
            <TimeMachineControls
              hasBefore={!!beforeObservation}
              onClearBefore={handleClearBefore}
              opacity={opacity}
              onOpacityChange={setOpacity}
              swipePosition={swipePosition}
              onSwipePositionChange={setSwipePosition}
              showChangeLayer={showChangeLayer}
              onToggleChange={() => setShowChangeLayer((v) => !v)}
              showFootprint={showFootprint}
              onToggleFootprint={() => setShowFootprint((v) => !v)}
            />
          )}

          {/* Timeline */}
          {hasData && (
            timelineLoading ? (
              <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" />
            ) : (
              <TimeMachineTimeline
                entries={entries}
                observations={observations}
                onSelectObservation={handleSelectObservation}
              />
            )
          )}
        </div>

        {/* Right: temporal project card + observation drawer */}
        <div className="xl:col-span-1 space-y-4">
          {project && (
            <TemporalProjectCard
              project={{
                name: project.name,
                status: project.status ?? 'UNKNOWN',
                state: project.state ?? undefined,
                district: project.district ?? undefined,
                sector: project.sector ?? undefined,
                sanctionedAmount: project.sanctionedAmount ?? undefined,
                spentAmount: project.spentAmount ?? undefined,
                startDate: project.startDate ?? undefined,
                endDate: project.endDate ?? undefined,
                description: project.description ?? undefined,
              }}
              selectedObservation={selectedObservation}
              selectedEntry={selectedEntry}
              baseline={status?.baseline ?? null}
              latest={status?.latest ?? null}
              totalObservations={status?.observationCount ?? 0}
            />
          )}

          {/* View details button */}
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            leftIcon={<Layers className="h-4 w-4" />}
            onClick={() => setDrawerOpen(true)}
          >
            View observation details
          </Button>

          {/* Progress comparison */}
          {comparison && (
            <ProgressCard comparison={comparison} />
          )}

          {/* Quick links */}
          <div className="flex flex-col gap-1.5">
            <Link href={`/projects/${projectId}`} className="block">
              <Button variant="ghost" size="sm" className="w-full justify-between">
                Full project detail <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {selectedObservation?.sourceUrl && (
              <a
                href={selectedObservation.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  View source <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Observation drawer (full right panel on mobile, side sheet on desktop) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl overflow-y-auto">
            <ObservationDrawer
              observation={selectedObservation}
              beforeObservation={beforeObservation}
              targetDate={selectedEntry?.targetDate ?? undefined}
              comparison={comparison ?? undefined}
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}
      {drawerOpen && (
        <div
          className="hidden xl:block fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 overflow-y-auto"
          style={{ marginTop: '64px' }}
        >
          <ObservationDrawer
            observation={selectedObservation}
            beforeObservation={beforeObservation}
            targetDate={selectedEntry?.targetDate ?? undefined}
            comparison={comparison ?? undefined}
            onClose={() => setDrawerOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

function NoDataMapState({ lat, lng, onSync, syncPending }: { lat: number; lng: number; onSync: () => void; syncPending: boolean }) {
  return (
    <div className="relative w-full h-full bg-slate-900 flex flex-col items-center justify-center gap-4">
      <div className="absolute inset-0 opacity-30">
        {/* Simple coordinate display fallback */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium text-slate-300">{lat.toFixed(5)}°N, {lng.toFixed(5)}°E</p>
            <p className="text-xs text-slate-500 mt-1">No satellite observations ingested yet</p>
          </div>
        </div>
      </div>
      <div className="relative z-10 text-center">
        <CloudOff className="h-10 w-10 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-300 text-sm font-semibold mb-1">No satellite observations yet</p>
        <p className="text-slate-500 text-xs mb-4 max-w-xs">
          Run a sync to ingest real Sentinel-2 imagery for this project.
        </p>
        <Button variant="primary" size="sm" leftIcon={<RefreshCw className={cn('h-4 w-4', syncPending && 'animate-spin')} />} onClick={onSync} isLoading={syncPending}>
          Sync satellite data
        </Button>
      </div>
    </div>
  );
}

function StatusBanner({
  icon, title, description, variant,
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

function ProgressCard({ comparison }: {
  comparison: {
    status: string;
    reportedProgress: number;
    changeClassification: string;
    confidence: string;
    evidence: string;
  };
}) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" /> Progress Assessment
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Reported progress</span>
          <span className="text-sm font-bold text-slate-900">{comparison.reportedProgress}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Satellite change</span>
          <Badge variant={
            comparison.changeClassification === 'HIGH_OBSERVABLE_CHANGE' ? 'danger'
              : comparison.changeClassification === 'MODERATE_OBSERVABLE_CHANGE' ? 'warning'
              : comparison.changeClassification === 'LOW_OBSERVABLE_CHANGE' ? 'info'
              : 'neutral'
          }>
            {comparison.changeClassification.replace(/_/g, ' ')}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Confidence</span>
          <Badge variant={
            comparison.confidence === 'HIGH' ? 'success'
              : comparison.confidence === 'MEDIUM' ? 'warning'
              : 'neutral'
          }>
            {comparison.confidence}
          </Badge>
        </div>
        <div className="pt-2 border-t border-slate-100">
          <Badge variant={
            comparison.status === 'CONSISTENT' ? 'success'
              : comparison.status === 'POSSIBLY_INCONSISTENT' ? 'warning'
              : comparison.status === 'INCONCLUSIVE' ? 'info'
              : 'neutral'
          }>
            {comparison.status.replace(/_/g, ' ')}
          </Badge>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">{comparison.evidence}</p>
      </CardBody>
    </Card>
  );
}
