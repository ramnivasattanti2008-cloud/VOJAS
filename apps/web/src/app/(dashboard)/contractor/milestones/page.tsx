'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  X,
  Flag,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Upload,
  Check,
  Eye,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { DataTable } from '@/components/ui/DataTable';
import {
  useContractorMilestones,
  useSubmitMilestone,
  useSubmitCorrection,
  useRequestInspection,
} from '@/hooks/useContractor';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { ContractorMilestone } from '@vojas/api-client';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  COMPLETED: 'success',
  VERIFIED: 'success',
  CURRENT: 'info',
  UPCOMING: 'neutral',
  PENDING_VERIFICATION: 'warning',
  REJECTED: 'danger',
  CORRECTION_NEEDED: 'danger',
};

const statusLabels: Record<string, string> = {
  UPCOMING: 'Upcoming',
  CURRENT: 'Current',
  COMPLETED: 'Completed',
  VERIFIED: 'Verified',
  PENDING_VERIFICATION: 'Pending Verification',
  REJECTED: 'Rejected',
  CORRECTION_NEEDED: 'Needs Correction',
};

export default function MilestonesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useContractorMilestones({
    status: statusFilter || undefined,
    limit: 100,
  });

  const milestones = data?.data ?? [];

  // Group milestones by status
  const upcoming = milestones.filter((m) => m.status === 'UPCOMING');
  const current = milestones.filter((m) => m.status === 'CURRENT');
  const pendingVerification = milestones.filter((m) => m.status === 'PENDING_VERIFICATION');
  const rejected = milestones.filter((m) => m.status === 'REJECTED' || m.status === 'CORRECTION_NEEDED');
  const completed = milestones.filter((m) => m.status === 'COMPLETED');

  // Filter by search
  const filteredUpcoming = upcoming.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.projectName.toLowerCase().includes(search.toLowerCase())
  );
  const filteredCurrent = current.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.projectName.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPending = pendingVerification.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.projectName.toLowerCase().includes(search.toLowerCase())
  );
  const filteredRejected = rejected.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.projectName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">MILESTONE CENTER</h1>
        <p className="text-amber-100 text-sm">
          Track, submit, and manage your project milestones
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Upcoming"
          value={upcoming.length}
          color="slate"
        />
        <StatCard
          icon={<Flag className="h-5 w-5" />}
          label="Current"
          value={current.length}
          color="blue"
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="Pending Verification"
          value={pendingVerification.length}
          color="amber"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Completed"
          value={completed.length}
          color="green"
        />
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search milestones..."
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
          <option value="CURRENT">Current</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
          <option value="REJECTED">Rejected</option>
          <option value="COMPLETED">Completed</option>
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
          {error instanceof Error ? error.message : 'Failed to load milestones'}
        </div>
      )}

      {/* Milestone Sections */}
      {isLoading ? (
        <MilestoneSkeleton />
      ) : (
        <div className="space-y-8">
          {/* Current Milestones */}
          {filteredCurrent.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-vojas-700 mb-4 flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Current Milestones
              </h2>
              <div className="space-y-3">
                {filteredCurrent.map((milestone) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} showActions />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Milestones */}
          {filteredUpcoming.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Milestones
              </h2>
              <div className="space-y-3">
                {filteredUpcoming.map((milestone) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} />
                ))}
              </div>
            </section>
          )}

          {/* Pending Verification */}
          {filteredPending.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-amber-700 mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Pending Verification
              </h2>
              <div className="space-y-3">
                {filteredPending.map((milestone) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} />
                ))}
              </div>
            </section>
          )}

          {/* Rejected / Needs Correction */}
          {filteredRejected.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Needs Correction
              </h2>
              <div className="space-y-3">
                {filteredRejected.map((milestone) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} showActions />
                ))}
              </div>
            </section>
          )}

          {/* Completed Milestones */}
          {completed.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-green-700 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Completed Milestones
              </h2>
              <div className="space-y-3">
                {completed.slice(0, 10).map((milestone) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} compact />
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {milestones.length === 0 && !isLoading && (
            <div className="text-center py-12 text-slate-500">
              <Flag className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">No Milestones Found</h3>
              <p className="text-sm">You have no milestones assigned yet.</p>
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
  color: 'blue' | 'amber' | 'green' | 'slate';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', colorClasses[color])}>{icon}</div>
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-xl font-bold text-slate-900">{value}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function MilestoneCard({
  milestone,
  showActions,
  compact,
}: {
  milestone: ContractorMilestone;
  showActions?: boolean;
  compact?: boolean;
}) {
  const isUrgent =
    milestone.status === 'CURRENT' ||
    milestone.status === 'REJECTED' ||
    milestone.status === 'CORRECTION_NEEDED';

  if (compact) {
    return (
      <Card className="bg-slate-50">
        <CardBody className="flex items-center gap-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-700 truncate">{milestone.title}</p>
            <p className="text-xs text-slate-500">{milestone.projectName}</p>
          </div>
          <Badge variant={statusVariant[milestone.status] ?? 'neutral'}>
            {statusLabels[milestone.status]}
          </Badge>
          {milestone.completedDate && (
            <span className="text-xs text-slate-500">{formatDate(milestone.completedDate)}</span>
          )}
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className={cn(isUrgent && 'border-l-4 border-l-vojas-500')}>
      <CardBody>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900">{milestone.title}</h3>
              <Badge variant={statusVariant[milestone.status] ?? 'neutral'}>
                {statusLabels[milestone.status]}
              </Badge>
            </div>
            <button
              onClick={() => window.location.href = `/contractor/projects/${milestone.projectId}`}
              className="text-sm text-vojas-600 hover:underline"
            >
              {milestone.projectName}
            </button>
            {milestone.description && (
              <p className="text-sm text-slate-600 mt-1">{milestone.description}</p>
            )}
          </div>
          {milestone.dueDate && (
            <div className="text-right">
              <p className={cn(
                'text-sm font-medium',
                isUrgent ? 'text-red-600' : 'text-slate-600'
              )}>
                Due: {formatDate(milestone.dueDate)}
              </p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
          {milestone.amount && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {formatCurrency(milestone.amount)}
            </span>
          )}
          {milestone.progressPercent != null && (
            <div className="flex items-center gap-2 flex-1">
              <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-vojas-500 rounded-full"
                  style={{ width: `${milestone.progressPercent}%` }}
                />
              </div>
              <span>{milestone.progressPercent}%</span>
            </div>
          )}
        </div>

        {/* Rejection / Correction Note */}
        {milestone.rejectionNote && (
          <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-700">
              <strong>Rejection Reason:</strong> {milestone.rejectionNote}
            </p>
          </div>
        )}
        {milestone.correctionNote && (
          <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-700">
              <strong>Correction Needed:</strong> {milestone.correctionNote}
            </p>
          </div>
        )}

        {/* Evidence */}
        {milestone.evidenceUrls && milestone.evidenceUrls.length > 0 && (
          <div className="mb-3">
            <p className="text-sm text-slate-500 mb-1">Evidence:</p>
            <div className="flex gap-2">
              {milestone.evidenceUrls.slice(0, 3).map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 bg-slate-100 rounded text-xs text-vojas-600 hover:bg-slate-200"
                >
                  View {i + 1}
                </a>
              ))}
              {milestone.evidenceUrls.length > 3 && (
                <span className="px-2 py-1 text-xs text-slate-500">
                  +{milestone.evidenceUrls.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            {(milestone.status === 'CURRENT' || milestone.status === 'UPCOMING') && (
              <Button size="sm" variant="primary" leftIcon={<Upload className="h-3 w-3" />}>
                Submit Milestone
              </Button>
            )}
            {(milestone.status === 'REJECTED' || milestone.status === 'CORRECTION_NEEDED') && (
              <Button size="sm" variant="primary" leftIcon={<Check className="h-3 w-3" />}>
                Submit Correction
              </Button>
            )}
            <Button size="sm" variant="secondary" leftIcon={<Eye className="h-3 w-3" />}>
              View Details
            </Button>
            <Button size="sm" variant="ghost" leftIcon={<Calendar className="h-3 w-3" />}>
              Request Inspection
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function MilestoneSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
}
