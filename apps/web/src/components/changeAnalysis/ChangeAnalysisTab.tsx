'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useChangeAnalyses,
  useChangeAnalysisLatest,
  useChangeAnalysis,
  useChangeAnalysisMethodology,
  useChangeAnalysisHistory,
  useRunChangeAnalysis,
  useChangeAnalysisJob,
  type RunAnalysisParams,
} from '@/hooks/useChangeAnalysis';
import { useSatelliteObservations } from '@/hooks/useSatellite';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Play, BarChart2, TrendingUp, TrendingDown, Minus,
  AlertCircle, CheckCircle2, Clock, Loader2, Info,
  ChevronDown, ChevronUp, ArrowRight, RefreshCw, Zap,
  Globe, Shield, Eye, Camera, ShieldAlert,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type {
  ChangeAnalysis,
  ChangeClassification,
  Confidence,
  ConsistencyAssessment,
  SatelliteObservation,
} from '@vojas/api-client';

interface ChangeAnalysisTabProps {
  projectId: string;
  projectName?: string;
  lat?: number | null;
  lng?: number | null;
  userRole?: string;
}

type SubTab = 'overview' | 'history' | 'run';

const CLASSIFICATION_CONFIG: Record<ChangeClassification, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info'; icon: React.ElementType }> = {
  NO_DETECTABLE_CHANGE: { label: 'No Detectable Change', variant: 'neutral', icon: Minus },
  LOW_CHANGE: { label: 'Low Observable Change', variant: 'info', icon: TrendingUp },
  MODERATE_CHANGE: { label: 'Moderate Observable Change', variant: 'warning', icon: TrendingUp },
  HIGH_CHANGE: { label: 'High Observable Change', variant: 'danger', icon: Zap },
  INCONCLUSIVE: { label: 'Inconclusive', variant: 'warning', icon: AlertCircle },
  INVALID: { label: 'Analysis Not Possible', variant: 'neutral', icon: AlertCircle },
};

const CONFIDENCE_CONFIG: Record<Confidence, { label: string; variant: 'success' | 'warning' | 'neutral' }> = {
  HIGH: { label: 'High Confidence', variant: 'success' },
  MEDIUM: { label: 'Medium Confidence', variant: 'warning' },
  LOW: { label: 'Low Confidence', variant: 'neutral' },
};

const CONSISTENCY_CONFIG: Record<ConsistencyAssessment, { label: string; variant: 'success' | 'warning' | 'neutral' | 'info'; icon: React.ElementType }> = {
  CONSISTENT: { label: 'Consistent with Reports', variant: 'success', icon: CheckCircle2 },
  POSSIBLY_INCONSISTENT: { label: 'Possibly Inconsistent', variant: 'warning', icon: ShieldAlert },
  INCONCLUSIVE: { label: 'Inconclusive', variant: 'neutral', icon: Info },
  INSUFFICIENT_DATA: { label: 'Insufficient Data', variant: 'info', icon: Info },
};

function ClassificationBadge({ classification }: { classification: ChangeClassification }) {
  const cfg = CLASSIFICATION_CONFIG[classification];
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant}>
      <Icon className="h-3 w-3 mr-1" />
      {cfg.label}
    </Badge>
  );
}

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const cfg = CONFIDENCE_CONFIG[confidence];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function ConsistencyBadge({ assessment }: { assessment: ConsistencyAssessment | null | undefined }) {
  if (!assessment) return null;
  const cfg = CONSISTENCY_CONFIG[assessment];
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant}>
      <Icon className="h-3 w-3 mr-1" />
      {cfg.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'COMPLETED': return <Badge variant="success">Completed</Badge>;
    case 'PROCESSING': return <Badge variant="warning"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
    case 'QUEUED': return <Badge variant="neutral"><Clock className="h-3 w-3 mr-1" />Queued</Badge>;
    case 'FAILED': return <Badge variant="danger">Failed</Badge>;
    default: return <Badge variant="neutral">{status}</Badge>;
  }
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, unit, note }: { label: string; value: string | number | null; unit?: string; note?: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</div>
      <div className="text-lg font-semibold text-slate-900 mt-1">
        {value ?? <span className="text-slate-400 italic text-sm">—</span>}
        {unit && value != null && <span className="text-sm font-normal text-slate-500 ml-1">{unit}</span>}
      </div>
      {note && <div className="text-[11px] text-slate-400 mt-0.5">{note}</div>}
    </div>
  );
}

