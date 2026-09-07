'use client';

/**
 * M14 Admin: System Control Center Home
 * System-wide health overview, active jobs, provider status, security events
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield, Activity, Server, Database, Cloud, Brain, Satellite,
  Clock, AlertTriangle, CheckCircle2, XCircle, RefreshCw,
  Users, FileText, HardDrive, Play, Settings, Eye, ChevronRight,
  Zap, Globe, Lock, BarChart3, Cpu, Timer, TrendingUp, AlertCircle,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn, formatDateTime } from '@/lib/utils';
import { useSystemOverview, useHealthStatus, useAdminJobs, useSecurityEvents, useAdminStats } from '@/hooks/useAdmin';

// Status colors for providers
const PROVIDER_STATUS_COLORS = {
  ONLINE: 'text-emerald-500',
  HEALTHY: 'text-emerald-500',
  DEGRADED: 'text-amber-500',
  DOWN: 'text-red-500',
  OFFLINE: 'text-red-500',
  UNHEALTHY: 'text-red-500',
  UNKNOWN: 'text-slate-400',
};

const PROVIDER_STATUS_BG = {
  ONLINE: 'bg-emerald-50',
  HEALTHY: 'bg-emerald-50',
  DEGRADED: 'bg-amber-50',
  DOWN: 'bg-red-50',
  OFFLINE: 'bg-red-50',
  UNHEALTHY: 'bg-red-50',
  UNKNOWN: 'bg-slate-50',
};

const JOB_STATUS_COLORS = {
  QUEUED: 'bg-blue-100 text-blue-700',
  RUNNING: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  RETRYING: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

export default function AdminCommandCenterPage() {
  const [refreshing, setRefreshing] = useState(false);
  const { data: overview, isLoading: overviewLoading } = useSystemOverview();
  const { data: health } = useHealthStatus();
  const { data: jobsData } = useAdminJobs({ limit: 10 });
  const { data: securityData } = useSecurityEvents({ limit: 10 });
  const { data: stats } = useAdminStats();

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const severityVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (s) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'danger';
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
          <h1 className="text-2xl font-bold text-slate-900">SYSTEM CONTROL CENTER</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time system health, provider status, and operational overview
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

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { href: '/admin/users', icon: Users, label: 'Users', color: 'text-blue-600', bg: 'bg-blue-50' },
          { href: '/admin/roles', icon: Lock, label: 'Roles', color: 'text-purple-600', bg: 'bg-purple-50' },
          { href: '/admin/data-sources', icon: Database, label: 'Data Sources', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { href: '/admin/rules', icon: Settings, label: 'Rules', color: 'text-amber-600', bg: 'bg-amber-50' },
          { href: '/admin/jobs', icon: Play, label: 'Jobs', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { href: '/admin/health', icon: Activity, label: 'Health', color: 'text-red-600', bg: 'bg-red-50' },
          { href: '/admin/ai', icon: Brain, label: 'AI Control', color: 'text-pink-600', bg: 'bg-pink-50' },
          { href: '/admin/satellites', icon: Satellite, label: 'Satellites', color: 'text-cyan-600', bg: 'bg-cyan-50' },
          { href: '/admin/audit', icon: FileText, label: 'Audit Logs', color: 'text-slate-600', bg: 'bg-slate-50' },
          { href: '/admin/security', icon: Lock, label: 'Security', color: 'text-red-600', bg: 'bg-red-50' },
        ].map(({ href, icon: Icon, label, color, bg }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardBody className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
                    <Icon className={cn('h-4 w-4', color)} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      {/* System Health Overview */}
      {overviewLoading ? (
        <Card>
          <CardBody className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-8 bg-slate-100 rounded w-1/2" />
            </div>
          </CardBody>
        </Card>
      ) : overview ? (
        <>
          {/* Overall Status Banner */}
          <Card className={cn(
            'border-2',
            overview.status.overall === 'HEALTHY' && 'border-emerald-200',
            overview.status.overall === 'DEGRADED' && 'border-amber-200',
            overview.status.overall === 'UNHEALTHY' && 'border-red-200'
          )}>
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-16 h-16 rounded-xl flex items-center justify-center',
                    overview.status.overall === 'HEALTHY' && 'bg-emerald-100',
                    overview.status.overall === 'DEGRADED' && 'bg-amber-100',
                    overview.status.overall === 'UNHEALTHY' && 'bg-red-100'
                  )}>
                    {overview.status.overall === 'HEALTHY' && <CheckCircle2 className="h-8 w-8 text-emerald-600" />}
                    {overview.status.overall === 'DEGRADED' && <AlertTriangle className="h-8 w-8 text-amber-600" />}
                    {overview.status.overall === 'UNHEALTHY' && <XCircle className="h-8 w-8 text-red-600" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      System Status: {overview.status.overall}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Health Score: {overview.status.score}/100
                      {' '} | {overview.status.checks.healthy}/{overview.status.checks.total} checks healthy
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {overview.status.checks.healthy} healthy
                      </span>
                      {overview.status.checks.degraded > 0 && (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          {overview.status.checks.degraded} degraded
                        </span>
                      )}
                      {overview.status.checks.unhealthy > 0 && (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          {overview.status.checks.unhealthy} unhealthy
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link href="/admin/health">
                  <Button variant="secondary" size="sm" rightIcon={<ChevronRight className="h-4 w-4" />}>
                    View Details
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          {/* Jobs & Providers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Jobs Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-indigo-500" />
                    <h3 className="text-sm font-semibold text-slate-800">Background Jobs</h3>
                  </div>
                  <Link href="/admin/jobs">
                    <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                <div className="grid grid-cols-2 gap-4 p-4">
                  <div className="text-center p-3 rounded-lg bg-blue-50">
                    <p className="text-2xl font-bold text-blue-600">{overview.jobs.queued}</p>
                    <p className="text-xs text-slate-500 mt-1">Queued</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-50">
                    <p className="text-2xl font-bold text-purple-600">{overview.jobs.active}</p>
                    <p className="text-xs text-slate-500 mt-1">Running</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-50">
                    <p className="text-2xl font-bold text-red-600">{overview.jobs.failed}</p>
                    <p className="text-xs text-slate-500 mt-1">Failed</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-50">
                    <p className="text-2xl font-bold text-amber-600">{overview.jobs.retrying}</p>
                    <p className="text-xs text-slate-500 mt-1">Retrying</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Provider Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-800">Provider Status</h3>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-slate-100">
                  {[
                    { name: 'Database', icon: Database, status: overview.providers.database },
                    { name: 'Satellite', icon: Satellite, status: overview.providers.satellite },
                    { name: 'Map Services', icon: Globe, status: overview.providers.map },
                    { name: 'AI Services', icon: Brain, status: overview.providers.ai },
                  ].map(({ name, icon: Icon, status }) => (
                    <div key={name} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', PROVIDER_STATUS_BG[status] ?? PROVIDER_STATUS_BG.UNKNOWN)}>
                          <Icon className={cn('h-4 w-4', PROVIDER_STATUS_COLORS[status] ?? PROVIDER_STATUS_COLORS.UNKNOWN)} />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{name}</span>
                      </div>
                      <Badge
                        variant={
                          status === 'ONLINE' ? 'success' :
                          status === 'DEGRADED' ? 'warning' :
                          'danger'
                        }
                      >
                        {status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Data & Satellite Processing */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Data Ingestion */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-slate-800">Data Ingestion</h3>
                </div>
              </CardHeader>
              <CardBody>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Last Sync: {overview.dataIngestion.lastSync
                        ? formatDateTime(overview.dataIngestion.lastSync)
                        : 'Never'
                      }
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {overview.dataIngestion.recordsToday.toLocaleString()} records today
                    </p>
                  </div>
                  <Badge
                    variant={
                      overview.dataIngestion.status === 'IDLE' ? 'success' :
                      overview.dataIngestion.status === 'SYNCING' ? 'info' :
                      'danger'
                    }
                  >
                    {overview.dataIngestion.status}
                  </Badge>
                </div>
                <Link href="/admin/data-sources">
                  <Button variant="secondary" size="sm" className="w-full">
                    Manage Data Sources
                  </Button>
                </Link>
              </CardBody>
            </Card>

            {/* Satellite Processing */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Satellite className="h-4 w-4 text-cyan-500" />
                  <h3 className="text-sm font-semibold text-slate-800">Satellite Processing</h3>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{overview.satelliteProcessing.queueDepth}</p>
                    <p className="text-xs text-slate-500">Queue Depth</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{overview.satelliteProcessing.observationsToday}</p>
                    <p className="text-xs text-slate-500">Observations Today</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 mb-4">
                  Avg Processing: {(overview.satelliteProcessing.avgProcessingTime / 1000).toFixed(1)}s
                </div>
                <Link href="/admin/satellites">
                  <Button variant="secondary" size="sm" className="w-full">
                    Manage Satellites
                  </Button>
                </Link>
              </CardBody>
            </Card>
          </div>

          {/* Recent Admin Actions & Security Events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Admin Actions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-800">Recent Admin Actions</h3>
                  </div>
                  <Link href="/admin/audit">
                    <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                {overview.recentAdminActions.length === 0 ? (
                  <div className="p-6 text-center">
                    <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No recent admin actions</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {overview.recentAdminActions.map((action) => (
                      <div key={action.id} className="flex items-start gap-3 p-3">
                        <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700">{action.action}</p>
                          <p className="text-xs text-slate-400">by {action.actor}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(action.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Security Events (Last 24h) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-500" />
                    <h3 className="text-sm font-semibold text-slate-800">Security Events (Last 24h)</h3>
                  </div>
                  <Link href="/admin/security">
                    <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 rounded-lg bg-slate-50">
                    <p className="text-2xl font-bold text-slate-900">{overview.securityEventsLast24h.total}</p>
                    <p className="text-xs text-slate-500">Total</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-50">
                    <p className="text-2xl font-bold text-red-600">{overview.securityEventsLast24h.critical}</p>
                    <p className="text-xs text-slate-500">Critical</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-50">
                    <p className="text-2xl font-bold text-amber-600">{overview.securityEventsLast24h.high}</p>
                    <p className="text-xs text-slate-500">High</p>
                  </div>
                </div>
                <Link href="/admin/security">
                  <Button variant="secondary" size="sm" className="w-full">
                    Security Dashboard
                  </Button>
                </Link>
              </CardBody>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardBody className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Unable to load system overview</p>
            <Button variant="secondary" size="sm" onClick={handleRefresh} className="mt-4">
              Retry
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Live Job Monitor (if jobs exist) */}
      {jobsData?.jobs && jobsData.jobs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-800">Active Job Queue</h3>
              </div>
              <Link href="/admin/jobs">
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                  Monitor Jobs
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Type</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Status</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Created</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsData.jobs.slice(0, 5).map((job) => (
                    <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm font-medium text-slate-700">{job.type}</td>
                      <td className="px-4 py-2">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', JOB_STATUS_COLORS[job.status] ?? JOB_STATUS_COLORS.QUEUED)}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">{formatDateTime(job.createdAt)}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">
                        {job.duration ? `${(job.duration / 1000).toFixed(1)}s` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Stats Footer */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardBody className="p-4 text-center">
              <p className="text-xl font-bold text-slate-900">{stats.projects.total.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Total Projects</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-4 text-center">
              <p className="text-xl font-bold text-red-600">{stats.anomalies.open.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Open Anomalies</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-4 text-center">
              <p className="text-xl font-bold text-blue-600">{stats.reports.total.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Total Reports</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-4 text-center">
              <p className="text-xl font-bold text-purple-600">{stats.users.total.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Total Users</p>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
