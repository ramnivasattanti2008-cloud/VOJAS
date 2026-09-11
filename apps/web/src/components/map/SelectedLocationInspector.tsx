'use client';

import React from 'react';
import Link from 'next/link';
import {
  X,
  ExternalLink,
  MapPin,
  AlertTriangle,
  Building2,
  Calendar,
  IndianRupee,
  Activity,
  Sparkles,
  ShieldAlert,
  Satellite,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface InspectedEntity {
  id: string;
  type: 'project' | 'riskFinding' | 'case' | 'citizenSignal' | 'satelliteObservation';
  title: string;
  district?: string;
  state?: string;
  constituency?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  sanctionedAmount?: number;
  expenditure?: number;
  physicalProgress?: number;
  status?: string;
  riskLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category?: string;
  contractorName?: string;
  description?: string;
  spectralMetrics?: {
    ndvi?: number;
    ndbi?: number;
    changeScore?: number;
    observationDate?: string;
  };
}

interface SelectedLocationInspectorProps {
  entity: InspectedEntity | null;
  onClose: () => void;
  onOpenAiExplain?: (entity: InspectedEntity) => void;
  className?: string;
}

export const SelectedLocationInspector: React.FC<SelectedLocationInspectorProps> = ({
  entity,
  onClose,
  onOpenAiExplain,
  className
}) => {
  if (!entity) return null;

  const formatCurrency = (amt?: number) => {
    if (amt == null || isNaN(amt)) return '₹ --';
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} L`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  const getRiskBadge = (level?: string) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40">CRITICAL RISK</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">HIGH RISK</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">MODERATE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">VERIFIED</span>;
    }
  };

  return (
    <div
      className={`w-80 md:w-96 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100 flex flex-col z-20 transition-all ${className ?? ''}`}
    >
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
            {entity.type === 'riskFinding' ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : entity.type === 'satelliteObservation' ? (
              <Satellite className="w-4 h-4 text-cyan-400" />
            ) : (
              <MapPin className="w-4 h-4 text-blue-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {entity.type}
              </span>
              {entity.riskLevel && getRiskBadge(entity.riskLevel)}
            </div>
            <h4 className="font-semibold text-sm text-slate-100 line-clamp-2 mt-0.5 leading-snug">
              {entity.title}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3.5 overflow-y-auto max-h-[60vh] text-xs">
        {/* Coordinates Pill */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>GEO-LOCATION</span>
          </div>
          <span className="text-cyan-300 font-semibold">
            {entity.coordinates.lat.toFixed(4)}° N, {entity.coordinates.lng.toFixed(4)}° E
          </span>
        </div>

        {/* Location Context */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">District</span>
            <span className="text-slate-200 font-medium">{entity.district || 'Unassigned'}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">Constituency</span>
            <span className="text-slate-200 font-medium">{entity.constituency || 'General'}</span>
          </div>
        </div>

        {/* Financial Metrics */}
        {(entity.sanctionedAmount != null || entity.expenditure != null) && (
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/90 space-y-1.5">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">
              Financial vs Physical Progress
            </span>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">Sanctioned</span>
                <span className="font-mono text-xs font-semibold text-emerald-400">
                  {formatCurrency(entity.sanctionedAmount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Disbursed</span>
                <span className="font-mono text-xs font-semibold text-blue-400">
                  {formatCurrency(entity.expenditure)}
                </span>
              </div>
            </div>

            {entity.physicalProgress != null && (
              <div className="pt-1.5 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Physical Completion</span>
                  <span className="text-slate-200 font-bold">{entity.physicalProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, entity.physicalProgress)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contractor Details */}
        {entity.contractorName && (
          <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Contractor</span>
            <span className="text-slate-300 font-medium text-[11px] truncate max-w-[180px]">
              {entity.contractorName}
            </span>
          </div>
        )}

        {/* Spectral Sentinel-2 Metrics */}
        {entity.spectralMetrics && (
          <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/30 space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between text-cyan-400">
              <span className="flex items-center gap-1">
                <Satellite className="w-3 h-3" />
                <span>SENTINEL-2 TELEMETRY</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {entity.spectralMetrics.observationDate || 'Recent'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
              {entity.spectralMetrics.ndvi != null && (
                <div>
                  <span className="text-slate-400 block">NDVI Index</span>
                  <span className="text-slate-200 font-semibold">{entity.spectralMetrics.ndvi.toFixed(2)}</span>
                </div>
              )}
              {entity.spectralMetrics.ndbi != null && (
                <div>
                  <span className="text-slate-400 block">NDBI Built-Up</span>
                  <span className="text-slate-200 font-semibold">{entity.spectralMetrics.ndbi.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description or Anomaly Rationale */}
        {entity.description && (
          <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-slate-300 text-[11px] leading-relaxed">
            {entity.description}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 space-y-2">
        {onOpenAiExplain && (
          <button
            type="button"
            onClick={() => onOpenAiExplain(entity)}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-semibold shadow-lg shadow-purple-950 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Anomaly Analysis</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          {entity.type === 'project' && (
            <>
              <Link href={`/explore/${entity.id}`} className="flex-1">
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs transition-colors"
                >
                  <span>Full Dossier</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </Link>
              <Link href={`/report?projectId=${entity.id}`} className="flex-1">
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg border border-amber-500/40 bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 font-mono text-xs transition-colors"
                >
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  <span>Report Issue</span>
                </button>
              </Link>
            </>
          )}

          {entity.type !== 'project' && (
            <Link href={`/officer/investigations?caseId=${entity.id}`} className="w-full">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg border border-red-500/40 bg-red-950/30 hover:bg-red-900/40 text-red-300 font-mono text-xs transition-colors"
              >
                <ShieldAlert className="w-3 h-3 text-red-400" />
                <span>Investigate</span>
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
