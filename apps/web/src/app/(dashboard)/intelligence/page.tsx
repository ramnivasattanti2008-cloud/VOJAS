'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert, TrendingUp, MapPin, Activity, ChevronRight,
  AlertTriangle, CheckCircle, Clock, Zap
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  useNationalRiskSummary,
  useRiskTrends,
  useRiskHotspots,
  useRiskFindings,
} from '@/hooks/useRisk';
import { formatCurrency } from '@/lib/utils';

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const SEVERITY_BG: Record<string, string> = {
  LOW: 'bg-slate-50 text-slate-500',
  MEDIUM: 'bg-amber-50 text-amber-500',
  HIGH: 'bg-orange-50 text-orange-500',
  CRITICAL: 'bg-red-50 text-red-500',
};

const RISK_LEVEL_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  GUARDED: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

function StatCard({
  label,
  value,
  icon,
  color = 'bg-vojas-50 text-vojas-600',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card>
      <CardBody className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500 mt-0.5">{label}</p>
        </div>
      </CardBody>
    </Card>
  );
}

export default function IntelligencePage() {
  const router = useRouter();
  const [trendDays, setTrendDays] = useState(30);

  const { data: summary, isLoading: summaryLoading } = useNationalRiskSummary();
  const { data: trends } = useRiskTrends(trendDays);
  const { data: hotspots } = useRiskHotspots(40, 20);
  const { data: findingsData } = useRiskFindings(undefined, { status: 'NEW' });

  const findings = findingsData?.findings ?? [];
  const hotspotsList = hotspots?.hotspots ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Intelligence</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          AI-powered risk analysis and anomaly detection across all projects
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Projects"
          value={summaryLoading ? '—' : (summary?.totalProjects ?? 0)}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="High Risk"
          value={summaryLoading ? '—' : (summary?.highRiskProjects ?? 0)}
          icon={<ShieldAlert className="h-5 w-5" />}
          color="bg-red-50 text-red-600"
        />
        <StatCard
          label="Unresolved Findings"
          value={summaryLoading ? '—' : (summary?.unresolvedFindings ?? 0)}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Delayed Projects"
          value={summaryLoading ? '—' : (summary?.delayedProjects ?? 0)}
          icon={<Clock className="h-5 w-5" />}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk distribution */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Risk Distribution</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {summaryLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-6 bg-slate-100 rounded animate-pulse flex-1" />
                </div>
              ))
            ) : (
              Object.entries(summary?.riskDistribution ?? {}).map(([level, count]) => (
                <div key={level} className="flex items-center gap-3">
                  <Badge className={`w-24 justify-center ${RISK_LEVEL_COLORS[level] ?? 'bg-slate-100 text-slate-700'}`}>
                    {level}
                  </Badge>
                  <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${RISK_LEVEL_COLORS[level] ?? 'bg-slate-400'} opacity-60`}
                      style={{ width: `${Math.max(4, ((count as number) / Math.max(summary?.totalProjects ?? 1, 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700 w-8 text-right">{count as number}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Top hotspots */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Geographic Hotspots</h2>
            <MapPin className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardBody className="p-0">
            {hotspotsList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No hotspots with risk score ≥ 40 found
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {hotspotsList.slice(0, 6).map((h, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                    onClick={() => {/* TODO: navigate to map with filter */}}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{h.district}, {h.state}</p>
                      <p className="text-xs text-slate-500">{h.projectCount} projects · {h.findingsCount} findings</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-0.5 rounded text-xs font-bold ${SEVERITY_COLORS[h.averageRiskScore >= 60 ? 'CRITICAL' : h.averageRiskScore >= 40 ? 'HIGH' : 'MEDIUM']}`}>
                        {h.averageRiskScore}
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recent findings */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Recent Findings</h2>
            {findings.length > 0 && (
              <Badge variant="danger">{findings.length} new</Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/verification')}>
            View all <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          {findings.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-3 text-green-400" />
              <p className="text-sm font-semibold text-slate-600">No active findings</p>
              <p className="text-xs text-slate-400 mt-1">All clear — no unresolved risk findings</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {findings.slice(0, 8).map((f) => (
                <button
                  key={f.id}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => router.push(`/projects/${f.projectId}?tab=risk`)}
                >
                  <div className="min-w-0 flex-1 mr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-slate-900 truncate">{f.title}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[f.severity] ?? 'bg-slate-100 text-slate-700'}`}>
                        {f.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{f.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{f.riskScore}</p>
                      <p className="text-xs text-slate-400">/ 100</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Methodology note */}
      <Card>
        <CardBody className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">About Risk Analysis</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              VOJAS uses a multi-signal analysis engine that correlates satellite observations,
              financial records, progress reports, citizen feedback, and document data to detect
              potential anomalies. Risk scores reflect the strength and independence of available
              evidence — they do NOT indicate fraud, corruption, or wrongdoing. Every finding
              requires human verification by authorized personnel.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
