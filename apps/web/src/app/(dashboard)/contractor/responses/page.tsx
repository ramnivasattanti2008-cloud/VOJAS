'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  X,
  MessageSquare,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Upload,
  Send,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useContractorResponses } from '@/hooks/useContractor';
import { formatDate, cn } from '@/lib/utils';
import type { ContractorResponse } from '@vojas/api-client';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ACCEPTED: 'success',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  REJECTED: 'danger',
  PENDING: 'neutral',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending Response',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

export default function ResponsesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useContractorResponses({
    status: statusFilter || undefined,
    limit: 100,
  });

  const responses = data?.data ?? [];

  // Group by status
  const pending = responses.filter((r) => r.status === 'PENDING');
  const submitted = responses.filter((r) => r.status === 'SUBMITTED');
  const underReview = responses.filter((r) => r.status === 'UNDER_REVIEW');
  const accepted = responses.filter((r) => r.status === 'ACCEPTED');
  const rejected = responses.filter((r) => r.status === 'REJECTED');

  // Filter by search
  const filteredPending = pending.filter((r) =>
    r.finding.toLowerCase().includes(search.toLowerCase()) ||
    r.projectName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">RESPONSE CENTER</h1>
        <p className="text-purple-100 text-sm">
          View and respond to findings requiring your attention
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending"
          value={pending.length}
          color="red"
        />
        <StatCard
          icon={<Send className="h-5 w-5" />}
          label="Submitted"
          value={submitted.length}
          color="blue"
        />
        <StatCard
          icon={<Eye className="h-5 w-5" />}
          label="Under Review"
          value={underReview.length}
          color="amber"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Accepted"
          value={accepted.length}
          color="green"
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="Rejected"
          value={rejected.length}
          color="slate"
        />
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search findings..."
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
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
        </select>
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

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load responses'}
        </div>
      )}

      {/* Response Sections */}
      {isLoading ? (
        <ResponseSkeleton />
      ) : (
        <div className="space-y-8">
          {/* Pending Response */}
          {filteredPending.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Requires Response ({filteredPending.length})
              </h2>
              <div className="space-y-3">
                {filteredPending.map((response) => (
                  <ResponseCard key={response.id} response={response} />
                ))}
              </div>
            </section>
          )}

          {/* Submitted */}
          {submitted.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-blue-700 mb-4 flex items-center gap-2">
                <Send className="h-5 w-5" />
                Submitted ({submitted.length})
              </h2>
              <div className="space-y-3">
                {submitted.map((response) => (
                  <ResponseCard key={response.id} response={response} />
                ))}
              </div>
            </section>
          )}

          {/* Under Review */}
          {underReview.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-amber-700 mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Under Review ({underReview.length})
              </h2>
              <div className="space-y-3">
                {underReview.map((response) => (
                  <ResponseCard key={response.id} response={response} />
                ))}
              </div>
            </section>
          )}

          {/* Accepted */}
          {accepted.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-green-700 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Accepted ({accepted.length})
              </h2>
              <div className="space-y-3">
                {accepted.map((response) => (
                  <ResponseCard key={response.id} response={response} />
                ))}
              </div>
            </section>
          )}

          {/* Rejected */}
          {rejected.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Rejected ({rejected.length})
              </h2>
              <div className="space-y-3">
                {rejected.map((response) => (
                  <ResponseCard key={response.id} response={response} />
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {responses.length === 0 && !isLoading && (
            <div className="text-center py-12 text-slate-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">No Findings Found</h3>
              <p className="text-sm">You have no findings requiring your response.</p>
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
  color: 'red' | 'blue' | 'amber' | 'green' | 'slate';
}) {
  const colorClasses = {
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    slate: 'bg-slate-100 text-slate-600',
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

function ResponseCard({ response }: { response: ContractorResponse }) {
  const isUrgent = response.status === 'PENDING' && response.deadline;
  const isOverdue = isUrgent && response.deadline && new Date(response.deadline) < new Date();

  return (
    <Card className={cn(isOverdue && 'border-l-4 border-l-red-500')}>
      <CardBody>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={statusVariant[response.status] ?? 'neutral'}>
                {statusLabels[response.status]}
              </Badge>
              {isOverdue && (
                <Badge variant="danger">OVERDUE</Badge>
              )}
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">{response.finding}</h3>
            <button
              onClick={() => window.location.href = `/contractor/projects/${response.projectId}`}
              className="text-sm text-vojas-600 hover:underline"
            >
              {response.projectName}
            </button>
          </div>
          {response.deadline && (
            <div className={cn(
              'text-right',
              isOverdue ? 'text-red-600' : 'text-slate-600'
            )}>
              <p className="text-xs">Deadline</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(response.deadline)}
              </p>
            </div>
          )}
        </div>

        {/* Details */}
        {response.reason && (
          <div className="mb-3 p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-700">
              <strong>Reason:</strong> {response.reason}
            </p>
          </div>
        )}

        {response.evidenceReference && (
          <div className="mb-3 text-sm">
            <span className="text-slate-500">Evidence Reference: </span>
            <span className="text-slate-700">{response.evidenceReference}</span>
          </div>
        )}

        {/* Response Submitted */}
        {response.response && (
          <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700">
              <strong>Your Response:</strong> {response.response}
            </p>
            {response.submittedAt && (
              <p className="text-xs text-green-600 mt-1">
                Submitted: {formatDate(response.submittedAt)}
              </p>
            )}
          </div>
        )}

        {/* Reviewer Note */}
        {response.reviewerNote && (
          <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-700">
              <strong>Reviewer Note:</strong> {response.reviewerNote}
            </p>
          </div>
        )}

        {/* Documents */}
        {response.documents && response.documents.length > 0 && (
          <div className="mb-3">
            <p className="text-sm text-slate-500 mb-1">Attached Documents:</p>
            <div className="flex gap-2">
              {response.documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 bg-slate-100 rounded text-xs text-vojas-600 hover:bg-slate-200 flex items-center gap-1"
                >
                  <FileText className="h-3 w-3" />
                  {doc.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {response.status === 'PENDING' && (
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <Button size="sm" variant="primary" leftIcon={<Send className="h-3 w-3" />}>
              Submit Response
            </Button>
            <Button size="sm" variant="secondary" leftIcon={<Upload className="h-3 w-3" />}>
              Upload Evidence
            </Button>
            <Button size="sm" variant="ghost" leftIcon={<FileText className="h-3 w-3" />}>
              Upload Document
            </Button>
          </div>
        )}

        {response.status === 'REJECTED' && (
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <Button size="sm" variant="primary" leftIcon={<Send className="h-3 w-3" />}>
              Resubmit Response
            </Button>
            <Button size="sm" variant="ghost" leftIcon={<Upload className="h-3 w-3" />}>
              Upload Evidence
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function ResponseSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}
