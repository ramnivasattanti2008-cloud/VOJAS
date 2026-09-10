'use client';

/**
 * SectorDashboard — M13 Reusable Sector Dashboard Component
 *
 * Powers ALL 16 sectors with the same architecture.
 * Receives sector configuration and data as props — no sector-specific logic.
 */

import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SourcePanel } from '@/components/transparency/SourcePanel';
import { InformationClassificationBanner } from '@/components/transparency/InformationClassificationBanner';
import { cn, formatCurrency } from '@/lib/utils';
import type { SectorConfig, SectorProjectStats } from '@vojas/api-client';
import {
  TrendingUp, TrendingDown, AlertTriangle, FileText, MapPin, BarChart3,
  Shield, Activity, Database, Satellite, Info, ChevronRight, ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface SectorDashboardProps {
  sector: SectorConfig;
  stats?: SectorProjectStats;
  alerts?: any[];
  recentReports?: any[];
  isLoading?: boolean;
  lastUpdated?: string;
}

// ── Indicator Type Badge ─────────────────────────────────────────────────────

function IndicatorTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    DIRECT: 'bg-slate-100 text-slate-600',
    DERIVED: 'bg-blue-50 text-blue-600',
    SATELLITE: 'bg-emerald-50 text-emerald-600',
    AI_INTERPRETED: 'bg-purple-50 text-purple-600',
    HUMAN_VERIFIED: 'bg-amber-50 text-amber-600',
  };
  const labels: Record<string, string> = {
    DIRECT: 'SOURCE DATA',
    DERIVED: 'DERIVED',
    SATELLITE: 'SATELLITE',
    AI_INTERPRETED: 'AI-INTERPRETED',
    HUMAN_VERIFIED: 'HUMAN-VERIFIED',
  };
  return (
    <span className={cn('text-xs px-1.5 py-0.5 rounded font-mono', styles[type] ?? 'bg-slate-100 text-slate-500')}>
      {labels[type] ?? type}
    </span>
  );
}

// ── Data Availability Badge ──────────────────────────────────────────────────

function DataAvailBadge({ avail }: { avail: string }) {
  const styles: Record<string, string> = {
    AVAILABLE: 'bg-green-50 text-green-700 border-green-200',
    PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
    STALE: 'bg-red-50 text-red-700 border-red-200',
    UNAVAILABLE: 'bg-slate-50 text-slate-500 border-slate-200',
    REQUIRES_AUTH: 'bg-slate-50 text-slate-500 border-slate-200',
    NOT_APPLICABLE: 'bg-slate-50 text-slate-500 border-slate-200',
  };
  return (
    <span className={cn('text-xs px-1.5 py-0.5 rounded border font-mono', styles[avail] ?? styles.UNAVAILABLE)}>
      {avail?.replace(/_/g, ' ')}
    </span>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ label, value, sublabel, icon: Icon, color, source }: {
  label: string; value: string | number; sublabel?: string;
  icon: typeof TrendingUp; color: string; source?: string;
}) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', `${color}/10`)}>
            <Icon className={cn('h-4 w-4', color)} />
          </div>
          {source && <span className="text-xs text-slate-500">{source}</span>}
        </div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
      </CardBody>
    </Card>
  );
}

// ── Indicator Row ────────────────────────────────────────────────────────────

