'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Satellite,
  MapPin,
  Calendar,
  Cloud,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Info,
  Clock,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProjectMap } from '@/components/satellite/SatelliteMap';
import { BeforeAfterComparison } from '@/components/satellite/BeforeAfterComparison';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { SatelliteObservation, SatelliteStatus, SatelliteAnalysis, ProgressComparison } from '@vojas/api-client';

interface SatelliteEvidenceSectionProps {
  projectId: string;
  lat: number | null;
  lng: number | null;
  projectName: string;
  status: SatelliteStatus | null;
  observations: SatelliteObservation[];
  analyses?: SatelliteAnalysis[];
  comparison?: ProgressComparison | null;
  approvedAmount?: number | null;
  spentAmount?: number | null;
  projectStatus?: string | null;
  startDate?: string | null;
  expectedEndDate?: string | null;
}

function formatObsDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Date not available in source data.';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Date not available in source data.';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Date not available in source data.';
  }
}

export function SatelliteEvidenceSection({
  projectId,
  lat,
  lng,
  projectName,
  status,
  observations = [],
  analyses = [],
  comparison,
  approvedAmount = 0,
  spentAmount = 0,
  projectStatus = 'UNKNOWN',
  startDate,
  expectedEndDate,
}: SatelliteEvidenceSectionProps) {
  // Chronologically sorted observations (oldest to newest for timeline & time-lapse)
  const sortedObs = useMemo(() => {
    return [...observations].sort(
      (a, b) => new Date(a.observationDate).getTime() - new Date(b.observationDate).getTime()
    );
  }, [observations]);

  // Selected observation index for map, timeline, and detail inspection
  const [selectedObsIndex, setSelectedObsIndex] = useState<number>(() =>
    sortedObs.length > 0 ? sortedObs.length - 1 : 0
  );

  // Time-lapse playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2>(1);

  // Auto-step time-lapse loop
  useEffect(() => {
    if (!isPlaying || sortedObs.length <= 1) return;
    const intervalMs = playbackSpeed === 1 ? 1600 : 800;
    const timer = setInterval(() => {
      setSelectedObsIndex((prev) => (prev + 1) % sortedObs.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, sortedObs.length]);

  // Keep index in bounds if observations change
  useEffect(() => {
    if (sortedObs.length > 0 && selectedObsIndex >= sortedObs.length) {
      setSelectedObsIndex(sortedObs.length - 1);
    }
  }, [sortedObs.length, selectedObsIndex]);

  const selectedObs: SatelliteObservation | null = sortedObs[selectedObsIndex] ?? null;
  const obsCount = sortedObs.length;
  const hasCoords = lat != null && lng != null;

  // Group observations by Year for visual temporal structure
  const observationsByYear = useMemo(() => {
    const groups: Record<number, { obs: SatelliteObservation; originalIndex: number }[]> = {};
    sortedObs.forEach((obs, idx) => {
      const yr = new Date(obs.observationDate).getFullYear();
      if (!groups[yr]) groups[yr] = [];
      groups[yr].push({ obs, originalIndex: idx });
    });
    return groups;
  }, [sortedObs]);

  const years = useMemo(() => Object.keys(observationsByYear).map(Number).sort((a, b) => a - b), [observationsByYear]);

  // Stepper controls
  const handlePrev = useCallback(() => {
    if (sortedObs.length <= 1) return;
    setSelectedObsIndex((prev) => (prev === 0 ? sortedObs.length - 1 : prev - 1));
  }, [sortedObs.length]);

  const handleNext = useCallback(() => {
    if (sortedObs.length <= 1) return;
    setSelectedObsIndex((prev) => (prev + 1) % sortedObs.length);
  }, [sortedObs.length]);

  // Government-Reported Physical/Financial Progress Calculation
  const approved = approvedAmount ?? 0;
  const spent = spentAmount ?? 0;
  const financialProgressPct = approved > 0 ? Math.min(100, Math.round((spent / approved) * 100)) : 0;
  const reportedProgressPct = comparison?.reportedProgress ?? financialProgressPct;

  // Observable progress classification
  const latestAnalysis = analyses[0] ?? null;
  const observableClassification = latestAnalysis?.changeClassification ?? 'PENDING_ANALYSIS';
  const analysisConfidence = latestAnalysis?.confidence ?? comparison?.confidence ?? 'MEDIUM';

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 text-white border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Satellite className="h-5 w-5 text-purple-400" />
            <h3 className="text-base font-bold text-white tracking-tight">Sentinel-2 Satellite Verification</h3>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Multispectral earth observation from the European Space Agency (ESA) Copernicus Sentinel-2 constellation (10m resolution).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasCoords && (
            <span className="text-xs font-mono bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-slate-300">
              {lat?.toFixed(4)}° N, {lng?.toFixed(4)}° E
            </span>
          )}
          <Badge variant={obsCount > 0 ? 'success' : 'neutral'}>
            {obsCount} {obsCount === 1 ? 'Observation' : 'Observations'}
          </Badge>
        </div>
      </div>

      {/* 2. Interactive Map & Temporal Timeline Synchronization */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 bg-white border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              Site Inspection Map
              {selectedObs && (
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {formatObsDate(selectedObs.observationDate)}
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-500">
              High-resolution basemap centered at official project coordinates. Map and metadata synchronize with the timeline.
            </p>
          </div>
          {hasCoords && (
            <Link
              href={`/explore/map?focus=${projectId}`}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              Full Screen Map
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </CardHeader>

        <CardBody className="p-0 relative">
          {hasCoords ? (
            <div className="h-88 w-full relative">
              <ProjectMap
                lat={lat!}
                lng={lng!}
                projectName={projectName}
                observation={selectedObs}
                className="h-full w-full"
              />

              {/* Synchronized Floating Map HUD Chip */}
              <div className="absolute top-3 left-3 z-10 pointer-events-none">
                {selectedObs ? (
                  <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-2 rounded-xl text-xs font-mono border border-slate-700/80 shadow-lg flex items-center gap-2.5 pointer-events-auto">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>🛰️ {selectedObs.satellite || 'Sentinel-2'}</span>
                        <span className="text-slate-400 font-normal">·</span>
                        <span>{formatObsDate(selectedObs.observationDate)}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-sans mt-0.5 flex items-center gap-2">
                        <span>Cloud: {selectedObs.cloudCover?.toFixed(1) ?? 0}%</span>
                        <span>•</span>
                        <span>10m MSI Optical</span>
                        <span>•</span>
                        <span className={cn(selectedObs.quality === 'USABLE' ? 'text-emerald-400' : 'text-amber-400')}>
                          {selectedObs.quality}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-mono border border-slate-700 shadow-md flex items-center gap-2 pointer-events-auto">
                    <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                    <span>10m Sentinel-2 Scale Basemap</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 bg-slate-50">
              <MapPin className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">Coordinates not recorded</p>
              <p className="text-xs text-slate-400 mt-1">
                Official source records do not contain verified latitude and longitude for this project.
              </p>
            </div>
          )}

          {/* Temporal Satellite Timeline Controller */}
          <div className="p-4 bg-slate-900 text-white border-t border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Temporal Satellite Timeline
                </span>
                <span className="text-[11px] text-slate-400">
                  ({obsCount} available pass{obsCount !== 1 ? 'es' : ''})
                </span>
              </div>

              {/* Time-lapse Playback Controls */}
              {obsCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                    <button
                      onClick={handlePrev}
                      disabled={obsCount <= 1}
                      className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                      title="Previous observation"
                      aria-label="Previous observation"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      disabled={obsCount <= 1}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all',
                        isPlaying
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      )}
                      title={isPlaying ? 'Pause time-lapse' : 'Play time-lapse'}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-3.5 w-3.5 fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Play Time-lapse</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleNext}
                      disabled={obsCount <= 1}
                      className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                      title="Next observation"
                      aria-label="Next observation"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Playback speed toggle */}
                  <button
                    onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : 1))}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-300 transition-colors"
                    title="Toggle playback speed"
                  >
                    {playbackSpeed}x
                  </button>
                </div>
              )}
            </div>

            {/* Timeline Year & Observation Nodes */}
            {obsCount > 0 ? (
              <div className="pt-2 overflow-x-auto pb-1">
                <div className="flex items-start gap-6 min-w-max">
                  {years.map((year) => (
                    <div key={year} className="space-y-1.5">
                      <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider pl-1">
                        {year}
                      </div>
                      <div className="flex items-center gap-2">
                        {observationsByYear[year]?.map(({ obs, originalIndex }) => {
                          const isSelected = originalIndex === selectedObsIndex;
                          const cloud = obs.cloudCover ?? 0;
                          return (
                            <button
                              key={obs.id}
                              onClick={() => {
                                setIsPlaying(false);
                                setSelectedObsIndex(originalIndex);
                              }}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left border',
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-400 shadow-md ring-2 ring-purple-400/40 scale-105'
                                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                              )}
                            >
                              <span
                                className={cn(
                                  'w-2 h-2 rounded-full shrink-0',
                                  cloud < 10
                                    ? 'bg-emerald-400'
                                    : cloud < 30
                                    ? 'bg-amber-400'
                                    : 'bg-rose-400'
                                )}
                                title={`Cloud coverage: ${cloud.toFixed(1)}%`}
                              />
                              <span className="font-mono">{formatObsDate(obs.observationDate).slice(0, 6)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center bg-slate-800/60 rounded-xl border border-dashed border-slate-700 px-4">
                <p className="text-xs text-slate-300 font-medium">
                  {status?.message || 'No Sentinel-2 observation passes have been ingested for this project area.'}
                </p>
                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 mt-2">
                  <span>Project Start: {startDate ? formatDate(startDate) : 'Not recorded'}</span>
                  <span>•</span>
                  <span>Target: {expectedEndDate ? formatDate(expectedEndDate) : 'Not recorded'}</span>
                  <span>•</span>
                  <span>Status: {(projectStatus || 'UNKNOWN').replace(/_/g, ' ')}</span>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* 3. SATELLITE EVIDENCE INFORMATION PANEL (PRIORITY 3) */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Satellite Scene &amp; Sensor Intelligence
            </h4>
            <span className="text-xs font-mono text-slate-500">Copernicus Sentinel-2 Level-2A</span>
          </div>
        </CardHeader>
        <CardBody className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <EvidenceInfoCell
              label="Platform / Satellite"
              value={selectedObs?.satellite || 'Sentinel-2 (ESA)'}
              subvalue="Sun-synchronous orbit (786 km)"
            />
            <EvidenceInfoCell
              label="Sensor / Instrument"
              value={selectedObs?.sensor || 'MSI (Multispectral)'}
              subvalue="13 spectral bands (VNIR/SWIR)"
            />
            <EvidenceInfoCell
              label="Ground Resolution"
              value={selectedObs ? `${selectedObs.resolution}m / pixel` : '10m GSD'}
              subvalue="Optical Red, Green, Blue, NIR"
            />
            <EvidenceInfoCell
              label="Acquisition Timestamp"
              value={selectedObs ? formatObsDate(selectedObs.observationDate) : 'Unavailable'}
              subvalue={selectedObs?.sceneId ? selectedObs.sceneId.slice(0, 24) : 'Pending scene pass'}
            />
            <EvidenceInfoCell
              label="Scene Cloud Cover"
              value={selectedObs ? `${selectedObs.cloudCover.toFixed(1)}%` : 'Unavailable'}
              badge={
                selectedObs
                  ? selectedObs.cloudCover < 15
                    ? { text: 'CLEAR', variant: 'success' }
                    : selectedObs.cloudCover < 35
                    ? { text: 'PARTIAL', variant: 'warning' }
                    : { text: 'CLOUDY', variant: 'neutral' }
                  : undefined
              }
            />
            <EvidenceInfoCell
              label="Quality Classification"
              value={selectedObs?.quality || (status?.providerStatus === 'CONFIGURED' ? 'PENDING_SEARCH' : 'AUTHENTICATION_REQUIRED')}
              badge={selectedObs?.quality === 'USABLE' ? { text: 'USABLE', variant: 'success' } : undefined}
            />
            <EvidenceInfoCell
              label="Area of Interest (AOI)"
              value={hasCoords ? `${lat?.toFixed(4)}°, ${lng?.toFixed(4)}°` : 'Coordinates missing'}
              subvalue="District centroid buffer ~250m"
            />
            <EvidenceInfoCell
              label="Spectral Change Proxy"
              value={selectedObs?.ndvi != null ? `NDVI: ${selectedObs.ndvi.toFixed(3)}` : 'Surface Reflectance'}
              subvalue={selectedObs?.ndbi != null ? `NDBI: ${selectedObs.ndbi.toFixed(3)}` : 'Standard L2A reflectance'}
            />
          </div>
        </CardBody>
      </Card>

      {/* 4. TEMPORAL PROGRESS VISUALIZATION (PRIORITY 5) */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Gauge className="h-4 w-4 text-purple-600" />
                Physical Progress vs. Satellite Observable Evidence
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparing government-reported milestones against optical earth observation evidence indicators.
              </p>
            </div>
            <Badge variant={financialProgressPct >= 80 ? 'success' : 'neutral'}>
              {(projectStatus || 'UNKNOWN').replace(/_/g, ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardBody className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Government Reported Physical/Financial Progress Card */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-blue-900">
                  1. Government-Reported Progress
                </span>
                <span className="text-xs font-mono font-bold text-blue-700">Official Ledger</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{reportedProgressPct}%</span>
                <span className="text-xs text-slate-500">recorded completion progress</span>
              </div>

              {/* Progress Bar */}
              <div className="h-2.5 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, reportedProgressPct))}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-slate-600 pt-1 border-t border-blue-100">
                <span>Sanctioned: {formatCurrency(approved)}</span>
                <span>Spent: {formatCurrency(spent)}</span>
              </div>
            </div>

            {/* Satellite Observed Evidence Indicator Card */}
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-purple-900">
                  2. Satellite Observable Evidence
                </span>
                <Badge
                  variant={
                    observableClassification.includes('HIGH')
                      ? 'success'
                      : observableClassification.includes('MODERATE')
                      ? 'info'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {analysisConfidence} CONFIDENCE
                </Badge>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {observableClassification.replace(/_/g, ' ')}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {analyses.length > 0
                  ? `Derived from ${analyses.length} multi-temporal Sentinel-2 spectral difference pass${
                      analyses.length !== 1 ? 'es' : ''
                    }.`
                  : obsCount >= 2
                  ? `Based on ${obsCount} verified Sentinel-2 passes available across project timeline.`
                  : 'Awaiting second observation pass to calculate multi-temporal difference metrics.'}
              </p>

              <div className="flex justify-between text-xs text-purple-800 font-medium pt-1 border-t border-purple-100">
                <span>Sensor: 10m Sentinel-2 MSI</span>
                <span>Method: Spectral Reflectance Proxy</span>
              </div>
            </div>
          </div>

          {/* Potential Discrepancy Evaluation Callout */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-900 block">Civic Verification Standard:</span>
              <p className="leading-relaxed">
                Satellite earth observation measures physical land clearance, structural slabs, and spectral ground changes.
                A divergence between reported spending ({reportedProgressPct}%) and observable change ({observableClassification.replace(/_/g, ' ')}) indicates a <strong>potential discrepancy requiring field inspection</strong>, not proof of financial wrongdoing. Subsurface works, plumbing, and interior equipment do not alter optical satellite reflectance.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 5. BEFORE / AFTER TEMPORAL COMPARISON (PRIORITY 2) */}
      <BeforeAfterComparison
        baselineObservation={sortedObs[0] ?? null}
        latestObservation={sortedObs[sortedObs.length - 1] ?? null}
        customObservations={sortedObs}
      />

      {/* 6. Physical Capabilities & Limits */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
        <h5 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
          Sentinel-2 (10m) Earth Observation Capabilities &amp; Limits
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed">
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <strong className="text-emerald-700 block mb-1">✓ What Sentinel-2 (10m) Detects:</strong>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
              <li>Ground breaking, soil clearance, and raw corridor excavation</li>
              <li>New structural roof slabs and substantial building footprints</li>
              <li>Surface spectral changes (bitumen asphalt paving, concrete)</li>
              <li>Multi-year vegetation cover shifts (NDVI increase/decrease)</li>
            </ul>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <strong className="text-rose-700 block mb-1">✗ What Satellite Cannot Detect:</strong>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
              <li>Underground pipeline laying, depth, or joint sealing integrity</li>
              <li>Drinking water potability, pipeline water pressure, or valve operation</li>
              <li>Contractor financial ledger inflation, kickbacks, or fake vouchers</li>
              <li>Interior electrical wiring, furniture, or medical equipment</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceInfoCell({
  label,
  value,
  subvalue,
  badge,
}: {
  label: string;
  value: string;
  subvalue?: string;
  badge?: { text: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' };
}) {
  return (
    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
      <span className="text-[10px] text-slate-400 uppercase font-semibold block tracking-wide truncate">
        {label}
      </span>
      <div className="flex items-center gap-1.5 justify-between">
        <span className="text-xs font-bold text-slate-900 truncate">{value}</span>
        {badge && (
          <Badge variant={badge.variant} size="sm" className="text-[9px] px-1.5 py-0 shrink-0">
            {badge.text}
          </Badge>
        )}
      </div>
      {subvalue && <p className="text-[10px] text-slate-500 truncate">{subvalue}</p>}
    </div>
  );
}
