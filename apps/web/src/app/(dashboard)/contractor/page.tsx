'use client';

import { useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  X,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Shield,
  Upload,
  Flag,
  ArrowRight,
  FolderOpenDot,
} from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  useContractorDashboard,
  useContractorProjects,
} from '@/hooks/useContractor';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { ContractorProject } from '@vojas/api-client';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  VERIFIED: 'success',
  CANCELLED: 'danger',
  PROPOSED: 'neutral',
  APPROVED: 'neutral',
  SANCTIONED: 'neutral',
  UNSANCTIONED: 'danger',
};

export default function ContractorHomePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: dashboard, isLoading: dashboardLoading } = useContractorDashboard();
  const { data: projectsData, isLoading: projectsLoading } = useContractorProjects({
    search: search || undefined,
    status: statusFilter || undefined,
    limit: 50,
  });

  const projects = projectsData?.data ?? [];

  const columns: { key: string; header: string; className?: string; render?: (p: ContractorProject) => React.ReactNode }[] = [
    {
      key: 'name',
      header: 'Project',
      className: 'min-w-[200px]',
      render: (p) => (
        <div>
          <p className="font-medium text-slate-900">{p.name}</p>
          <p className="text-xs text-slate-500">
            {p.district ? `${p.district}, ` : ''}{p.state ?? ''}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <Badge variant={statusVariant[p.status] ?? 'neutral'}>{p.status.replace('_', ' ')}</Badge>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (p) =>
        p.progressPercent != null ? (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-vojas-500 rounded-full transition-all"
                style={{ width: `${p.progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{p.progressPercent}%</span>
          </div>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
    {
      key: 'nextMilestone',
      header: 'Next Milestone',
      render: (p) => (
        <div>
          {p.currentMilestone ? (
            <span className="text-xs text-slate-700">{p.currentMilestone}</span>
          ) : p.nextMilestoneDue ? (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Clock className="h-3 w-3" />
              {formatDate(p.nextMilestoneDue)}
            </div>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'pendingDocs',
      header: 'Docs',
      render: (p) =>
        p.pendingDocuments ? (
          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            {p.pendingDocuments} pending
          </span>
        ) : (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> OK
          </span>
        ),
    },
    {
      key: 'issues',
      header: 'Issues',
      render: (p) =>
        p.openIssues ? (
          <span className="inline-flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3 w-3" />
            {p.openIssues} open
          </span>
        ) : (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> None
          </span>
        ),
    },
    {
      key: 'amount',
      header: 'Sanctioned',
      render: (p) => (
        <span className="text-slate-900 font-medium text-xs">
          {formatCurrency(p.sanctionedAmount)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-vojas-600 to-vojas-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">MY PROJECTS</h1>
        <p className="text-vojas-100 text-sm">
          Manage your assigned projects, milestones, and documentation
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              icon={<FolderOpenDot className="h-5 w-5" />}
              label="Active Projects"
              value={dashboard?.activeProjects ?? 0}
              sublabel={`${dashboard?.totalProjects ?? 0} total`}
              color="blue"
            />
            <StatCard
              icon={<Flag className="h-5 w-5" />}
              label="Current Milestones"
              value={dashboard?.currentMilestones ?? 0}
              sublabel={`${dashboard?.upcomingMilestones ?? 0} upcoming`}
              color="amber"
            />
            <StatCard
              icon={<Shield className="h-5 w-5" />}
              label="Pending Verification"
              value={dashboard?.pendingVerifications ?? 0}
              sublabel={`${dashboard?.pendingDocuments ?? 0} documents`}
              color="purple"
            />
            <StatCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Total Approved"
              value={formatCurrency(dashboard?.totalApproved ?? 0)}
              sublabel={`${formatCurrency(dashboard?.totalReleased ?? 0)} released`}
              color="green"
            />
          </>
        )}
      </div>

      {/* Action Cards */}
      {!dashboardLoading && dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dashboard.openIssues > 0 && (
            <ActionCard
              icon={<AlertCircle className="h-5 w-5 text-red-500" />}
              title="Open Issues"
              description={`You have ${dashboard.openIssues} open issues that need attention`}
              action="View Issues"
              href="/contractor/issues"
              variant="danger"
            />
          )}
          {dashboard.pendingVerifications > 0 && (
            <ActionCard
              icon={<Clock className="h-5 w-5 text-amber-500" />}
              title="Pending Verification"
              description={`${dashboard.pendingVerifications} items awaiting VOJAS verification`}
              action="View Status"
              href="/contractor/milestones"
              variant="warning"
            />
          )}
          {dashboard.pendingDocuments > 0 && (
            <ActionCard
              icon={<Upload className="h-5 w-5 text-blue-500" />}
              title="Missing Documents"
              description={`${dashboard.pendingDocuments} documents are required`}
              action="Upload Documents"
              href="/contractor/documents"
              variant="info"
            />
          )}
        </div>
      )}

      {/* Project List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your Projects</h2>
            <p className="text-sm text-slate-500">
              {projectsData?.total != null ? `${projectsData.total} projects` : 'Loading...'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search projects..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            />
          </div>
          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            size="md"
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters((s) => !s)}
          >
            Filters
          </Button>
          {statusFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter('')}
              leftIcon={<X className="h-3 w-3" />}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white rounded-xl border border-slate-200">
            <div>
              <label htmlFor="status-filter" className="text-sm font-medium text-slate-700 block mb-1">
                Status
              </label>
              <select
                id="status-filter"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="VERIFIED">Verified</option>
              </select>
            </div>
          </CardBody>
        )}

        {/* Table */}
        <DataTable
          columns={columns}
          rows={projects}
          isLoading={projectsLoading}
          onRowClick={(p) => router.push(`/contractor/projects/${p.id}`)}
          emptyMessage="No projects found. You may not have any assigned projects yet."
        />
      </div>
    </div>
  );
}

// ── Helper Components ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  color: 'blue' | 'amber' | 'purple' | 'green' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', colorClasses[color])}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-xl font-bold text-slate-900">{value}</p>
            {sublabel && <p className="text-xs text-slate-400">{sublabel}</p>}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function ActionCard({
  icon,
  title,
  description,
  action,
  href,
  variant,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  href: string;
  variant: 'danger' | 'warning' | 'info';
}) {
  const borderColors = {
    danger: 'border-l-red-500',
    warning: 'border-l-amber-500',
    info: 'border-l-blue-500',
  };
  return (
    <Card className={cn('border-l-4', borderColors[variant])}>
      <CardBody className="flex items-center gap-4">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900">{title}</p>
          <p className="text-sm text-slate-500 truncate">{description}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          rightIcon={<ArrowRight className="h-3 w-3" />}
          onClick={() => window.location.href = href}
        >
          {action}
        </Button>
      </CardBody>
    </Card>
  );
}