function IndicatorRow({ indicator, currentValue }: {
  indicator: SectorConfig['indicators'][0];
  currentValue?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-700">{indicator.name}</p>
          <IndicatorTypeBadge type={indicator.type} />
          <DataAvailBadge avail={indicator.dataAvailability} />
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{indicator.description}</p>
        {indicator.dataNote && (
          <p className="text-xs text-slate-500 italic mt-0.5">{indicator.dataNote}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-mono text-slate-600">
          {currentValue != null ? `${currentValue} ${indicator.unit}` : `— ${indicator.unit}`}
        </p>
        <p className="text-xs text-slate-500">Source: {indicator.source}</p>
      </div>
    </div>
  );
}

// ── Risk Rule Row ────────────────────────────────────────────────────────────

function RiskRuleRow({ rule }: { rule: SectorConfig['riskRules'][0] }) {
  const severityColor: Record<string, string> = {
    LOW: 'text-green-600 bg-green-50',
    MEDIUM: 'text-amber-600 bg-amber-50',
    HIGH: 'text-red-600 bg-red-50',
    CRITICAL: 'text-red-800 bg-red-100',
  };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <AlertTriangle className={cn('h-4 w-4 shrink-0 mt-0.5',
        rule.severity === 'CRITICAL' ? 'text-red-700' :
        rule.severity === 'HIGH' ? 'text-red-500' :
        rule.severity === 'MEDIUM' ? 'text-amber-500' : 'text-green-500'
      )} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-700">{rule.name}</p>
          <span className={cn('text-xs px-1.5 py-0.5 rounded font-mono', severityColor[rule.severity])}>
            {rule.severity}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{rule.description}</p>
        <div className="flex gap-1 mt-1 flex-wrap">
          {rule.signals.map((sig) => (
            <span key={sig} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
              {sig.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Map Layer Row ────────────────────────────────────────────────────────────

function MapLayerRow({ layer }: { layer: SectorConfig['mapLayers'][0] }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700">{layer.name}</p>
        <p className="text-xs text-slate-400">{layer.description}</p>
      </div>
      <div className="shrink-0">
        <DataAvailBadge avail={layer.dataAvailability} />
      </div>
    </div>
  );
}

// ── Data Source Row ─────────────────────────────────────────────────────────

function DataSourceRow({ source }: { source: SectorConfig['dataSources'][0] }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <Database className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-700">{source.name}</p>
          {source.apiAvailable && (
            <Badge variant="success" className="text-xs">API Available</Badge>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {source.officialSource} — {source.dataset}
        </p>
        <div className="flex gap-3 mt-1">
          <span className="text-xs text-slate-400">Dept: {source.department}</span>
          <span className="text-xs text-slate-400">Updates: {source.updateFrequency}</span>
        </div>
        {source.dataNote && (
          <p className="text-xs text-amber-600 mt-1 italic">{source.dataNote}</p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function SectorDashboard({ sector, stats, alerts, recentReports, isLoading, lastUpdated }: SectorDashboardProps) {
  const utilization = stats?.totalAmount && stats.totalAmount > 0
    ? ((stats.spentAmount / stats.totalAmount) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardBody className="p-6 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => <div key={j} className="h-4 bg-slate-100 rounded" />)}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          label="Total Projects"
          value={stats?.total?.toLocaleString() ?? '—'}
          icon={MapPin}
          color="text-indigo-600"
        />
        <KPICard
          label="Completed"
          value={stats?.completed?.toLocaleString() ?? '—'}
          icon={TrendingUp}
          color="text-emerald-600"
        />
        <KPICard
          label="In Progress"
          value={stats?.inProgress?.toLocaleString() ?? '—'}
          icon={Activity}
          color="text-blue-600"
        />
        <KPICard
          label="Fund Utilization"
          value={utilization > 0 ? `${utilization.toFixed(1)}%` : '—'}
          icon={BarChart3}
          color={utilization > 80 ? 'text-emerald-600' : 'text-amber-600'}
        />
      </div>

      {/* Financial Summary */}
      {stats?.totalAmount && stats.totalAmount > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-800">Financial Summary</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Total Sanctioned</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Total Spent</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(stats.spentAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Unspent Balance</p>
                <p className="text-lg font-bold text-amber-600">
                  {formatCurrency(stats.totalAmount - stats.spentAmount)}
                </p>
              </div>
            </div>
            {/* Utilization bar */}
            <div className="mt-4">
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', utilization > 80 ? 'bg-emerald-500' : 'bg-indigo-500')}
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Indicators */}
      {sector.indicators.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Sector Indicators</h3>
              <span className="text-xs text-slate-400">{sector.indicators.length} configured</span>
            </div>
          </CardHeader>
          <CardBody className="p-0 px-4">
            {sector.indicators.map((ind) => (
              <IndicatorRow key={ind.id} indicator={ind} />
            ))}
          </CardBody>
        </Card>
      )}

      {/* Risk Rules */}
      {sector.riskRules.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Risk Rules</h3>
              <Badge variant="warning" className="text-xs">
                {sector.riskRules.length} rules
              </Badge>
            </div>
          </CardHeader>
          <CardBody className="p-0 px-4">
            {sector.riskRules.map((rule) => (
              <RiskRuleRow key={rule.id} rule={rule} />
            ))}
          </CardBody>
        </Card>
      )}

      {/* Map Layers */}
      {sector.mapLayers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Map Layers</h3>
              <Link href={`/map-view?sector=${sector.code}`}>
                <Button variant="ghost" size="sm" rightIcon={<ExternalLink className="h-3.5 w-3.5" />}>
                  Open Map
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0 px-4">
            {sector.mapLayers.map((layer) => (
              <MapLayerRow key={layer.id} layer={layer} />
            ))}
          </CardBody>
        </Card>
      )}

      {/* Data Sources */}
      {sector.dataSources.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Data Sources</h3>
              <span className="text-xs text-slate-400">
                {sector.dataSources.filter((d) => d.apiAvailable).length}/{sector.dataSources.length} with API
              </span>
            </div>
          </CardHeader>
          <CardBody className="p-0 px-4">
            {sector.dataSources.map((source) => (
              <DataSourceRow key={source.id} source={source} />
            ))}
          </CardBody>
        </Card>
      )}

      {/* AI Context */}
      {sector.aiContext && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-800">AI Intelligence Context</h3>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-slate-600 mb-3">{sector.aiContext.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Key Questions</p>
                <ul className="space-y-1">
                  {sector.aiContext.keyQuestions.map((q, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="text-indigo-400 mt-0.5">→</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Available Metrics</p>
                <div className="flex flex-wrap gap-1">
                  {sector.aiContext.availableMetrics.map((m) => (
                    <span key={m} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                      {m}
                    </span>
                  ))}
                </div>
                {sector.aiContext.typicalAlerts.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-slate-500 mb-1.5 mt-3">Typical Alerts</p>
                    <div className="flex flex-wrap gap-1">
                      {sector.aiContext.typicalAlerts.map((a) => (
                        <span key={a} className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                          {a}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Source Panel */}
      <SourcePanel lastUpdated={lastUpdated} className="mt-4" />
    </div>
  );
}
