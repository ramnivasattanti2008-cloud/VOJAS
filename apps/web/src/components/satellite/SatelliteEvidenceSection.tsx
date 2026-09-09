'use client';

import { useState } from 'react';
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
  HelpCircle,
  Maximize2,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProjectMap } from '@/components/satellite/SatelliteMap';
import { cn } from '@/lib/utils';
import type { SatelliteObservation, SatelliteStatus, SatelliteAnalysis } from '@vojas/api-client';

interface SatelliteEvidenceSectionProps {
  projectId: string;
  lat: number | null;
  lng: number | null;
  projectName: string;
  status: SatelliteStatus | null;
  observations: SatelliteObservation[];
  analyses?: SatelliteAnalysis[];
}

function formatObsDate(dateStr: string | null): string {
  if (!dateStr) return 'Date not available in source data.';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Date not available in source data.';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).toUpperCase();
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
}: SatelliteEvidenceSectionProps) {
  const [selectedObs, setSelectedObs] = useState<SatelliteObservation | null>(observations[0] ?? null);

  const obsCount = observations.length;
  const hasCoords = lat != null && lng != null;

  // Before / After pair (chronological: oldest = before, newest = after)
  const sortedObs = [...observations].sort(
    (a, b) => new Date(a.observationDate).getTime() - new Date(b.observationDate).getTime()
  );
  const beforeObs = sortedObs.length >= 2 ? sortedObs[0] : null;
  const afterObs = sortedObs.length >= 2 ? sortedObs[sortedObs.length - 1] : null;
  const singleObs = sortedObs.length === 1 ? sortedObs[0] : null;

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

      {/* 2. Interactive Map */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800">Geographic Site Inspection</h4>
            <p className="text-xs text-slate-500">
              High-resolution optical raster basemap centered at official project coordinates.
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
        <CardBody className="p-0 overflow-hidden rounded-b-xl">
          {hasCoords ? (
            <div className="h-80 w-full relative">
              <ProjectMap
                lat={lat!}
                lng={lng!}
                projectName={projectName}
                observation={selectedObs}
                className="h-full w-full"
              />
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
        </CardBody>
      </Card>

      {/* 3. BEFORE / AFTER COMPARISON LOGIC */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Temporal Physical Evidence (Before / After)
            </h4>
            <span className="text-xs text-slate-400 font-medium">Copernicus Sentinel-2</span>
          </div>
        </CardHeader>
        <CardBody>
          {/* CASE A: TWO OR MORE OBSERVATIONS EXIST */}
          {sortedObs.length >= 2 && beforeObs && afterObs && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* BEFORE CARD */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded bg-slate-800 text-white">
                      BEFORE: {formatObsDate(beforeObs.observationDate)}
                    </span>
                    <Badge variant={beforeObs.quality === 'USABLE' ? 'success' : 'neutral'} size="sm">
                      {beforeObs.quality}
                    </Badge>
                  </div>

                  <div className="aspect-video bg-black rounded-lg overflow-hidden relative border border-slate-300">
                    {beforeObs.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={beforeObs.thumbnailUrl}
                        alt={`Sentinel-2 observation on ${formatObsDate(beforeObs.observationDate)}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs p-4 text-center">
                        <Satellite className="h-6 w-6 mb-1 text-slate-500" />
                        <span>Sentinel-2 L2A Scene</span>
                        <span className="font-mono text-[10px] text-slate-400 mt-1">{beforeObs.sceneId || 'Raw Scene'}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Cloud Cover</span>
                      <strong>{beforeObs.cloudCover.toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Resolution</span>
                      <strong>{beforeObs.resolution}m / pixel</strong>
                    </div>
                  </div>
                </div>

                {/* AFTER CARD */}
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded bg-indigo-700 text-white">
                      AFTER: {formatObsDate(afterObs.observationDate)}
                    </span>
                    <Badge variant={afterObs.quality === 'USABLE' ? 'success' : 'neutral'} size="sm">
                      {afterObs.quality}
                    </Badge>
                  </div>

                  <div className="aspect-video bg-black rounded-lg overflow-hidden relative border border-indigo-200">
                    {afterObs.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={afterObs.thumbnailUrl}
                        alt={`Sentinel-2 observation on ${formatObsDate(afterObs.observationDate)}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs p-4 text-center">
                        <Satellite className="h-6 w-6 mb-1 text-indigo-400" />
                        <span>Sentinel-2 L2A Scene</span>
                        <span className="font-mono text-[10px] text-slate-400 mt-1">{afterObs.sceneId || 'Latest Scene'}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Cloud Cover</span>
                      <strong>{afterObs.cloudCover.toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Resolution</span>
                      <strong>{afterObs.resolution}m / pixel</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Derived Analysis if present */}
              {analyses.length > 0 && (
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 space-y-1.5 text-xs text-purple-900">
                  <div className="font-bold text-purple-950 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                    Derived Temporal Change Analysis: {analyses[0].changeClassification.replace(/_/g, ' ')}
                  </div>
                  <p className="leading-relaxed text-[11px] text-purple-800">
                    Methodology: {analyses[0].methodology || 'Multi-temporal Sentinel-2 spectral reflectance shift analysis'}.
                    {analyses[0].limitations && ` Limitation: ${analyses[0].limitations}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CASE B: ONLY ONE OBSERVATION EXISTS — NO FAKE BEFORE IMAGE */}
          {sortedObs.length === 1 && singleObs && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 max-w-lg mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold px-2.5 py-1 rounded bg-slate-900 text-white">
                    OBSERVATION: {formatObsDate(singleObs.observationDate)}
                  </span>
                  <Badge variant={singleObs.quality === 'USABLE' ? 'success' : 'neutral'} size="sm">
                    {singleObs.quality}
                  </Badge>
                </div>

                <div className="aspect-video bg-black rounded-lg overflow-hidden relative border border-slate-300">
                  {singleObs.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={singleObs.thumbnailUrl}
                      alt={`Sentinel-2 observation on ${formatObsDate(singleObs.observationDate)}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs p-4 text-center">
                      <Satellite className="h-6 w-6 mb-1 text-slate-400" />
                      <span>Single Ingested Pass</span>
                      <span className="font-mono text-[10px] text-slate-400 mt-1">{singleObs.sceneId || 'Sentinel-2'}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Cloud Cover</span>
                    <strong>{singleObs.cloudCover.toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Ground Resolution</span>
                    <strong>{singleObs.resolution}m</strong>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 text-center max-w-lg mx-auto">
                <strong>Temporal Comparison Note:</strong> Only one verified satellite observation is available for this project. A second satellite pass is required to compute multi-temporal difference metrics. <em>No synthetic before/after imagery is created.</em>
              </div>
            </div>
          )}

          {/* CASE C: ZERO OBSERVATIONS — TRUTHFUL NO USABLE OBSERVATION STATE */}
          {sortedObs.length === 0 && (
            <div className="py-8 px-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-3 max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mx-auto text-slate-500">
                <Satellite className="h-6 w-6 text-slate-600" />
              </div>

              <div>
                <h5 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  NO USABLE SATELLITE OBSERVATION
                </h5>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  {status?.message || 'No ingested Sentinel-2 observation passes are available for this project area.'}
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Real Reason:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {status?.reason || 'AUTHENTICATION_REQUIRED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Provider Status:</span>
                  <span className="font-mono font-semibold text-amber-700">
                    {status?.providerStatus || 'NOT_CONFIGURED'}
                  </span>
                </div>
                {hasCoords && (
                  <div className="flex justify-between border-t border-slate-100 pt-1">
                    <span className="text-slate-500">Target Coordinates:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {lat?.toFixed(4)}° N, {lng?.toFixed(4)}° E
                    </span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed max-w-md mx-auto">
                Real-time Sentinel-2 tile fetching requires live Copernicus Data Space Ecosystem (CDSE) API credentials. High-resolution optical basemaps remain interactive in the map panel above.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 4. DATED SATELLITE OBSERVATION TIMELINE */}
      {observations.length > 0 && (
        <Card>
          <CardHeader>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Dated Satellite Observation Stream
            </h4>
          </CardHeader>
          <CardBody className="space-y-3">
            {sortedObs.map((obs) => (
              <div
                key={obs.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white">
                      {formatObsDate(obs.observationDate)}
                    </span>
                    <span className="text-xs font-bold text-purple-900">
                      🛰️ {obs.satellite} ({obs.sensor})
                    </span>
                    <Badge variant={obs.quality === 'USABLE' ? 'success' : 'neutral'} size="sm">
                      {obs.quality}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Provider: {obs.provider === 'cdse' ? 'Copernicus Data Space Ecosystem (CDSE)' : obs.provider} · Cloud Cover: {obs.cloudCover.toFixed(1)}% · Resolution: {obs.resolution}m
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {obs.sourceUrl && (
                    <a
                      href={obs.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      Copernicus Scene
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <button
                    onClick={() => setSelectedObs(obs)}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all"
                  >
                    View on Map
                  </button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* 5. Physical Capabilities & Limits */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
        <h5 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
          Sentinel-2 (10m) Verification Capabilities &amp; Limitations
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
