'use client';

/**
 * Admin Dashboard — System overview, stats, audit trail, alerts, user management
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3, AlertTriangle, Users, FileText, MapPin, DollarSign,
  Satellite, Shield, Clock, TrendingUp, Activity, CheckCircle2,
  XCircle, Eye, ChevronRight, RefreshCw, Settings,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';
import { useAdminStats, useAdminAudit, useAdminAlerts, useAdminActivity } from '@/hooks/useAdmin';

export default function AdminPage() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: audit, isLoading: auditLoading } = useAdminAudit({ limit: 20 });
  const { data: alerts, isLoading: alertsLoading } = useAdminAlerts({ limit: 10 });
  const { data: activity, isLoading: activityLoading } = useAdminActivity({ days: 7 });

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
    router.refresh();
  };

  const severityVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (s) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Shield className="h-4 w-4" />
            <span>System Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            System-wide statistics, audit trail, risk alerts, and user management.
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
          <Link href="/admin/reports">
            <Button variant="secondary" size="sm" leftIcon={<FileText className="h-4 w-4" />}>
              Citizen Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* System Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardBody className="p-4 animate-pulse">
              <div className="h-8 bg-slate-200 rounded mb-2" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
            </CardBody></Card>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Project / Anomaly / Report / User stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={MapPin}
              label="Total Projects"
              value={stats.projects.total.toLocaleString()}
              sublabel={`${stats.projects.completed} completed · ${stats.projects.inProgress} in progress`}
              color="text-indigo-600"
              bgColor="bg-indigo-50"
            />
            <StatCard
              icon={AlertTriangle}
              label="Anomalies"
              value={stats.anomalies.total.toLocaleString()}
              sublabel={`${stats.anomalies.open} open · ${stats.anomalies.resolvedRate.toFixed(0)}% resolved`}
              color="text-red-600"
              bgColor="bg-red-50"
            />
            <StatCard
              icon={FileText}
              label="Reports"
              value={stats.reports.total.toLocaleString()}
              sublabel={`${stats.reports.pending} pending review`}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <StatCard
              icon={Users}
              label="Users"
              value={stats.users.total.toLocaleString()}
              sublabel={`${stats.users.active} active`}
              color="text-emerald-600"
              bgColor="bg-emerald-50"
            />
          </div>

          {/* Financial / Satellite / Vendors */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={DollarSign}
              label="Total Sanctioned"
              value={formatCurrency(stats.financial.totalSanctioned)}
              sublabel={`${stats.financial.utilizationRate.toFixed(1)}% utilized`}
              color="text-amber-600"
              bgColor="bg-amber-50"
            />
            <StatCard
              icon={DollarSign}
              label="Total Spent"
              value={formatCurrency(stats.financial.totalSpent)}
              sublabel={`${formatCurrency(stats.financial.totalSanctioned - stats.financial.totalSpent)} unspent`}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <StatCard
              icon={Satellite}
              label="Satellite Obs"
              value={stats.satellite.totalObservations.toLocaleString()}
              sublabel="Sentinel-2 observations"
              color="text-purple-600"
              bgColor="bg-purple-50"
            />
            <StatCard
              icon={Activity}
              label="Vendors"
              value={stats.vendors.total.toLocaleString()}
              sublabel="registered vendors"
              color="text-slate-600"
              bgColor="bg-slate-50"
            />
          </div>

          {/* Project completion rate bar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Project Status Overview</h3>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Completed: {stats.projects.completed}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    In Progress: {stats.projects.inProgress}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Delayed: {stats.projects.delayed}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex gap-1 h-4 rounded-full overflow-hidden">
                {stats.projects.total > 0 && (
                  <>
                    <div
                      className="bg-emerald-500 transition-all"
                      style={{ width: `${(stats.projects.completed / stats.projects.total) * 100}%` }}
                    />
                    <div
                      className="bg-blue-500 transition-all"
                      style={{ width: `${(stats.projects.inProgress / stats.projects.total) * 100}%` }}
                    />
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${(stats.projects.delayed / stats.projects.total) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400">Completion rate: {stats.projects.completionRate.toFixed(1)}%</span>
                <span className="text-xs text-slate-400">Total: {stats.projects.total.toLocaleString()} projects</span>
              </div>
            </CardBody>
          </Card>
        </>
      ) : null}

      {/* Two-column layout: Alerts + Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-semibold text-slate-800">Active Risk Alerts</h3>
              </div>
              <Link href="/alerts">
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {alertsLoading ? (
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}
              </div>
            ) : alerts?.openAnomalies?.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No active alerts</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(alerts?.recentHighSeverity ?? []).map((alert: any) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 hover:bg-slate-50">
                    <AlertTriangle className={cn('h-4 w-4 shrink-0 mt-0.5',
                      alert.severity === 'CRITICAL' ? 'text-red-700' :
                      alert.severity === 'HIGH' ? 'text-red-500' : 'text-amber-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{alert.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={severityVariant(alert.severity)} className="text-xs">{alert.severity}</Badge>
                        <span className="text-xs text-slate-400">{alert.category?.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Anomaly breakdown */}
                {alerts?.byCategory && alerts.byCategory.length > 0 && (
                  <div className="p-3 bg-slate-50">
                    <p className="text-xs font-medium text-slate-500 mb-2">By Category</p>
                    <div className="space-y-1">
                      {alerts.byCategory.map((b: any) => (
                        <div key={b.category} className="flex justify-between items-center">
                          <span className="text-xs text-slate-600">{b.category?.replace(/_/g, ' ')}</span>
                          <Badge variant="neutral" className="text-xs">{b.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Audit Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-800">Recent Audit Events</h3>
              </div>
              <span className="text-xs text-slate-400">{audit?.length ?? 0} events</span>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {auditLoading ? (
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />)}
              </div>
            ) : !audit || audit.length === 0 ? (
              <div className="p-6 text-center">
                <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No audit events yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {audit.map((event: any) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 hover:bg-slate-50">
                    <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0',
                      event.action === 'DELETE' ? 'bg-red-400' :
                      event.action === 'CREATE' ? 'bg-emerald-400' :
                      event.action === 'UPDATE' ? 'bg-blue-400' : 'bg-slate-400'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-medium text-slate-700">
                          {event.actorType === 'USER' ? event.actorId?.split('-')[0] ?? 'User' : event.actorType}
                        </p>
                        <Badge variant="neutral" className="text-xs">{event.action}</Badge>
                        <span className="text-xs text-slate-400">{event.entityType}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDateTime(event.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Activity Summary */}
      {activity && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-800">Activity — Last {activity.period.days} Days</h3>
              </div>
              <span className="text-xs text-slate-400">Since {formatDateTime(activity.period.since)}</span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'New Projects', value: activity.summary.newProjects, icon: MapPin, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'New Reports', value: activity.summary.newReports, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'New Anomalies', value: activity.summary.newAnomalies, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
                { label: 'Resolved', value: activity.summary.resolvedAnomalies, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'New Users', value: activity.summary.newUsers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Audit Events', value: activity.summary.auditEvents, icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className={cn('rounded-lg p-3', bg)}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={cn('h-3.5 w-3.5', color)} />
                    <span className="text-xs text-slate-500">{label}</span>
                  </div>
                  <p className={cn('text-xl font-bold', color)}>{value?.toLocaleString() ?? 0}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sublabel, color, bgColor }: {
  icon: any;
  label: string;
  value: string;
  sublabel?: string;
  color: string;
  bgColor: string;
}) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bgColor)}>
            <Icon className={cn('h-4 w-4', color)} />
          </div>
        </div>
        <p className={cn('text-xl font-bold', color)}>{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        {sublabel && <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>}
      </CardBody>
    </Card>
  );
}
