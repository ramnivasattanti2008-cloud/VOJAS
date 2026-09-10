'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, CheckCircle, AlertCircle, Clock, Search, Filter,
  X, Eye, Plus, ChevronRight, RefreshCw
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCitizenReports } from '@/hooks/useCitizenReports';
import { REPORT_STATUS_LABELS, REPORT_CATEGORY_LABELS } from '@vojas/api-client';
import { formatDate, cn } from '@/lib/utils';

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

const TAB_FILTERS = [
  { key: 'all', label: 'All', icon: FileText, color: 'text-slate-600' },
  { key: 'active', label: 'Active', icon: Clock, color: 'text-amber-600' },
  { key: 'submitted', label: 'Submitted', icon: AlertCircle, color: 'text-blue-600' },
  { key: 'review', label: 'Under Review', icon: RefreshCw, color: 'text-purple-600' },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'text-green-600' },
];

// Report Card Component
function ReportCard({ report, onClick }: { report: any; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-vojas-200 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {report.reportReference}
            </span>
            <Badge variant={STATUS_VARIANT[report.status] ?? 'neutral'}>
              {REPORT_STATUS_LABELS[report.status] || report.status}
            </Badge>
            {report.isAnonymous && (
              <Badge variant="neutral">Anonymous</Badge>
            )}
          </div>
          <h3 className="font-semibold text-slate-900 mt-2 line-clamp-1">
            {report.title}
          </h3>
        </div>
        <Eye className="h-5 w-5 text-slate-400 flex-shrink-0" />
      </div>

      <p className="text-sm text-slate-600 line-clamp-2 mb-3">
        {report.description}
      </p>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium">
          {REPORT_CATEGORY_LABELS[report.category] || report.category}
        </span>
        <span>{formatDate(report.submittedAt)}</span>
      </div>

      {report.project && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Related to: <span className="text-vojas-600 font-medium">{report.project.name}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// Loading Skeleton
function ReportListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i}>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex justify-between pt-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export default function CitizenReportsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Build filters based on active tab
  const buildFilters = () => {
    const filters: any = { limit: 50 };

    switch (activeTab) {
      case 'active':
        filters.status = 'SUBMITTED,RECEIVED,TRIAGED,PROJECT_MATCHED';
        break;
      case 'submitted':
        filters.status = 'SUBMITTED';
        break;
      case 'review':
        filters.status = 'REVIEW_QUEUE,UNDER_VERIFICATION';
        break;
      case 'resolved':
        filters.status = 'RESOLVED,VERIFIED,DISMISSED';
        break;
    }

    if (statusFilter) filters.status = statusFilter;
    if (categoryFilter) filters.category = categoryFilter;

    return filters;
  };

  const { data, isLoading, error, refetch } = useCitizenReports(buildFilters());
  const reports = data?.data ?? [];
  const total = data?.total ?? 0;

  // Filter by search
  const filteredReports = reports.filter((r: any) =>
    search
      ? r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.reportReference.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase())
      : true
  );

  // Calculate tab counts
  const counts = {
    all: reports.length,
    active: reports.filter((r: any) =>
      ['SUBMITTED', 'RECEIVED', 'TRIAGED', 'PROJECT_MATCHED'].includes(r.status)
    ).length,
    submitted: reports.filter((r: any) => r.status === 'SUBMITTED').length,
    review: reports.filter((r: any) =>
      ['REVIEW_QUEUE', 'UNDER_VERIFICATION'].includes(r.status)
    ).length,
    resolved: reports.filter((r: any) =>
      ['RESOLVED', 'VERIFIED', 'DISMISSED'].includes(r.status)
    ).length,
  };

  const hasFilters = !!(statusFilter || categoryFilter || search);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Reports</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isLoading ? 'Loading...' : `${total} reports found`}
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => router.push('/reports/new')}
        >
          New Report
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {TAB_FILTERS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-vojas-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-white' : tab.color)} />
              {tab.label}
              {!isLoading && counts[tab.key as keyof typeof counts] > 0 && (
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs',
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                )}>
                  {counts[tab.key as keyof typeof counts]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search and Filters */}
      <CardBody className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search reports by title or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            aria-label="Search reports"
          />
        </div>

        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          onClick={() => setShowFilters((s) => !s)}
          leftIcon={<Filter className="h-4 w-4" />}
        >
          Filters
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setCategoryFilter('');
              setSearch('');
            }}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
      </CardBody>

      {/* Filter Panel */}
      {showFilters && (
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-xl border border-slate-200 p-4">
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
              <option value="TRIAGED">Triaged</option>
              <option value="REVIEW_QUEUE">Review Queue</option>
              <option value="UNDER_VERIFICATION">Under Verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Category</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              <option value="PROJECT_NOT_STARTED">Project Not Started</option>
              <option value="PROJECT_DELAY">Project Delay</option>
              <option value="WORK_QUALITY">Work Quality Issue</option>
              <option value="PROJECT_INCOMPLETE">Project Incomplete</option>
              <option value="PUBLIC_SAFETY">Public Safety Concern</option>
              <option value="FINANCIAL_CONCERN">Financial Concern</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </CardBody>
      )}

      {/* Error State */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
          <span>Failed to load reports. Please try again.</span>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Reports List */}
      {isLoading ? (
        <ReportListSkeleton />
      ) : filteredReports.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {hasFilters ? 'No reports match your filters' : 'No reports yet'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {hasFilters
                ? 'Try adjusting your search or filters'
                : 'Start by submitting your first report about a project issue'}
            </p>
            {!hasFilters && (
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => router.push('/reports/new')}
              >
                Submit Report
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report: any) => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={() => router.push(`/reports/${report.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
