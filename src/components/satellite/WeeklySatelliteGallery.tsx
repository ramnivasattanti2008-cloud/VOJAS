'use client';

import React, { useState } from 'react';
import {
  Satellite,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ZoomIn,
  Eye,
  Activity,
  Maximize2,
  X,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

export interface WeeklyTimelinePoint {
  weekNum: number;
  date: string;
  contractorClaimedPercent: number;
  contractorSpent: number;
  contractorNote: string;
  satelliteObservedPercent: number;
  discrepancyPercent: number;
  satelliteImageUrl: string;
  cloudCover: number;
  ndbi: number;
  ndvi: number;
  builtUpArea: number;
  verdict: 'VERIFIED' | 'REVIEW_RECOMMENDED' | 'CRITICAL_DISCREPANCY';
  anomalyNote?: string;
}

interface WeeklySatelliteGalleryProps {
  timeline: WeeklyTimelinePoint[];
  projectName: string;
  approvedAmount?: number;
  spentAmount?: number;
  className?: string;
}

export function WeeklySatelliteGallery({
  timeline,
  projectName,
  approvedAmount = 0,
  spentAmount = 0,
  className,
}: WeeklySatelliteGalleryProps) {
  const [selectedWeek, setSelectedWeek] = useState<WeeklyTimelinePoint | null>(timeline[timeline.length - 1] ?? null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (!timeline || timeline.length === 0) {
    return (
      <Card className="border-dashed border-slate-300 p-8 text-center text-slate-500">
        <Satellite className="h-8 w-8 mx-auto mb-2 text-slate-400 animate-pulse" />
        <p className="text-sm font-semibold">Weekly Satellite Passes Initializing</p>
        <p className="text-xs text-slate-400 mt-1">Satellite observations are compiled as Sentinel-2 passes over coordinates.</p>
      </Card>
    );
  }

  const baselineWeek = timeline[0];
  const latestWeek = timeline[timeline.length - 1];
  const activeWeek = selectedWeek ?? latestWeek;

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <Satellite className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
              Sentinel-2 Weekly Satellite Imagery Timeline
            </span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">{projectName}</h3>
          <p className="text-xs text-slate-400">
            {timeline.length} consecutive weekly orbital observations verified against contractor expenditure claims.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400">Contractor Claimed</p>
            <p className="text-lg font-black text-amber-400">{latestWeek.contractorClaimedPercent}% Done</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400">Satellite Ground Truth</p>
            <p className={`text-lg font-black ${latestWeek.satelliteObservedPercent < 15 && latestWeek.contractorClaimedPercent >= 60 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {latestWeek.satelliteObservedPercent}% Physical
            </p>
          </div>
        </div>
      </div>

      {/* Before / After Direct Image Comparison Slider */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-blue-600" />
            <span>Temporal Physical Comparison: Start Date vs Current State</span>
          </p>
          <span className="text-[11px] font-medium text-slate-400">
            Click any image to enlarge in HD
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Week 1 (Baseline) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Week 1: Project Initiation Baseline</span>
              <span className="text-slate-400 font-mono text-[11px]">{formatDate(baselineWeek.date)}</span>
            </div>
            <div
              className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 shadow-xs cursor-pointer group bg-slate-100"
              onClick={() => setLightboxImage(baselineWeek.satelliteImageUrl)}
            >
              <img
                src={baselineWeek.satelliteImageUrl}
                alt="Week 1 Baseline"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-slate-950/70 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
                <span>NDBI: {baselineWeek.ndbi}</span>
                <span>• Cloud: {baselineWeek.cloudCover}%</span>
              </div>
              <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-lg bg-white/90 text-slate-900 text-xs font-bold shadow-md flex items-center gap-1">
                  <Maximize2 className="h-3 w-3" /> Enlarge
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Site baseline state: Bare ground or pre-construction terrain.
            </p>
          </div>

          {/* Latest Week */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span>Week {latestWeek.weekNum}: Latest Satellite Ground Pass</span>
                {latestWeek.verdict === 'CRITICAL_DISCREPANCY' ? (
                  <Badge variant="danger" size="sm">0% Structural Growth</Badge>
                ) : (
                  <Badge variant="success" size="sm">Verified Growth</Badge>
                )}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">{formatDate(latestWeek.date)}</span>
            </div>
            <div
              className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 shadow-xs cursor-pointer group bg-slate-100"
              onClick={() => setLightboxImage(latestWeek.satelliteImageUrl)}
            >
              <img
                src={latestWeek.satelliteImageUrl}
                alt={`Week ${latestWeek.weekNum} Satellite Capture`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-slate-950/70 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
                <span>NDBI: {latestWeek.ndbi}</span>
                <span>• Cloud: {latestWeek.cloudCover}%</span>
              </div>
              <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-lg bg-white/90 text-slate-900 text-xs font-bold shadow-md flex items-center gap-1">
                  <Maximize2 className="h-3 w-3" /> Enlarge
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              {latestWeek.verdict === 'CRITICAL_DISCREPANCY'
                ? '⚠️ Discrepancy: Satellite confirms no physical construction activity has occurred.'
                : '✓ Physical structural footprint consistent with reported civil milestones.'}
            </p>
          </div>
        </div>
      </div>

      {/* Week-by-Week Horizontal Cards Carousel */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
          <span>Weekly Satellite Captures & Contractor Reporting Log ({timeline.length} Weeks)</span>
          <span className="text-[11px] font-normal text-slate-400">Click a week card to inspect detailed metrics</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {timeline.map((w) => {
            const isSelected = activeWeek.weekNum === w.weekNum;
            const isAnomaly = w.verdict === 'CRITICAL_DISCREPANCY';

            return (
              <div
                key={w.weekNum}
                onClick={() => setSelectedWeek(w)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-2 ring-blue-500/20'
                    : isAnomaly
                    ? 'border-rose-200 bg-rose-50/20 hover:border-rose-400'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                    <span>Week {w.weekNum}</span>
                    <span className="text-[10px] font-medium text-slate-400">({formatDate(w.date)})</span>
                  </span>
                  <Badge variant={isAnomaly ? 'danger' : 'success'} size="sm">
                    {isAnomaly ? 'Discrepancy' : 'Verified'}
                  </Badge>
                </div>

                {/* Satellite Thumbnail */}
                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={w.satelliteImageUrl} alt={`Week ${w.weekNum}`} className="w-full h-full object-cover" />
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-950/70 text-[9px] text-white font-mono">
                    NDBI: {w.ndbi}
                  </div>
                </div>

                {/* Contractor Claim vs Satellite Observables */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px]">Claimed:</span>
                    <span className="font-bold text-amber-700">{w.contractorClaimedPercent}%</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px]">Satellite:</span>
                    <span className={`font-bold ${isAnomaly ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {w.satelliteObservedPercent}%
                    </span>
                  </div>
                </div>

                {/* Footer note */}
                <p className="text-[10px] text-slate-500 line-clamp-2 italic leading-tight border-t border-slate-100 pt-1.5">
                  &ldquo;{w.contractorNote}&rdquo;
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Week Detailed Inspection Card */}
      {activeWeek && (
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Week {activeWeek.weekNum} Deep Inspection Dossier
              </h4>
            </div>
            <span className="text-xs font-mono text-slate-500">{formatDate(activeWeek.date)}</span>
          </CardHeader>
          <CardBody className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Contractor Claim</p>
                <p className="text-xl font-black text-amber-600">{activeWeek.contractorClaimedPercent}%</p>
                <p className="text-[10px] text-slate-500 mt-0.5">₹{(activeWeek.contractorSpent / 100000).toFixed(2)}L Billed</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Satellite Observed</p>
                <p className={`text-xl font-black ${activeWeek.verdict === 'CRITICAL_DISCREPANCY' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {activeWeek.satelliteObservedPercent}%
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Physical Change</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Built-Up (NDBI)</p>
                <p className="text-xl font-black text-slate-800">{activeWeek.ndbi}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Concrete Index</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Cloud Cover</p>
                <p className="text-xl font-black text-slate-800">{activeWeek.cloudCover}%</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Clear Observation</p>
              </div>
            </div>

            {/* Contractor Note vs Anomaly Callout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <p className="font-bold text-slate-800">🏗️ Contractor Submission Note:</p>
                <p className="text-slate-600 leading-relaxed italic">&ldquo;{activeWeek.contractorNote}&rdquo;</p>
              </div>

              <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                activeWeek.verdict === 'CRITICAL_DISCREPANCY'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <p className="font-bold flex items-center gap-1.5">
                  {activeWeek.verdict === 'CRITICAL_DISCREPANCY' ? (
                    <><AlertTriangle className="h-4 w-4 text-rose-600" /> AI Fraud Alert: Discrepancy Verified</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> AI Physical Corroboration</>
                  )}
                </p>
                <p className="leading-relaxed">
                  {activeWeek.anomalyNote ||
                    `Physical structural indicators (NDBI: ${activeWeek.ndbi}) align with the reported milestone. Satellite pass confirms civil construction activity on ground.`}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2 border border-slate-700">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/70 text-white hover:bg-slate-800 transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={lightboxImage} alt="Enlarged Satellite Scene" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
            <div className="p-3 text-center text-xs text-slate-300">
              Sentinel-2 Level-2A Multispectral Scene (10m Resolution) — European Space Agency Copernicus
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
