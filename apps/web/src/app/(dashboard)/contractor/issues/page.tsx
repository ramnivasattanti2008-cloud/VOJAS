'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Plus,
  MessageSquare,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useContractorIssues } from '@/hooks/useContractor';
import { formatDate, cn } from '@/lib/utils';
import type { ContractorIssue, IssueHistoryEntry } from '@vojas/api-client';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  OPEN: 'danger',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

const statusLabels: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const severityVariant: Record<string, 'danger' | 'warning' | 'info' | 'neutral'> = {
  CRITICAL: 'danger',
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
};

const typeLabels: Record<string, string> = {
  QUALITY_DEFECT: 'Quality Defect',
  COMPLIANCE: 'Compliance',
  SAFETY: 'Safety',
  ENVIRONMENTAL: 'Environmental',
  DELAY: 'Delay',
  OTHER: 'Other',
};

export default function IssuesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useContractorIssues({
    status: statusFilter || undefined,
    page: 1,
    limit: 100,
  });

  const issues = data?.data ?? [];

  // Group by status
  const open = issues.filter((i) => i.status === 'OPEN');
  const inProgress = issues.filter((i) => i.status === 'IN_PROGRESS');
  const resolved = issues.filter((i) => i.status === 'RESOLVED');
  const closed = issues.filter((i) => i.status === 'CLOSED');

  // Filter by search
  const filteredOpen = open.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.projectName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">ISSUES CENTER</h1>
        <p className="text-red-100 text-sm">
          Track and manage quality defects, compliance issues, and safety concerns
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="Open"
          value={open.length}
          color="red"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="In Progress"
          value={inProgress.length}
          color="amber"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Resolved"
          value={resolved.length}
          color="green"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Quality Defects"
          value={issues.filter((i) => i.type === 'QUALITY_DEFECT').length}
          color="purple"
        />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="">All Severity</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="QUALITY_DEFECT">Quality Defect</option>
          <option value="COMPLIANCE">Compliance</option>
          <option value="SAFETY">Safety</option>
          <option value="ENVIRONMENTAL">Environmental</option>
          <option value="DELAY">Delay</option>
          <option value="OTHER">Other</option>
        </select>
        {(statusFilter || severityFilter || typeFilter || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setSeverityFilter('');
              setTypeFilter('');
              setSearch('');
            }}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
        <Button size="sm" variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
          Report Issue
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load issues'}
        </div>
      )}

      {/* Issue List */}
      {isLoading ? (
        <IssueSkeleton />
      ) : (
        <div className="space-y-8">
          {/* Open Issues */}
          {filteredOpen.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Open Issues ({filteredOpen.length})
              </h2>
              <div className="space-y-3">
                {filteredOpen.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            </section>
          )}

          {/* In Progress */}
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-amber-700 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                In Progress ({inProgress.length})
              </h2>
              <div className="space-y-3">
                {inProgress.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            </section>
          )}

          {/* Resolved */}
          {resolved.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-green-700 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Resolved ({resolved.length})
              </h2>
              <div className="space-y-3">
                {resolved.slice(0, 10).map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            </section>
          )}

          {/* Closed */}
          {closed.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Closed ({closed.length})
              </h2>
              <div className="space-y-3">
                {closed.slice(0, 5).map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {issues.length === 0 && !isLoading && (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">No Issues Found</h3>
              <p className="text-sm">You have no issues to manage.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Components ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'red' | 'amber' | 'green' | 'purple';
}) {
  const colorClasses = {
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg', colorClasses[color])}>{icon}</div>
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-lg font-bold text-slate-900">{value}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function IssueCard({ issue }: { issue: ContractorIssue }) {
  const [expanded, setExpanded] = useState(false);
  const isOpen = issue.status === 'OPEN';

  return (
    <Card className={cn(isOpen && 'border-l-4 border-l-red-500')}>
      <CardBody>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-slate-900">{issue.title}</h3>
              <Badge variant={statusVariant[issue.status] ?? 'neutral'}>
                {statusLabels[issue.status]}
              </Badge>
              <Badge variant={severityVariant[issue.severity] ?? 'neutral'}>
                {issue.severity}
              </Badge>
              <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                {typeLabels[issue.type]}
              </span>
            </div>
            <button
              onClick={() => window.location.href = `/contractor/projects/${issue.projectId}`}
              className="text-sm text-vojas-600 hover:underline"
            >
              {issue.projectName}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Reported: {formatDate(issue.reportedAt)}
            </span>
            {issue.history && issue.history.length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 hover:bg-slate-100 rounded"
                title={expanded ? 'Hide History' : 'Show History'}
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {issue.description && (
          <p className="text-sm text-slate-600 mb-3">{issue.description}</p>
        )}

        {/* Reported By */}
        {issue.reportedBy && (
          <p className="text-xs text-slate-500 mb-3">
            Reported by: {issue.reportedBy}
          </p>
        )}

        {/* Resolution */}
        {issue.resolution && (
          <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700">
              <strong>Resolution:</strong> {issue.resolution}
            </p>
            {issue.resolvedAt && (
              <p className="text-xs text-green-600 mt-1">
                Resolved: {formatDate(issue.resolvedAt)}
              </p>
            )}
          </div>
        )}

        {/* History */}
        {expanded && issue.history && issue.history.length > 0 && (
          <div className="mb-3 pt-3 border-t border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-2">History</p>
            <div className="space-y-2">
              {issue.history.map((entry) => (
                <HistoryEntry key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {issue.status === 'OPEN' && (
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <Button size="sm" variant="primary" leftIcon={<MessageSquare className="h-3 w-3" />}>
              Respond
            </Button>
            <Button size="sm" variant="secondary" leftIcon={<Eye className="h-3 w-3" />}>
              View Details
            </Button>
          </div>
        )}

        {issue.status === 'IN_PROGRESS' && (
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <Button size="sm" variant="primary" leftIcon={<MessageSquare className="h-3 w-3" />}>
              Add Update
            </Button>
            <Button size="sm" variant="secondary" leftIcon={<CheckCircle2 className="h-3 w-3" />}>
              Mark Resolved
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function HistoryEntry({ entry }: { entry: IssueHistoryEntry }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-slate-700">
          <span className="font-medium">{entry.action}</span>
          {entry.note && <span className="text-slate-500"> - {entry.note}</span>}
        </p>
        <p className="text-xs text-slate-400">
          {entry.performedBy && `${entry.performedBy} • `}{formatDate(entry.performedAt)}
        </p>
      </div>
    </div>
  );
}

function IssueSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
}
