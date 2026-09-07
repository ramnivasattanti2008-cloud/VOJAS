'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin, AlertCircle, FileText, Eye, Sparkles,
  TrendingUp, Building2, CheckCircle2, Clock,
  ChevronRight, MessageSquare, Shield, BarChart3
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCitizenReports } from '@/hooks/useCitizenReports';
import { usePublicProjects } from '@/hooks/usePublicProjects';
import { REPORT_STATUS_LABELS, REPORT_CATEGORY_LABELS } from '@vojas/api-client';
import { formatDate, formatCurrency, cn } from '@/lib/utils';

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

// Quick Action Card Component
function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md hover:border-vojas-300 transition-all cursor-pointer group">
        <CardBody className="flex items-start gap-4">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 group-hover:text-vojas-600 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-vojas-500 transition-colors" />
        </CardBody>
      </Card>
    </Link>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </CardBody>
    </Card>
  );
}

// Report Preview Card
function ReportPreviewCard({ report }: { report: any }) {
  return (
    <Link href={`/reports/${report.id}`}>
      <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-vojas-200 transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900 text-sm truncate">{report.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {REPORT_CATEGORY_LABELS[report.category] || report.category}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[report.status] ?? 'neutral'} className="text-xs">
            {REPORT_STATUS_LABELS[report.status] || report.status}
          </Badge>
        </div>
        <p className="text-xs text-slate-600 line-clamp-2">{report.description}</p>
        <p className="text-xs text-slate-400 mt-2">{formatDate(report.submittedAt)}</p>
      </div>
    </Link>
  );
}

// Project Preview Card
function ProjectPreviewCard({ project }: { project: any }) {
  const statusVariant = project.status === 'COMPLETED' || project.status === 'VERIFIED'
    ? 'success'
    : project.status === 'IN_PROGRESS'
      ? 'info'
      : 'neutral';

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-vojas-200 transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900 text-sm truncate">{project.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {project.district ? `${project.district}, ` : ''}{project.state || ''}
            </p>
          </div>
          <Badge variant={statusVariant} className="text-xs capitalize">
            {project.status.replace(/_/g, ' ').toLowerCase()}
          </Badge>
        </div>
        {project.approvedAmount && (
          <p className="text-xs text-slate-600">
            <span className="text-slate-500">Sanctioned:</span> {formatCurrency(project.approvedAmount)}
          </p>
        )}
        {project.progressPercent !== undefined && (
          <div className="mt-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-vojas-500 rounded-full"
                style={{ width: `${project.progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">{project.progressPercent}% complete</p>
          </div>
        )}
      </div>
    </Link>
  );
}

// Loading Skeleton
function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardBody className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function CitizenHomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch citizen reports
  const { data: reportsData, isLoading: reportsLoading } = useCitizenReports({ limit: 5 });
  const reports = reportsData?.data ?? [];

  // Fetch public projects
  const { data: projectsData, isLoading: projectsLoading } = usePublicProjects({ limit: 6 });
  const projects = projectsData?.data ?? [];

  // Calculate stats
  const activeReports = reports.filter((r: any) =>
    !['RESOLVED', 'VERIFIED', 'DISMISSED'].includes(r.status)
  ).length;
  const resolvedReports = reports.filter((r: any) =>
    ['RESOLVED', 'VERIFIED'].includes(r.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-vojas-600 to-vojas-700 rounded-2xl p-6 md:p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">PROJECTS AROUND YOU</h1>
            <p className="text-vojas-100 mt-2">
              Track government projects, report issues, and hold authorities accountable.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              className="bg-white text-vojas-700 hover:bg-vojas-50"
              onClick={() => router.push('/citizen/reports')}
              leftIcon={<FileText className="h-4 w-4" />}
            >
              Report Problem
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Building2}
          label="Public Projects"
          value={projectsData?.total?.toLocaleString() ?? '—'}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Clock}
          label="My Active Reports"
          value={activeReports}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Resolved"
          value={resolvedReports}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={TrendingUp}
          label="In Progress"
          value={projects.filter((p: any) => p.status === 'IN_PROGRESS').length}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            icon={AlertCircle}
            title="Report Problem"
            description="Submit a new report about a project issue"
            href="/citizen/reports"
            color="bg-red-50 text-red-600"
          />
          <QuickActionCard
            icon={FileText}
            title="My Reports"
            description="Track status of your submitted reports"
            href="/citizen/reports"
            color="bg-blue-50 text-blue-600"
          />
          <QuickActionCard
            icon={Eye}
            title="Nearby Projects"
            description="View projects in your area"
            href="/citizen/projects"
            color="bg-green-50 text-green-600"
          />
          <QuickActionCard
            icon={Shield}
            title="Watchlist"
            description="Follow projects for updates"
            href="/citizen/watchlist"
            color="bg-purple-50 text-purple-600"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Recent Reports */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">My Recent Reports</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/citizen/reports')}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                View All
              </Button>
            </div>

            {reportsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 border border-slate-200 rounded-lg">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No reports submitted yet</p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => router.push('/citizen/reports')}
                >
                  Submit First Report
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.slice(0, 4).map((report: any) => (
                  <ReportPreviewCard key={report.id} report={report} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Nearby Public Projects */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slash-900">Nearby Projects</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/citizen/projects')}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                View All
              </Button>
            </div>

            {projectsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 border border-slate-200 rounded-lg">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No public projects available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 4).map((project: any) => (
                  <ProjectPreviewCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Public Accountability Section */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-vojas-50 flex items-center justify-center">
              <Shield className="h-5 w-5 text-vojas-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Public Accountability</h2>
              <p className="text-sm text-slate-500">Real-time transparency data from official sources</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">
                {projectsData?.data?.reduce((sum: number, p: any) => sum + (p.approvedAmount || 0), 0)
                  ? formatCurrency(
                      projectsData?.data?.reduce((sum: number, p: any) => sum + (p.approvedAmount || 0), 0)
                    )
                  : '—'}
              </p>
              <p className="text-sm text-slate-500 mt-1">Total Sanctioned Amount</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">
                {projectsData?.data?.filter((p: any) => p.status === 'COMPLETED').length ?? 0}
              </p>
              <p className="text-sm text-slate-500 mt-1">Completed Projects</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">
                {reports.length}
              </p>
              <p className="text-sm text-slate-500 mt-1">Citizen Reports Filed</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* AI Assistant Link */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-100">
        <CardBody className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">AI Assistant</h3>
              <p className="text-sm text-slate-600">Get instant answers about projects and reports</p>
            </div>
          </div>
          <Button
            variant="secondary"
            leftIcon={<MessageSquare className="h-4 w-4" />}
            className="hidden md:inline-flex"
          >
            Chat Now
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
