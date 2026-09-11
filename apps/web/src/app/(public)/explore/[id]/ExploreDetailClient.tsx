'use client';

import { InformationClassificationBanner } from '@/components/transparency/InformationClassificationBanner';
import { PublicMoneyView } from '@/components/transparency/PublicMoneyView';
import { SourcePanel } from '@/components/transparency/SourcePanel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import {
    usePublicProject,
    usePublicProjectEvidence,
    usePublicProjectReports,
    usePublicProjectRisk,
    usePublicProjectTimeline,
} from '@/hooks/usePublicProjects';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { PublicProjectDetail } from '@vojas/api-client';
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    CheckCircle,
    CheckCircle2,
    Clock,
    Cpu,
    DollarSign,
    FileSearch,
    FileText,
    Loader2,
    MapPin,
    MessageSquare,
    Satellite,
    Scale,
    ShieldAlert,
    Sparkles,
    UserCheck
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

const SatelliteTab = dynamic(
  () => import('@/components/satellite/SatelliteTab').then((m) => m.SatelliteTab),
  {
    loading: () => (
      <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 text-sm">
        <Loader2 className="h-5 w-5 animate-spin mr-2 text-vojas-500" /> Loading Satellite Telemetry…
      </div>
    ),
    ssr: false,
  }
);

type Tab = 'overview' | 'financial' | 'timeline' | 'risk' | 'satellite';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'> = {
  COMPLETED: 'success',
  VERIFIED: 'success',
  IN_PROGRESS: 'info',
  APPROVED: 'primary',
  SANCTIONED: 'primary',
  CANCELLED: 'danger',
  UNSANCTIONED: 'neutral',
  PROPOSED: 'neutral',
};

const SEVERITY_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  LOW: 'info',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
};

