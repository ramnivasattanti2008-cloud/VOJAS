'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Landmark,
  Building2,
  Satellite,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { WeeklySatelliteGallery } from '@/components/satellite/WeeklySatelliteGallery';

interface ShowcaseProject {
  id: string;
  name: string;
  description: string;
  sector: string;
  status: string;
  state: string;
  district: string;
  constituency: string;
  approvedAmount: number;
  spentAmount: number;
  contractor: string;
  mp?: {
    id: string;
    name: string;
    party?: string;
    house?: string;
  };
  anomalies?: Array<{
    id: string;
    severity: string;
    title: string;
    description: string;
  }>;
}

export function ShowcaseProjectSelector() {
  const [activeTab, setActiveTab] = useState<'STALLED' | 'ONGOING' | 'FINISHED'>('STALLED');
  const [projectsData, setProjectsData] = useState<{
    finished: ShowcaseProject[];
    ongoing: ShowcaseProject[];
    stalled: ShowcaseProject[];
  }>({ finished: [], ongoing: [], stalled: [] });
  const [loading, setLoading] = useState(true);

  // Selected project for deep weekly satellite inspection
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<any | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    async function loadShowcase() {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:5000/api/v1/showcase/projects');
        const json = await res.json();
        if (json.success) {
          setProjectsData(json.data);
          // Pre-select the first fraud project for immediate visual impact
          if (json.data.stalled.length > 0) {
            setSelectedProjectId(json.data.stalled[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load showcase projects', err);
      } finally {
        setLoading(false);
      }
    }
    loadShowcase();
  }, []);

  // Fetch weekly report when selected project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    async function loadWeeklyReport() {
      try {
        setReportLoading(true);
        const res = await fetch(`http://localhost:5000/api/v1/showcase/projects/${selectedProjectId}/weekly-report`);
        const json = await res.json();
        if (json.success) {
          setWeeklyReport(json.data);
        }
      } catch (err) {
        console.error('Failed to load weekly report', err);
      } finally {
        setReportLoading(false);
      }
    }
    loadWeeklyReport();
  }, [selectedProjectId]);

  const activeProjects =
    activeTab === 'FINISHED'
      ? projectsData.finished
      : activeTab === 'ONGOING'
      ? projectsData.ongoing
      : projectsData.stalled;

  return (
    <div className="space-y-8">
      {/* Category Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
              13 Verified Showcase Works
            </span>
            <span className="text-xs text-slate-500 font-medium">• Real MPs &amp; Weekly Sentinel-2 Passes</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Construction AI Fraud &amp; Verification Lab
          </h2>
        </div>

        {/* Status Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('STALLED');
              if (projectsData.stalled[0]) setSelectedProjectId(projectsData.stalled[0].id);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'STALLED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
            <span>3 Ghost / Fraud Works</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'STALLED' ? 'bg-white text-rose-700' : 'bg-rose-100 text-rose-700'}`}>
              Alert
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('ONGOING');
              if (projectsData.ongoing[0]) setSelectedProjectId(projectsData.ongoing[0].id);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ONGOING'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>5 Ongoing Works</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'ONGOING' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-700'}`}>
              Active
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('FINISHED');
              if (projectsData.finished[0]) setSelectedProjectId(projectsData.finished[0].id);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'FINISHED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>5 Finished Works</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'FINISHED' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-700'}`}>
              100%
            </span>
          </button>
        </div>
      </div>

      {/* Projects Grid for Current Tab */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-xs">Loading verified showcase records…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {activeProjects.map((p) => {
            const isSelected = selectedProjectId === p.id;
            const isFraud = activeTab === 'STALLED';
            const util = p.approvedAmount > 0 ? Math.round((p.spentAmount / p.approvedAmount) * 100) : 0;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? isFraud
                      ? 'border-rose-500 bg-rose-50/50 shadow-md ring-2 ring-rose-400/20'
                      : 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {p.sector.replace(/_/g, ' ')}
                    </span>
                    {isFraud ? (
                      <Badge variant="danger" size="sm">
                        🚨 GHOST WORK DETECTED
                      </Badge>
                    ) : (
                      <Badge variant={p.status === 'COMPLETED' ? 'success' : 'info'} size="sm">
                        {p.status}
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug">{p.name}</h3>

                  <div className="space-y-1 text-xs text-slate-500">
                    <p className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{p.district}, {p.state}</span>
                    </p>
                    {p.mp && (
                      <p className="flex items-center gap-1 font-medium text-slate-700">
                        <Landmark className="h-3 w-3 text-blue-600 shrink-0" />
                        <span>MP: {p.mp.name} {p.mp.party ? `(${p.mp.party})` : ''}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-1 text-[11px]">
                      <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>Contractor: {p.contractor}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">Fund Billed:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(p.spentAmount)} ({util}%)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className={isFraud ? 'text-rose-600 font-bold' : 'text-blue-600'}>
                      {isSelected ? '● Inspected Below' : 'Click to inspect satellite timeline →'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deep Weekly Satellite Analysis & AI Fraud Report for Selected Project */}
      {reportLoading && (
        <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm font-semibold text-slate-700">Synthesizing Weekly Satellite Imagery Passes…</p>
          <p className="text-xs text-slate-400">Querying Sentinel-2 Level-2A spectral cubes and contractor measurement logs</p>
        </div>
      )}

      {weeklyReport && !reportLoading && (
        <div className="space-y-6 pt-4 border-t border-slate-200">
          {/* AI Executive Anomaly Verdict Banner */}
          <div className={`p-5 sm:p-6 rounded-2xl border shadow-sm ${
            weeklyReport.overallVerdict === 'CRITICAL_FRAUD_RISK'
              ? 'bg-rose-950 text-white border-rose-800'
              : weeklyReport.overallVerdict === 'MODERATE_VARIANCE'
              ? 'bg-amber-950 text-white border-amber-800'
              : 'bg-slate-900 text-white border-slate-800'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-white/10 text-amber-300">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    VOJAS Construction Sector AI Fraud Detector
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  {weeklyReport.overallVerdict === 'CRITICAL_FRAUD_RISK' && '⚠️ Critical Discrepancy: Ghost Construction Detected'}
                  {weeklyReport.overallVerdict === 'MODERATE_VARIANCE' && 'Review Advised: Contractor Progress Variance'}
                  {weeklyReport.overallVerdict === 'VERIFIED_CONSISTENT' && '✓ Physical Progress Verified by Sentinel-2'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                  {weeklyReport.aiExecutiveSummary}
                </p>
              </div>

              <div className="p-3 bg-white/10 rounded-xl text-left md:text-right shrink-0 border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fraud Risk Score</p>
                <div className="flex items-baseline gap-1 md:justify-end">
                  <span className="text-3xl font-black text-white">{weeklyReport.fraudRiskScore}</span>
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
                <Badge
                  variant={weeklyReport.fraudRiskScore >= 70 ? 'danger' : weeklyReport.fraudRiskScore >= 40 ? 'warning' : 'success'}
                  size="sm"
                  className="mt-1"
                >
                  {weeklyReport.fraudRiskScore >= 70 ? 'CRITICAL RISK' : weeklyReport.fraudRiskScore >= 40 ? 'MODERATE RISK' : 'LOW RISK'}
                </Badge>
              </div>
            </div>

            {/* Recommended Officer Actions */}
            {weeklyReport.recommendedOfficerActions && weeklyReport.recommendedOfficerActions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1.5">
                  Recommended Vigilance Actions:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-300">
                  {weeklyReport.recommendedOfficerActions.map((act: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Interactive Weekly Satellite Image Gallery */}
          <WeeklySatelliteGallery
            timeline={weeklyReport.weeklyTimeline}
            projectName={weeklyReport.projectName}
            approvedAmount={weeklyReport.approvedAmount}
            spentAmount={weeklyReport.spentAmount}
          />
        </div>
      )}
    </div>
  );
}
