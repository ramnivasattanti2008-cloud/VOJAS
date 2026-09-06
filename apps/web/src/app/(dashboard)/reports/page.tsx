'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, CheckCircle, AlertCircle, Clock, Search, Filter, X, Eye } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useCitizenReports } from '@/hooks/useCitizenReports';
import { REPORT_STATUS_LABELS, REPORT_CATEGORY_LABELS } from '@vojas/api-client';
import { formatDate } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  SUBMITTED: 'info',
  RECEIVED: 'info',
  TRIAGED: 'info',
  PROJECT_MATCHED: 'info',
  REVIEW_QUEUE: 'warning',
  UNDER_VERIFICATION: 'warning',
  VERIFIED: 'success',
  RESOLVED: 'success',
  DISMISSED: 'neutral',
  ESCALATED: 'danger',
};

const TRIAGE_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  CATEGORY_SUGGESTED: 'info',
  PROJECT_MATCHED: 'info',
  CLAIMS_EXTRACTED: 'info',
  DUPLICATES_CHECKED: 'info',
  COMPLETED: 'success',
  FAILED: 'danger',
};

export default function ReportsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [triageFilter, setTriageFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useCitizenReports({
    status: statusFilter || undefined,
    triageStatus: triageFilter || undefined,
    limit: 50,
  });

  const reports = data?.data ?? [];
  const total = data?.total ?? 0;

  const pendingCount = reports.filter((r) => r.triageStatus === 'PENDING').length;
  const reviewCount = reports.filter(
    (r) => r.status === 'REVIEW_QUEUE' || r.status === 'UNDER_VERIFICATION'
  ).length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED' || r.status === 'VERIFIED').length;

  const hasFilters = !!(statusFilter || triageFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Citizen Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? 'Loading...' : `${total} reports found`}
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/admin/reports')}>
          Admin View
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
              <p className="text-sm text-slate-500 mt-0.5">Pending Triage</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{reviewCount}</p>
              <p className="text-sm text-slate-500 mt-0.5">Under Review</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 text-green-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{resolvedCount}</p>
              <p className="text-sm text-slate-500 mt-0.5">Resolved/Verified</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            aria-label="Search reports"
          />
        </div>

        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          leftIcon={<Filter className="h-4 w-4" />}
          onClick={() => setShowFilters((s) => !s)}
        >
          Filters
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setTriageFilter('');
            }}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white rounded-xl border border-slate-200">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Status</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="RECEIVED">Received</option>
              <option value="REVIEW_QUEUE">Review Queue</option>
              <option value="UNDER_VERIFICATION">Under Verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Triage Status</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
              value={triageFilter}
              onChange={(e) => setTriageFilter(e.target.value)}
            >
              <option value="">All triage statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </CardBody>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load reports'}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="space-y-2">
                <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
                <div className="h-3 bg-slate-50 rounded animate-pulse w-2/3" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <FileText className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No reports found</p>
            <p className="text-xs text-slate-400 mt-1">
              {hasFilters ? 'Try adjusting your filters' : 'No reports submitted yet'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports
            .filter((r) =>
              search
                ? r.title.toLowerCase().includes(search.toLowerCase()) ||
                  r.reportReference.toLowerCase().includes(search.toLowerCase()) ||
                  r.description.toLowerCase().includes(search.toLowerCase())
                : true
            )
            .map((r) => (
              <Card key={r.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-slate-500">{r.reportReference}</span>
                        <h3 className="font-semibold text-slate-900">{r.title}</h3>
                        <Badge variant={STATUS_VARIANT[r.status] ?? 'neutral'}>
                          {REPORT_STATUS_LABELS[r.status] || r.status}
                        </Badge>
                        <Badge variant={TRIAGE_STATUS_VARIANT[r.triageStatus] ?? 'neutral'}>
                          {r.triageStatus.replace(/_/g, ' ')}
                        </Badge>
                        {r.isAnonymous && <Badge variant="neutral">Anonymous</Badge>}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{r.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                        <span className="font-mono">
                          {REPORT_CATEGORY_LABELS[r.category] || r.category}
                        </span>
                        {r.project && <span>Project: {r.project.name}</span>}
                        <span>{formatDate(r.submittedAt)}</span>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/reports/${r.id}`)}
                      leftIcon={<Eye className="h-4 w-4" />}
                    >
                      View
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