export function ExploreDetailClient() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabItems: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: 'overview', label: t('common.overview', 'Overview'), icon: FileText },
    { key: 'financial', label: t('common.financial', 'Finance'), icon: DollarSign },
    { key: 'timeline', label: t('projects.timeline', 'Evidence & Timeline'), icon: Activity },
    { key: 'risk', label: t('risk.title', 'Risk'), icon: ShieldAlert },
    { key: 'satellite', label: t('satellite.title', 'Satellite'), icon: Satellite },
  ];

  const { data: project, isLoading, isError } = usePublicProject(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-vojas-500 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-slate-400">{t('common.loading', 'Loading project…')}</p>
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="space-y-4">
        <Link href="/explore" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back', 'Back to Explore')}
        </Link>
        <Card>
          <CardBody>
            <div className="text-center py-12 text-slate-500">
              <p className="font-medium">{t('common.notFound', 'Project not found')}</p>
              <p className="text-sm text-slate-400 mt-1">
                This project does not exist, or is not available for public viewing.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const isDone = project.status === 'COMPLETED' || project.status === 'VERIFIED';
  const progressPercent =
    project.approvedAmount > 0
      ? Math.min(100, Math.round((project.spentAmount / project.approvedAmount) * 100))
      : isDone
      ? 100
      : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 -ml-1 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back', 'Back to Explore')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              {isDone ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  STATUS: {t('common.completed', 'DONE')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  STATUS: {t('common.pending', 'NOT DONE')}
                </span>
              )}
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                {progressPercent}% {t('common.completed', 'Complete')}
              </span>
              {project.projectRisk && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs',
                    project.projectRisk.riskLevel === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : project.projectRisk.riskLevel === 'HIGH'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : project.projectRisk.riskLevel === 'MEDIUM'
                      ? 'bg-sky-100 text-sky-800 border-sky-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('risk.aiRiskAudit', 'AI RISK')}: {project.projectRisk.riskScore}/100 ({project.projectRisk.riskLevel})
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant={STATUS_VARIANT[project.status] ?? 'neutral'}>{project.status.replace(/_/g, ' ')}</Badge>
              <Badge variant="neutral">{project.sector.replace(/_/g, ' ')}</Badge>
              <span className="text-sm text-slate-400 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {[project.district, project.state].filter(Boolean).join(', ') || t('map.noLocation', 'Location not available')}
              </span>
              {project.latitude != null && project.longitude != null && (
                <Link
                  href={`/explore/map?focus=${project.id}`}
                  className="text-sm font-medium text-vojas-600 hover:underline"
                >
                  {t('projects.viewOnMap', 'View on Map →')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <InformationClassificationBanner />

      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Project sections">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-vojas-600 text-vojas-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && <OverviewTab project={project} />}
      {activeTab === 'financial' && <FinancialTab project={project} />}
      {activeTab === 'timeline' && <TimelineTab projectId={id} active={activeTab === 'timeline'} />}
      {activeTab === 'risk' && <RiskTab projectId={id} project={project} active={activeTab === 'risk'} />}
      {activeTab === 'satellite' && (
        <SatelliteTab
          projectId={id}
          lat={project.latitude ?? 12.9716}
          lng={project.longitude ?? 77.5946}
          projectName={project.name}
        />
      )}

      <SourcePanel lastUpdated={project.updatedAt} className="mt-8" />
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}

function SignalMeter({ label, score }: { label: string; score: number }) {
  const isHigh = score >= 50;
  const isMed = score >= 25 && score < 50;
  return (
    <div className="p-2.5 rounded-lg bg-white/90 border border-slate-200 shadow-2xs space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium truncate">{label}</span>
        <span
          className={cn(
            'font-mono font-bold text-xs',
            isHigh ? 'text-rose-600' : isMed ? 'text-amber-600' : 'text-emerald-700'
          )}
        >
          {score}/100
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
          )}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}

interface StatutoryRedFlag {
  rule: string;
  violation: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidence: string;
}

interface ForensicAuditResult {
  projectId: string;
  projectName: string;
  modelUsed: string;
  auditedAt: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidenceScore: number;
  forensicVerdict: 'CLEAN' | 'SUSPECTED_GHOST_WORK' | 'INFLATED_COST_ANOMALY' | 'PROCUREMENT_COLLUSION' | 'PROGRESS_STALL' | 'EVIDENCE_DEFICIT';
  verdictTitle: string;
  executiveSummary: string;
  statutoryRedFlags: StatutoryRedFlag[];
  financialAudit: {
    utilizationRate: number;
    disbursalAnomaly: boolean;
    analysis: string;
  };
  satelliteTelemetryVerdict: {
    spectralChangeDetected: boolean;
    interpretation: string;
    surfaceObservationConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  contractorRiskAssessment: {
    contractorName: string | null;
    concentrationIndex: string;
    riskFlags: string[];
  };
  actionPlan: Array<{
    step: number;
    action: string;
    authority: string;
    urgency: 'IMMEDIATE' | 'HIGH' | 'STANDARD';
  }>;
  citizenChecklist: string[];
}

function AiRiskAuditCard({ project }: { project: PublicProjectDetail }) {
  const initialRisk = project.projectRisk;
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditStep, setAuditStep] = useState(0);
  const [auditResult, setAuditResult] = useState<ForensicAuditResult | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const auditSteps = [
    '🛰️ Ingesting Sentinel-2 multi-spectral remote sensing telemetry...',
    '📜 Cross-referencing GFR 2017 & CVC statutory procurement rules...',
    '📊 Reconciling Measurement Book (MB) vs treasury disbursal vouchers...',
    '🧠 Synthesizing VOJAS Sentinel AI v4.2 forensic dossier...',
  ];

  const handleRunAiAudit = async () => {
    setIsAuditing(true);
    setAuditError(null);
    setAuditStep(0);

    const stepInterval = setInterval(() => {
      setAuditStep((prev) => (prev < auditSteps.length - 1 ? prev + 1 : prev));
    }, 600);

    try {
      const res = await fetch(`/api/v1/projects/public/${project.id}/ai-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      clearInterval(stepInterval);

      if (data.success && data.data) {
        setAuditResult(data.data);
      } else {
        setAuditError(data.error?.message || 'Failed to complete AI forensic audit.');
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      setAuditError(err.message || 'Network error during AI audit execution.');
    } finally {
      setIsAuditing(false);
    }
  };

  const activeScore = auditResult ? auditResult.riskScore : (initialRisk?.riskScore ?? 0);
  const activeLevel = auditResult ? auditResult.riskLevel : (initialRisk?.riskLevel ?? 'LOW');
  const activeModel = auditResult ? auditResult.modelUsed : ((initialRisk as any)?.algorithmVersion ?? 'VOJAS Sentinel AI v4.2 Neural-LLM Core');
  const activeConfidence = auditResult ? `${auditResult.confidenceScore}%` : (initialRisk?.confidence ?? 'MEDIUM');

  const isCritical = activeLevel === 'CRITICAL';
  const isHigh = activeLevel === 'HIGH';
  const isMed = activeLevel === 'MEDIUM';

  return (
    <Card
      className={cn(
        'border-2 shadow-xs transition-all overflow-hidden',
        isCritical
          ? 'border-rose-300 bg-rose-50/30'
          : isHigh
          ? 'border-amber-300 bg-amber-50/30'
          : isMed
          ? 'border-sky-300 bg-sky-50/30'
          : 'border-emerald-300 bg-emerald-50/30'
      )}
    >
      <CardHeader className="pb-3.5 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs transition-transform',
                isCritical
                  ? 'bg-rose-600'
                  : isHigh
                  ? 'bg-amber-600'
                  : isMed
                  ? 'bg-sky-600'
                  : 'bg-emerald-600'
              )}
            >
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  VOJAS Sentinel AI Forensic Audit
                </h2>
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                  {auditResult ? 'LIVE AUDITED' : 'PRE-COMPUTED'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeModel} · Confidence: <span className="font-semibold text-slate-700">{activeConfidence}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRunAiAudit}
              disabled={isAuditing}
              className={cn(
                'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed',
                'bg-slate-900 hover:bg-slate-800 text-white border border-slate-800/80'
              )}
            >
              {isAuditing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Auditing Live...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Run Live LLM Audit</span>
                </>
              )}
            </button>

            <div
              className={cn(
                'px-3 py-1.5 rounded-xl text-white font-mono font-bold text-sm shadow-xs flex items-center gap-2',
                isCritical
                  ? 'bg-rose-600'
                  : isHigh
                  ? 'bg-amber-600'
                  : isMed
                  ? 'bg-sky-700'
                  : 'bg-emerald-600'
              )}
            >
              <span className="text-base">{activeScore}</span>
              <span className="text-xs opacity-75">/ 100</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 uppercase tracking-wider font-semibold">
                {activeLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Ticker during AI Auditing */}
        {isAuditing && (
          <div className="mt-3 p-2.5 rounded-xl bg-slate-900 text-white flex items-center gap-2.5 text-xs animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
            <span className="font-medium font-mono text-slate-200">
              {auditSteps[auditStep]}
            </span>
          </div>
        )}

        {auditError && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{auditError}</span>
          </div>
        )}
      </CardHeader>

      <CardBody className="space-y-4 pt-4">
        {/* Forensic Verdict Banner */}
        {auditResult && (
          <div
            className={cn(
              'p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3',
              isCritical
                ? 'bg-rose-100/70 border-rose-300 text-rose-900'
                : isHigh
                ? 'bg-amber-100/70 border-amber-300 text-amber-900'
                : 'bg-emerald-100/70 border-emerald-300 text-emerald-900'
            )}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/10">
                  {auditResult.forensicVerdict.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-slate-600 font-mono">
                  {new Date(auditResult.auditedAt).toLocaleTimeString()}
                </span>
              </div>
              <h3 className="text-sm font-bold mt-1 text-slate-900">
                {auditResult.verdictTitle}
              </h3>
            </div>
          </div>
        )}

        {/* Executive Summary Narrative */}
        <div className="p-3.5 rounded-xl bg-white/95 border border-slate-200 shadow-2xs space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <FileSearch className="w-3.5 h-3.5 text-slate-500" />
            AI Forensic Analysis &amp; Legal Audit Synthesis
          </p>
          <p className="text-sm font-medium text-slate-800 leading-relaxed">
            {auditResult ? auditResult.executiveSummary : (initialRisk?.primaryDriver || 'Standard civic asset verification in progress.')}
          </p>
        </div>

        {/* Statutory Red Flags & Violations (if present) */}
        {auditResult && auditResult.statutoryRedFlags.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-rose-600" />
              Statutory Procurement Red Flags Detected ({auditResult.statutoryRedFlags.length})
            </p>
            <div className="grid grid-cols-1 gap-2">
              {auditResult.statutoryRedFlags.map((flag, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white/95 border border-rose-200 shadow-2xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-800">{flag.rule}</span>
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded',
                        flag.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {flag.severity}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-800">{flag.violation}</p>
                  <p className="text-[11px] text-slate-500 font-mono italic">{flag.evidence}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Signal Breakdown */}
        {initialRisk && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Multi-Signal Sub-Score Telemetry (0 = Safe, 100 = Max Disparity)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              <SignalMeter label="Financial Utilization" score={initialRisk.financialScore ?? 0} />
              <SignalMeter label="Milestone & Progress" score={initialRisk.progressScore ?? 0} />
              <SignalMeter label="Satellite Observation" score={initialRisk.satelliteScore ?? 0} />
              <SignalMeter label="Contractor Disparity" score={initialRisk.contractorScore ?? 0} />
              <SignalMeter label="Geographic Integrity" score={initialRisk.geographicScore ?? 0} />
            </div>
          </div>
        )}

        {/* Satellite Telemetry & Vigilance Action Roadmap */}
        {auditResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Satellite Telemetry Verdict */}
            <div className="p-3.5 rounded-xl bg-white/95 border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5 text-vojas-600" />
                  Sentinel-2 Optical Telemetry
                </span>
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded font-semibold',
                    auditResult.satelliteTelemetryVerdict.spectralChangeDetected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  )}
                >
                  {auditResult.satelliteTelemetryVerdict.spectralChangeDetected ? 'OBSERVABLE CHANGE' : 'NO CHANGE DETECTED'}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {auditResult.satelliteTelemetryVerdict.interpretation}
              </p>
            </div>

            {/* Vigilance Action Roadmap */}
            <div className="p-3.5 rounded-xl bg-white/95 border border-slate-200 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-slate-600" />
                Statutory Vigilance Roadmap
              </span>
              <div className="space-y-1.5">
                {auditResult.actionPlan.map((action) => (
                  <div key={action.step} className="flex items-start gap-2 text-xs">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {action.step}
                    </span>
                    <div>
                      <p className="text-slate-800 font-medium leading-snug">{action.action}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{action.authority} · {action.urgency}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Citizen Social Audit Checklist */}
        {auditResult && auditResult.citizenChecklist.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                Citizen Physical Ground Verification Checklist
              </span>
              <span className="text-[10px] text-amber-700 font-medium">On-Site Social Audit</span>
            </div>
            <div className="space-y-1.5">
              {auditResult.citizenChecklist.map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none hover:text-slate-900 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(checkedItems[idx])}
                    onChange={(e) => setCheckedItems((prev) => ({ ...prev, [idx]: e.target.checked }))}
                    className="mt-0.5 h-3.5 w-3.5 rounded text-vojas-600 focus:ring-vojas-500 border-slate-300"
                  />
                  <span className={cn(checkedItems[idx] && 'line-through text-slate-400')}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function OverviewTab({ project }: { project: PublicProjectDetail }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-5">
      <AiRiskAuditCard project={project} />

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-800">{t('projects.projectDetails', 'Project Details')}</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <DetailField label={t('projects.projectSector', 'Sector')} value={project.sector.replace(/_/g, ' ')} />
            <DetailField label={t('projects.state', 'State')} value={project.state || t('common.noData', 'Not available')} />
            <DetailField label={t('projects.district', 'District')} value={project.district || t('common.noData', 'Not available')} />
            <DetailField label={t('projects.constituency', 'Constituency')} value={project.constituency || t('common.noData', 'Not available')} />
            <DetailField label={t('projects.projectContractor', 'Contractor')} value={project.contractor || t('common.noData', 'Not available')} />
            <DetailField label={t('transparency.dataSource', 'Data Source')} value={project.source.replace(/_/g, ' ')} />
            <DetailField label={t('projects.projectStartDate', 'Start Date')} value={formatDate(project.startDate)} />
            <DetailField label={t('projects.projectEndDate', 'Expected Completion')} value={formatDate(project.expectedEndDate)} />
            <DetailField label={t('projects.completedOn', 'Completed On')} value={formatDate(project.completedAt)} />
          </div>
        </CardBody>
      </Card>

      {project.mp && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-vojas-600" />
                {t('navigation.mps', 'Member of Parliament (MP)')}
              </h2>
              {project.mp.party && (
                <Badge variant="primary">{project.mp.party}</Badge>
              )}
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <DetailField label={t('mp.representative', 'Representative')} value={project.mp.name} />
              <DetailField label={t('projects.constituency', 'Constituency')} value={project.mp.constituency} />
              <DetailField label={t('mp.house', 'House')} value={project.mp.house === 'LOK_SABHA' ? 'Lok Sabha' : 'Rajya Sabha'} />
              <DetailField label={t('mp.tenure', 'Tenure')} value={project.mp.term || '17th Lok Sabha'} />
            </div>
          </CardBody>
        </Card>
      )}

      {project.description && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800">{t('common.description', 'Description')}</h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-slate-600 leading-relaxed">{project.description}</p>
          </CardBody>
        </Card>
      )}

      <CitizenReportsSection project={project} />
    </div>
  );
}

function FinancialTab({ project }: { project: PublicProjectDetail }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-5">
      <PublicMoneyView approvedAmount={project.approvedAmount} spentAmount={project.spentAmount} />
      {project.approvedAmount > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t('projects.utilizationRate', 'Fund Utilization Rate')}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {((project.spentAmount / project.approvedAmount) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">{t('projects.remainingAmount', 'Unspent Balance')}</p>
                <p className="text-lg font-bold text-amber-600 mt-1">
                  {formatCurrency(project.approvedAmount - project.spentAmount)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  DOCUMENT: 'Document',
  SATELLITE_OBSERVATION: 'Satellite observation',
  SATELLITE_ANALYSIS: 'Satellite change analysis',
  INSPECTION: 'Field inspection',
  CITIZEN_MEDIA: 'Citizen-submitted media',
  CONTRACTOR_SUBMISSION: 'Contractor submission',
  AI_FINDING: 'AI-assisted finding',
  PROJECT_EVENT: 'Project event',
};

function TimelineTab({ projectId, active }: { projectId: string; active: boolean }) {
  const { data, isLoading } = usePublicProjectTimeline(projectId);
  const events = data?.data ?? [];
  const { data: evidenceFeed, isLoading: evidenceLoading } = usePublicProjectEvidence(projectId, active);
  const evidenceItems = evidenceFeed?.items ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-800">Evidence &amp; Timeline</h2>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No recorded events available for this project yet.
            </div>
          ) : (
            <ol className="space-y-4">
              {events.map((e) => (
                <li key={e.id} className="border-l-2 border-slate-200 pl-4 relative">
                  <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-vojas-500" />
                  <p className="text-sm font-medium text-slate-700">{e.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(e.eventDate)} · {e.eventType.replace(/_/g, ' ')} · Source: {e.source}
                    {e.sourceUrl && (
                      <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-vojas-600 hover:underline">
                        view source
                      </a>
                    )}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-800">Unified Evidence Feed</h2>
        </CardHeader>
        <CardBody>
          {evidenceLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
          ) : evidenceItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No public evidence recorded for this project yet.
            </div>
          ) : (
            <ol className="space-y-4">
              {evidenceItems.map((item) => (
                <li key={item.id} className="border-l-2 border-slate-200 pl-4 relative">
                  <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-vojas-500" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-700">{item.title}</p>
                    <Badge variant="neutral">{EVIDENCE_TYPE_LABEL[item.evidenceType] ?? item.evidenceType}</Badge>
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(item.capturedAt)}
                    {item.confidence && ` · Confidence: ${item.confidence}`}
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-vojas-600 hover:underline">
                        view source
                      </a>
                    )}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function RiskTab({
  projectId,
  project,
  active,
}: {
  projectId: string;
  project: PublicProjectDetail;
  active: boolean;
}) {
  const { data, isLoading } = usePublicProjectRisk(projectId, active);
  const findings = data?.findings ?? [];

  return (
    <div className="space-y-4">
      <AiRiskAuditCard project={project} />

      <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          {data?.disclaimer ?? 'AI-assisted risk findings are signals for human review, not proof of wrongdoing.'}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
      ) : findings.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-8 text-slate-400 text-sm">No active risk findings for this project.</div>
          </CardBody>
        </Card>
      ) : (
        findings.map((f) => (
          <Card key={f.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-800 text-sm">{f.title}</h3>
                <Badge variant={SEVERITY_VARIANT[f.severity] ?? 'neutral'}>{f.severity}</Badge>
              </div>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.description}</p>
              {f.limitations && (
                <p className="text-xs text-slate-400 mt-2">Limitations: {f.limitations}</p>
              )}
              <p className="text-xs text-slate-400 mt-2">
                Detected {formatDate(f.detectedAt)} · Confidence: {f.confidence} · Status: {f.status.replace(/_/g, ' ')}
              </p>
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );
}

function CitizenReportsSection({ project }: { project: PublicProjectDetail }) {
  const { t } = useLanguage();
  const { data, isLoading } = usePublicProjectReports(project.id);
  const reports = data?.reports ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-vojas-600" />
            {t('citizen.reports', 'Citizen Oversight & Reports')}
          </h2>
          <Link href={`/report?projectId=${project.id}`}>
            <Button variant="primary" size="sm">{t('citizen.submitReport', 'Submit a Report')}</Button>
          </Link>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div>
            <p className="text-2xl font-bold text-slate-900">{project.reportCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {project.reportCount === 1 ? 'verified citizen submission' : 'verified citizen submissions'}
            </p>
          </div>
          <p className="text-xs text-slate-400 max-w-xs text-right">
            Geotagged citizen evidence directly updates project anomaly detection and statutory audits.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-6 text-slate-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-vojas-500" />
            Loading project citizen reports…
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            <p className="font-medium text-slate-600">No public discrepancy reports logged yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Citizens and community inspectors can submit on-site photographs and progress notes above.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Submitted Discrepancies ({reports.length})
            </h3>
            {reports.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-vojas-700 bg-vojas-50 px-2 py-0.5 rounded border border-vojas-200">
                      {r.reportReference}
                    </span>
                    <Badge variant="neutral">{r.category.replace(/_/g, ' ')}</Badge>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Logged {formatDate(r.submittedAt)}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-800">{r.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{r.description}</p>
                {r.locationDesc && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    Observed location: {r.locationDesc}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
          Whistleblower identities are cryptographically protected. Personally identifiable contact details are kept strictly confidential.
        </p>
      </CardBody>
    </Card>
  );
}
