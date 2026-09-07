'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  AlertTriangle,
  Clock,
  FileText,
  MapPin,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ChevronRight,
  Eye,
  FileCheck,
  Users,
  BarChart3,
  RefreshCw,
  Database,
  Upload,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useOfficerDashboardStats, useOfficerCases } from '@/hooks/useOfficer';
import { formatDate } from '@/lib/utils';

// Stat card component
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  href,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  href?: string;
  loading?: boolean;
}) {
  const content = (
    <Card className={href ? 'hover:border-vojas-400 hover:shadow-md transition-all cursor-pointer' : ''}>
      <CardBody className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold text-slate-900">
            {loading ? '—' : value.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">{title}</p>
        </div>
        {href && <ChevronRight className="h-5 w-5 text-slate-400" />}
      </CardBody>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// Priority badge component
function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    LOW: 'bg-slate-100 text-slate-700',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${colors[priority] ?? 'bg-slate-100 text-slate-700'}`}>
      {priority}
    </span>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-700',
    ASSIGNED: 'bg-purple-100 text-purple-700',
    UNDER_REVIEW: 'bg-indigo-100 text-indigo-700',
    VERIFICATION_REQUIRED: 'bg-orange-100 text-orange-700',
    RESOLVED: 'bg-green-100 text-green-700',
    DISMISSED: 'bg-slate-100 text-slate-700',
    ESCALATED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function OfficerDashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useOfficerDashboardStats();
  const { data: casesData, isLoading: casesLoading } = useOfficerCases({
    status: 'NEW',
    sortBy: 'priority',
    sortOrder: 'asc',
    limit: 10,
  });

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    refetchStats();
  };

  const criticalCases = casesData?.data?.filter((c) => c.priority === 'CRITICAL' || c.priority === 'HIGH') ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-vojas-600" />
            Officer Command Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Government oversight and verification dashboard
          </p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </div>

      {/* Priority Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Critical Cases"
          value={stats?.criticalCases ?? 0}
          icon={AlertTriangle}
          color="bg-red-50 text-red-600"
          href="/officer/verification?priority=CRITICAL"
          loading={statsLoading}
        />
        <StatCard
          title="High Priority"
          value={stats?.highPriority ?? 0}
          icon={AlertTriangle}
          color="bg-orange-50 text-orange-600"
          href="/officer/verification?priority=HIGH"
          loading={statsLoading}
        />
        <StatCard
          title="Medium Priority"
          value={stats?.mediumPriority ?? 0}
          icon={Clock}
          color="bg-amber-50 text-amber-600"
          href="/officer/verification?priority=MEDIUM"
          loading={statsLoading}
        />
        <StatCard
          title="Low Priority"
          value={stats?.lowPriority ?? 0}
          icon={CheckCircle2}
          color="bg-slate-50 text-slate-600"
          href="/officer/verification?priority=LOW"
          loading={statsLoading}
        />
      </div>

      {/* Action Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="New Findings"
          value={stats?.newFindings ?? 0}
          icon={FileText}
          color="bg-blue-50 text-blue-600"
          loading={statsLoading}
        />
        <StatCard
          title="Overdue Cases"
          value={stats?.overdueCases ?? 0}
          icon={Clock}
          color="bg-red-50 text-red-600"
          loading={statsLoading}
        />
        <StatCard
          title="Pending Inspections"
          value={stats?.pendingInspections ?? 0}
          icon={MapPin}
          color="bg-purple-50 text-purple-600"
          href="/officer/field"
          loading={statsLoading}
        />
        <StatCard
          title="Contractor Responses"
          value={stats?.contractorResponsesAwaiting ?? 0}
          icon={Users}
          color="bg-indigo-50 text-indigo-600"
          href="/officer/responses"
          loading={statsLoading}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Unresolved Cases"
          value={stats?.unresolvedCases ?? 0}
          icon={XCircle}
          color="bg-orange-50 text-orange-600"
          loading={statsLoading}
        />
        <StatCard
          title="Recent Evidence Added"
          value={stats?.recentEvidenceAdded ?? 0}
          icon={Upload}
          color="bg-green-50 text-green-600"
          href="/officer/evidence"
          loading={statsLoading}
        />
        <StatCard
          title="System/Data Issues"
          value={stats?.systemDataIssues ?? 0}
          icon={Database}
          color="bg-yellow-50 text-yellow-600"
          loading={statsLoading}
        />
        <StatCard
          title="Total Cases"
          value={stats?.totalCases ?? 0}
          icon={BarChart3}
          color="bg-slate-50 text-slate-600"
          href="/officer/verification"
          loading={statsLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/officer/verification">
          <Button variant="primary" className="w-full justify-center" leftIcon={<Search className="h-4 w-4" />}>
            Verification Queue
          </Button>
        </Link>
        <Link href="/officer/evidence">
          <Button variant="secondary" className="w-full justify-center" leftIcon={<FileCheck className="h-4 w-4" />}>
            Evidence Center
          </Button>
        </Link>
        <Link href="/officer/field">
          <Button variant="secondary" className="w-full justify-center" leftIcon={<MapPin className="h-4 w-4" />}>
            Field Mode
          </Button>
        </Link>
        <Link href="/officer/map">
          <Button variant="secondary" className="w-full justify-center" leftIcon={<Eye className="h-4 w-4" />}>
            Officer Map
          </Button>
        </Link>
      </div>

      {/* Critical/High Priority Cases */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-slate-900">Critical & High Priority Cases</h2>
          </div>
          <Link href="/officer/verification?priority=CRITICAL,HIGH">
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-3 w-3" />}>
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          {casesLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-slate-50 rounded animate-pulse" />
              ))}
            </div>
          ) : criticalCases.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
              No critical or high priority cases
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {criticalCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/officer/cases/${c.id}`}
                  className="block px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 truncate">{c.title}</span>
                        <PriorityBadge priority={c.priority} />
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="font-mono">{c.reference}</span>
                        {c.project && <span>{c.project.name}</span>}
                        {c.age && <span>{c.age} days old</span>}
                        {c.assignedTo && <span>Assigned: {c.assignedTo.name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.evidenceCount !== undefined && (
                        <Badge variant="neutral" className="text-xs">
                          {c.evidenceCount} evidence
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Recent Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Recent Cases</h2>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {casesLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-slate-50 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(casesData?.data ?? []).slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    href={`/officer/cases/${c.id}`}
                    className="block px-4 py-2.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-700 truncate">{c.title}</span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {formatDate(c.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Recent Evidence</h2>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {statsLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-slate-50 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="px-4 py-3 text-center text-slate-400 text-sm">
                <Upload className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p>{stats?.recentEvidenceAdded ?? 0} evidence items recently added</p>
                <Link href="/officer/evidence">
                  <Button variant="ghost" size="sm" className="mt-2">
                    View Evidence Center
                  </Button>
                </Link>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
