'use client';

/**
 * M14 Admin: System Health
 * Real-time health checks, status history, alert thresholds
 */

import { useState } from 'react';
import {
  Activity, RefreshCw, CheckCircle, AlertTriangle, XCircle,
  HelpCircle, Clock, Database, Globe, Brain, Satellite,
  Server, HardDrive, Lock, BarChart3, Timer,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn, formatDateTime } from '@/lib/utils';
import { useHealthStatus, useHealthHistory } from '@/hooks/useAdmin';

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  database: <Database className="h-5 w-5" />,
  api: <Server className="h-5 w-5" />,
  satellite_provider: <Satellite className="h-5 w-5" />,
  map_provider: <Globe className="h-5 w-5" />,
  ai_provider: <Brain className="h-5 w-5" />,
  storage: <HardDrive className="h-5 w-5" />,
  queue: <Timer className="h-5 w-5" />,
  authentication: <Lock className="h-5 w-5" />,
};

const SERVICE_LABELS: Record<string, string> = {
  database: 'Database',
  api: 'API Server',
  satellite_provider: 'Satellite Provider',
  map_provider: 'Map Services',
  ai_provider: 'AI Services',
  storage: 'Storage',
  queue: 'Job Queue',
  authentication: 'Authentication',
};

const STATUS_COLORS = {
  HEALTHY: { text: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  DEGRADED: { text: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
  UNHEALTHY: { text: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
  UNKNOWN: { text: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' },
};

const STATUS_ICONS = {
  HEALTHY: <CheckCircle className="h-5 w-5 text-emerald-500" />,
  DEGRADED: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  UNHEALTHY: <XCircle className="h-5 w-5 text-red-500" />,
  UNKNOWN: <HelpCircle className="h-5 w-5 text-slate-400" />,
};

export default function AdminHealthPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [hoursFilter, setHoursFilter] = useState(24);

  const { data: health, isLoading: healthLoading } = useHealthStatus();
  const { data: history, isLoading: historyLoading } = useHealthHistory(hoursFilter);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-emerald-600';
      case 'DEGRADED': return 'text-amber-600';
      case 'UNHEALTHY': return 'text-red-600';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Activity className="h-4 w-4" />
            <span>System Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">System Health</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time health checks and status history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      {healthLoading ? (
        <Card>
          <CardBody className="p-6 animate-pulse">
            <div className="h-12 bg-slate-100 rounded w-1/3 mb-4" />
            <div className="h-6 bg-slate-50 rounded w-1/2" />
          </CardBody>
        </Card>
      ) : health ? (
        <Card className={cn(
          'border-2',
          health.overall === 'HEALTHY' && 'border-emerald-200',
          health.overall === 'DEGRADED' && 'border-amber-200',
          health.overall === 'UNHEALTHY' && 'border-red-200',
          health.overall === 'UNKNOWN' && 'border-slate-200'
        )}>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-16 h-16 rounded-xl flex items-center justify-center',
                  STATUS_COLORS[health.overall]?.bg ?? STATUS_COLORS.UNKNOWN.bg
                )}>
                  {STATUS_ICONS[health.overall]}
                </div>
                <div>
                  <h2 className={cn('text-xl font-bold', getOverallStatusColor(health.overall))}>
                    System Status: {health.overall}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Last checked: {formatDateTime(health.timestamp)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Health Checks</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold text-emerald-600">
                    {health.checks.filter((c) => c.status === 'HEALTHY').length}
                  </span>
                  <span className="text-slate-300">/</span>
                  <span className="text-lg font-bold text-slate-600">
                    {health.checks.length}
                  </span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* Individual Health Checks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800">Service Health</h3>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {healthLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : !health || health.checks.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No health checks configured</p>
              <p className="text-slate-400 text-sm mt-1">
                Health checks are not available.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {health.checks.map((check) => {
                const colors = STATUS_COLORS[check.status] ?? STATUS_COLORS.UNKNOWN;
                const icon = SERVICE_ICONS[check.service.toLowerCase()] ?? <Server className="h-5 w-5" />;
                const label = SERVICE_LABELS[check.service.toLowerCase()] ?? check.service;

                return (
                  <div key={check.service} className="p-4 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          colors.bg
                        )}>
                          <span className={colors.text}>
                            {icon}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">{label}</h4>
                          <p className="text-xs text-slate-500">
                            Last check: {formatDateTime(check.lastCheck)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {check.latencyMs !== null && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-900">
                              {check.latencyMs}ms
                            </p>
                            <p className="text-xs text-slate-500">Latency</p>
                          </div>
                        )}
                        <div className={cn(
                          'w-24 px-3 py-1.5 rounded-full border text-center',
                          colors.bg,
                          colors.border
                        )}>
                          <span className={cn('text-sm font-medium', colors.text)}>
                            {check.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    {check.message && (
                      <div className="mt-2 ml-13 p-2 bg-slate-50 rounded border border-slate-200">
                        <p className="text-xs text-slate-600">{check.message}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Health History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800">Health History</h3>
            </div>
            <select
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
              value={hoursFilter}
              onChange={(e) => setHoursFilter(Number(e.target.value))}
            >
              <option value={6}>Last 6 hours</option>
              <option value={12}>Last 12 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={48}>Last 48 hours</option>
            </select>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {historyLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <div className="p-12 text-center">
              <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No health history available</p>
            </div>
          ) : (
            <div className="p-4">
              {/* Timeline Chart */}
              <div className="flex items-end gap-1 h-32">
                {history.map((point, index) => {
                  const pointTotal = point.healthyCount + point.degradedCount + point.unhealthyCount;
                  const healthyPct = (point.healthyCount / Math.max(pointTotal, 1)) * 100;
                  const degradedPct = (point.degradedCount / Math.max(pointTotal, 1)) * 100;
                  const unhealthyPct = (point.unhealthyCount / Math.max(pointTotal, 1)) * 100;

                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col justify-end group relative cursor-pointer"
                      title={`${formatDateTime(point.timestamp)}: ${point.healthyCount} healthy, ${point.degradedCount} degraded, ${point.unhealthyCount} unhealthy`}
                    >
                      <div className="flex flex-col justify-end gap-0.5 h-full">
                        <div
                          className="bg-red-400 rounded-t"
                          style={{ height: `${unhealthyPct}%`, minHeight: unhealthyPct > 0 ? '4px' : '0' }}
                        />
                        <div
                          className="bg-amber-400"
                          style={{ height: `${degradedPct}%`, minHeight: degradedPct > 0 ? '4px' : '0' }}
                        />
                        <div
                          className="bg-emerald-400 rounded-b"
                          style={{ height: `${healthyPct}%`, minHeight: healthyPct > 0 ? '4px' : '0' }}
                        />
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {formatDateTime(point.timestamp)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-400" />
                  <span className="text-xs text-slate-500">Healthy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-amber-400" />
                  <span className="text-xs text-slate-500">Degraded</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-400" />
                  <span className="text-xs text-slate-500">Unhealthy</span>
                </div>
              </div>

              {/* History Table */}
              <div className="mt-6 max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 text-slate-500 font-medium">Time</th>
                      <th className="text-center py-2 text-slate-500 font-medium">Status</th>
                      <th className="text-center py-2 text-slate-500 font-medium">Healthy</th>
                      <th className="text-center py-2 text-slate-500 font-medium">Degraded</th>
                      <th className="text-center py-2 text-slate-500 font-medium">Unhealthy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((point, index) => (
                      <tr key={index} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 text-slate-600">{formatDateTime(point.timestamp)}</td>
                        <td className="py-2 text-center">
                          <Badge
                            variant={
                              point.unhealthyCount > 0 ? 'danger' :
                              point.degradedCount > 0 ? 'warning' : 'success'
                            }
                          >
                            {point.unhealthyCount > 0 ? 'UNHEALTHY' :
                             point.degradedCount > 0 ? 'DEGRADED' : 'HEALTHY'}
                          </Badge>
                        </td>
                        <td className="py-2 text-center text-emerald-600">{point.healthyCount}</td>
                        <td className="py-2 text-center text-amber-600">{point.degradedCount}</td>
                        <td className="py-2 text-center text-red-600">{point.unhealthyCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
