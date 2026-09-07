'use client';

/**
 * M14 Admin: Background Jobs Monitor
 * Job list, status filtering, retry/cancel operations
 */

import { useState } from 'react';
import {
  Play, RefreshCw, Search, Timer, Clock, CheckCircle,
  XCircle, RotateCcw, X, AlertCircle, PauseCircle, Loader2,
  Filter,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn, formatDateTime } from '@/lib/utils';
import { useAdminJobs, useRetryJob, useCancelJob } from '@/hooks/useAdmin';

const JOB_STATUS_COLORS: Record<string, string> = {
  QUEUED: 'bg-blue-100 text-blue-700 border-blue-200',
  RUNNING: 'bg-purple-100 text-purple-700 border-purple-200',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
  RETRYING: 'bg-amber-100 text-amber-700 border-amber-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
};

const JOB_STATUS_ICONS: Record<string, React.ReactNode> = {
  QUEUED: <Clock className="h-4 w-4 text-blue-500" />,
  RUNNING: <Play className="h-4 w-4 text-purple-500" />,
  COMPLETED: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  FAILED: <XCircle className="h-4 w-4 text-red-500" />,
  RETRYING: <RotateCcw className="h-4 w-4 text-amber-500" />,
  CANCELLED: <PauseCircle className="h-4 w-4 text-slate-500" />,
};

export default function AdminJobsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useAdminJobs({
    page,
    limit: 50,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
  });

  const retryMutation = useRetryJob();
  const cancelMutation = useCancelJob();

  const jobs = data?.jobs ?? [];
  const pagination = data?.pagination;
  const summary = data?.summary;

  const filteredJobs = jobs.filter((job) =>
    !search ||
    job.type.toLowerCase().includes(search.toLowerCase()) ||
    job.projectName?.toLowerCase().includes(search.toLowerCase()) ||
    job.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleRetry = async (jobId: string) => {
    setRetryingId(jobId);
    try {
      await retryMutation.mutateAsync(jobId);
      setError(null);
    } catch {
      setError('Failed to retry job');
    } finally {
      setRetryingId(null);
    }
  };

  const handleCancel = async (jobId: string) => {
    if (!confirm('Are you sure you want to cancel this job?')) return;
    setCancellingId(jobId);
    try {
      await cancelMutation.mutateAsync(jobId);
      setError(null);
    } catch {
      setError('Failed to cancel job');
    } finally {
      setCancellingId(null);
    }
  };

  const jobTypes = [...new Set(jobs.map((j) => j.type))];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Play className="h-4 w-4" />
            <span>System Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Background Jobs Monitor</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor, retry, and manage background processing jobs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Job Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Queued', value: summary.byStatus.QUEUED ?? 0, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Running', value: summary.byStatus.RUNNING ?? 0, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Completed', value: summary.byStatus.COMPLETED ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Failed', value: summary.byStatus.FAILED ?? 0, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Retrying', value: summary.byStatus.RETRYING ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Cancelled', value: summary.byStatus.CANCELLED ?? 0, color: 'text-slate-600', bg: 'bg-slate-50' },
          ].map(({ label, value, color, bg }) => (
            <Card key={label}>
              <CardBody className="p-3 text-center">
                <p className={cn('text-xl font-bold', color)}>{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search jobs by type or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
          />
        </div>
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          size="sm"
          leftIcon={<Filter className="h-4 w-4" />}
          onClick={() => setShowFilters((s) => !s)}
        >
          Filters
        </Button>
        {(statusFilter || typeFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setTypeFilter('');
            }}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white rounded-xl border border-slate-200 -mt-2">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Status</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="QUEUED">Queued</option>
              <option value="RUNNING">Running</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="RETRYING">Retrying</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Job Type</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              {jobTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </CardBody>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="hover:text-red-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Jobs Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-12 text-center">
              <Play className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No jobs found</p>
              <p className="text-slate-400 text-sm mt-1">
                {statusFilter || typeFilter || search
                  ? 'Try adjusting your filters'
                  : 'No background jobs currently'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Type</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Status</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Project</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Created</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Started</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Duration</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Retries</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900">{job.type}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{job.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {JOB_STATUS_ICONS[job.status]}
                          <span className={cn(
                            'inline-flex px-2 py-0.5 rounded-full text-xs font-medium border',
                            JOB_STATUS_COLORS[job.status] ?? JOB_STATUS_COLORS.QUEUED
                          )}>
                            {job.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {job.projectName || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDateTime(job.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {job.startedAt ? formatDateTime(job.startedAt) : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {job.duration ? `${(job.duration / 1000).toFixed(1)}s` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {job.retryCount}/{job.maxRetries}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {(job.status === 'FAILED' || job.status === 'RETRYING') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleRetry(job.id)}
                              disabled={retryingId === job.id}
                              leftIcon={retryingId === job.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                            >
                              Retry
                            </Button>
                          )}
                          {job.status === 'RUNNING' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCancel(job.id)}
                              disabled={cancellingId === job.id}
                              leftIcon={cancellingId === job.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Error Details */}
      {filteredJobs.some((j) => j.error && j.status === 'FAILED') && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-semibold text-slate-800">Failed Job Errors</h3>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-slate-100">
              {filteredJobs
                .filter((j) => j.error && j.status === 'FAILED')
                .map((job) => (
                  <div key={job.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-900">{job.type}</span>
                        <span className="text-xs text-slate-400 font-mono">{job.id.slice(0, 8)}</span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRetry(job.id)}
                        disabled={retryingId === job.id}
                        leftIcon={<RotateCcw className="h-3 w-3" />}
                      >
                        Retry
                      </Button>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 font-mono whitespace-pre-wrap">{job.error}</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