// ── Confidence Factors Panel ────────────────────────────────────────────────────

function ConfidenceFactorsPanel({ factors }: { factors: ChangeAnalysis['confidenceFactors'] }) {
  if (!factors) return null;
  const items = [
    { key: 'imageQuality', label: 'Image Quality', icon: Camera },
    { key: 'geometryQuality', label: 'Geometry Quality', icon: Globe },
    { key: 'spatialCoherence', label: 'Spatial Coherence', icon: Eye },
    { key: 'seasonalityRisk', label: 'Seasonality Risk', icon: Globe },
    { key: 'resolutionSuitability', label: 'Resolution Suitability', icon: BarChart2 },
    { key: 'controlAreaComparison', label: 'Control Area', icon: Shield },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-slate-900">Confidence Factors</h3>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map(({ key, label, icon: Icon }) => {
            const level = factors[key] as Confidence;
            const cfg = CONFIDENCE_CONFIG[level];
            return (
              <div key={key} className="flex items-start gap-2">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs',
                  level === 'HIGH' ? 'bg-green-100 text-green-600' :
                  level === 'MEDIUM' ? 'bg-amber-100 text-amber-600' :
                  'bg-slate-100 text-slate-400'
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">{label}</div>
                  <Badge variant={cfg.variant} className="mt-0.5">{level}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

// ── Change Story Panel ────────────────────────────────────────────────────────

function ChangeStoryPanel({ story }: { story: string | null | undefined }) {
  if (!story) return null;
  return (
    <Card className="border-l-4 border-l-vojas-500">
      <CardBody>
        <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">
          Analysis Narrative
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{story}</p>
      </CardBody>
    </Card>
  );
}

// ── Analysis Detail ────────────────────────────────────────────────────────────

function AnalysisDetail({
  analysis,
  projectId,
}: {
  analysis: ChangeAnalysis;
  projectId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: methodology } = useChangeAnalysisMethodology(projectId, analysis.id);
  const { data: jobData } = useChangeAnalysisJob(projectId, analysis.id);

  const status = jobData?.status ?? analysis.processingStatus;

  const beforeObs = analysis.observationBefore;
  const afterObs = analysis.observationAfter;

  return (
    <Card className="border border-slate-200 hover:border-slate-300 transition-colors">
      <CardBody className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <ClassificationBadge classification={analysis.changeClassification as ChangeClassification} />
              <ConfidenceBadge confidence={analysis.confidence as Confidence} />
              <ConsistencyBadge assessment={analysis.reportedProgressComparison as ConsistencyAssessment | undefined} />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {beforeObs && <span>Before: {formatDate(beforeObs.observationDate)}</span>}
              {beforeObs && afterObs && <ArrowRight className="h-3 w-3" />}
              {afterObs && <span>After: {formatDate(afterObs.observationDate)}</span>}
              {analysis.provider && (
                <>
                  <span>·</span>
                  <span>Provider: {analysis.provider}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded hover:bg-slate-100 transition-colors"
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Quick metrics */}
        {analysis.changePercent != null && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Changed Area"
              value={analysis.changePercent != null ? `${analysis.changePercent.toFixed(1)}%` : null}
              note="of analysis zone"
            />
            {analysis.ndviDelta != null && (
              <MetricCard
                label="NDVI Δ"
                value={analysis.ndviDelta > 0 ? `+${analysis.ndviDelta.toFixed(3)}` : analysis.ndviDelta.toFixed(3)}
                note="vegetation change"
              />
            )}
            {analysis.ndbiDelta != null && (
              <MetricCard
                label="NDBI Δ"
                value={analysis.ndbiDelta > 0 ? `+${analysis.ndbiDelta.toFixed(3)}` : analysis.ndbiDelta.toFixed(3)}
                note="built-surface change"
              />
            )}
            {analysis.bsiDelta != null && (
              <MetricCard
                label="BSI Δ"
                value={analysis.bsiDelta > 0 ? `+${analysis.bsiDelta.toFixed(3)}` : analysis.bsiDelta.toFixed(3)}
                note="bare soil change"
              />
            )}
          </div>
        )}

        {/* Expanded detail */}
        {expanded && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <ChangeStoryPanel story={analysis.changeStory} />
            <ConfidenceFactorsPanel factors={analysis.confidenceFactors} />

            {/* Methodology */}
            {methodology?.methodology && (
              <Card>
                <CardHeader>
                  <h4 className="text-sm font-semibold text-slate-900">Methodology</h4>
                </CardHeader>
                <CardBody>
                  <div className="text-xs text-slate-600 leading-relaxed space-y-1">
                    {methodology.methodology.methodology.split(' | ').map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                  </div>
                  {methodology.methodology.limitations && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Limitations</div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {methodology.methodology.limitations}
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Quality metrics */}
            {(analysis.validPixelsPercent != null || analysis.cloudPercentBefore != null || analysis.cloudPercentAfter != null) && (
              <div className="grid grid-cols-3 gap-3">
                {analysis.validPixelsPercent != null && (
                  <MetricCard label="Valid Pixels" value={`${analysis.validPixelsPercent.toFixed(0)}%`} />
                )}
                {analysis.cloudPercentBefore != null && (
                  <MetricCard label="Cloud (Before)" value={`${analysis.cloudPercentBefore.toFixed(0)}%`} />
                )}
                {analysis.cloudPercentAfter != null && (
                  <MetricCard label="Cloud (After)" value={`${analysis.cloudPercentAfter.toFixed(0)}%`} />
                )}
              </div>
            )}

            {/* Progress comparison */}
            {analysis.reportedProgressComparison && (
              <Card className="bg-slate-50">
                <CardBody>
                  <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">
                    Reported vs Observable Progress
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <ConsistencyBadge assessment={analysis.reportedProgressComparison as ConsistencyAssessment | undefined} />
                    <span className="text-xs text-slate-500">
                      Satellite evidence cannot confirm construction completion percentage.
                    </span>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ── Run Analysis Panel ────────────────────────────────────────────────────────

function RunAnalysisPanel({
  projectId,
  observations,
  userRole,
}: {
  projectId: string;
  observations: SatelliteObservation[];
  userRole?: string;
}) {
  const qc = useQueryClient();
  const [beforeId, setBeforeId] = useState<string>('');
  const [afterId, setAfterId] = useState<string>('');

  const canRun = ['ADMIN', 'OFFICER', 'ANALYST'].includes(userRole ?? '');

  const runMutation = useRunChangeAnalysis(projectId);
  const { data: latestData } = useChangeAnalysisLatest(projectId);
  const latest = latestData?.analysis;

  const sortedObs = [...observations].sort(
    (a, b) => new Date(a.observationDate).getTime() - new Date(b.observationDate).getTime()
  );

  const handleRun = () => {
    if (!beforeId || !afterId) return;
    const params: RunAnalysisParams = {
      observationBeforeId: beforeId,
      observationAfterId: afterId,
    };
    runMutation.mutate(params, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['projects', projectId, 'changeAnalysis'] });
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-vojas-600" />
            <h3 className="text-sm font-semibold text-slate-900">Run Change Analysis</h3>
          </div>
          {runMutation.isPending && (
            <Badge variant="warning">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              {'Running…'}
            </Badge>
          )}
          {runMutation.isSuccess && !runMutation.isPending && (
            <Badge variant="success">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Job enqueued
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {runMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {runMutation.error?.message ?? 'Failed to trigger analysis'}
          </div>
        )}

        {latest && (
          <div className="text-xs text-slate-500">
            Latest analysis:{' '}
            <span className="font-medium text-slate-700">
              {formatDate(latest.analysisDate as unknown as string)}
            </span>{' '}
            —{' '}
            <ClassificationBadge classification={latest.changeClassification as ChangeClassification} />
            {' '}
            <ConfidenceBadge confidence={latest.confidence as Confidence} />
          </div>
        )}

        {!canRun && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            Only ADMIN, OFFICER, or ANALYST roles can run change analysis.
          </div>
        )}

        {observations.length < 2 && (
          <div className="text-sm text-slate-500">
            At least 2 satellite observations are needed to run a change analysis.
          </div>
        )}

        {observations.length >= 2 && canRun && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Before (baseline) observation
                </label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500 focus:border-vojas-500"
                  value={beforeId}
                  onChange={(e) => setBeforeId(e.target.value)}
                >
                  <option value="">Select baseline…</option>
                  {sortedObs.map((obs) => (
                    <option key={obs.id} value={obs.id}>
                      {new Date(obs.observationDate).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                      {' '} — {obs.satellite} {obs.cloudCover != null ? `(cloud: ${obs.cloudCover}%)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  After (comparison) observation
                </label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500 focus:border-vojas-500"
                  value={afterId}
                  onChange={(e) => setAfterId(e.target.value)}
                >
                  <option value="">Select comparison…</option>
                  {sortedObs.map((obs) => (
                    <option key={obs.id} value={obs.id}>
                      {new Date(obs.observationDate).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                      {' '} — {obs.satellite} {obs.cloudCover != null ? `(cloud: ${obs.cloudCover}%)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Play className="h-4 w-4" />}
              onClick={handleRun}
              isLoading={runMutation.isPending}
              disabled={!beforeId || !afterId}
            >
              Run Change Analysis
            </Button>

            {beforeId && afterId && (
              <p className="text-xs text-slate-500">
                Analysis will use the selected observations to compute spectral index changes
                (NDVI, NDBI, BSI) with confidence factors and false-positive controls.
              </p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function ChangeAnalysisTab({ projectId, userRole }: ChangeAnalysisTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('overview');

  const { data: analysesData, isLoading: analysesLoading } = useChangeAnalyses(projectId);
  const { data: latestData } = useChangeAnalysisLatest(projectId);
  const { data: obsData } = useSatelliteObservations(projectId);

  const analyses = analysesData?.analyses ?? [];
  const latest = latestData?.analysis;
  const observations = obsData?.observations ?? [];

  const completedAnalyses = analyses.filter((a) => a.processingStatus === 'COMPLETED');
  const runningAnalyses = analyses.filter((a) => a.processingStatus === 'QUEUED' || a.processingStatus === 'PROCESSING');

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1" aria-label="Change Analysis views">
          {([
            { key: 'overview', label: 'Overview', icon: BarChart2 },
            { key: 'history', label: 'Analysis History', icon: Clock },
            { key: 'run', label: 'Run Analysis', icon: Play },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                subTab === key
                  ? 'border-vojas-600 text-vojas-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {key === 'history' && completedAnalyses.length > 0 && (
                <span className="bg-slate-200 text-slate-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                  {completedAnalyses.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview tab */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {analysesLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !latest ? (
            <div className="bg-slate-50 rounded-xl p-8 text-center">
              <BarChart2 className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">No change analysis yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Run an analysis to see observable physical changes at this project location.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                leftIcon={<Play className="h-4 w-4" />}
                onClick={() => setSubTab('run')}
              >
                Run first analysis
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {runningAnalyses.length > 0 && (
                <div className="space-y-3">
                  {runningAnalyses.map((a) => (
                    <Card key={a.id} className="border-amber-200 bg-amber-50/30">
                      <CardBody className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                          <span className="text-sm font-medium text-amber-700">
                            Analysis in progress…
                          </span>
                        </div>
                        <StatusBadge status={a.processingStatus} />
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}

              {latest && (
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">
                    Most Recent Analysis — {formatDate(latest.analysisDate as unknown as string)}
                  </div>
                  <AnalysisDetail analysis={latest} projectId={projectId} />
                </div>
              )}

              {completedAnalyses.length > 1 && (
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">
                    Previous Analyses ({completedAnalyses.length - 1} more)
                  </div>
                  <div className="space-y-3">
                    {completedAnalyses.slice(1, 5).map((a) => (
                      <AnalysisDetail key={a.id} analysis={a} projectId={projectId} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {subTab === 'history' && (
        <div className="space-y-4">
          {analysesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : analyses.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-8 text-center">
              <Clock className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">No analyses run yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Change analyses will appear here after running.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {analyses.map((a) => (
                <AnalysisDetail key={a.id} analysis={a} projectId={projectId} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Run Analysis tab */}
      {subTab === 'run' && (
        <div className="max-w-2xl space-y-6">
          <RunAnalysisPanel
            projectId={projectId}
            observations={observations}
            userRole={userRole}
          />

          {observations.length >= 2 && (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">
                Available Observations ({observations.length})
              </div>
              <div className="space-y-2">
                {[...observations]
                  .sort((a, b) => new Date(b.observationDate).getTime() - new Date(a.observationDate).getTime())
                  .map((obs) => (
                    <div key={obs.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Camera className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {formatDate(obs.observationDate)}
                        </span>
                        <span className="text-xs text-slate-400">{obs.satellite}</span>
                      </div>
                      {obs.cloudCover != null && (
                        <span className="text-xs text-slate-400">Cloud: {obs.cloudCover}%</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
