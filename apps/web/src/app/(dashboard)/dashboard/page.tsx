'use client';

import { FolderOpenDot, AlertTriangle, FileText, TrendingUp, Activity } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ProjectStatus } from '@vojas/shared';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  color?: string;
}

function StatCard({ label, value, icon, description, color = 'bg-vojas-50 text-vojas-600' }: StatCardProps) {
  return (
    <Card>
      <CardBody className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500 mt-0.5">{label}</p>
          {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
        </div>
      </CardBody>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: projectsData, isLoading: projectsLoading } = useProjects({ limit: 100 });

  const projects = projectsData?.data ?? [];
  const totalProjects = projectsData?.total ?? 0;
  const openAnomalies = projects.filter((p) =>
    [ProjectStatus.IN_PROGRESS, ProjectStatus.PROPOSED, ProjectStatus.APPROVED].includes(p.status)
  ).length;
  const recentReports = projects.reduce((sum, p) => sum + (p.reportCount ?? 0), 0);
  const avgUtilization =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, p) => {
            if (!p.releasedAmount) return sum;
            return sum + ((p.utilizedAmount ?? 0) / p.releasedAmount) * 100;
          }, 0) / projects.length
        )
      : 0;

  const recentProjects = [...projects]
    .sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    })
    .slice(0, 5);

  const roleGreeting =
    user?.role === 'ADMIN'
      ? 'Administrator'
      : user?.role === 'ANALYST'
      ? 'Analyst'
      : user?.role === 'MP'
      ? 'MP'
      : 'User';

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.name ?? roleGreeting}
        </h1>
        <p className="text-slate-500 mt-1">
          Here is an overview of the accountability platform.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Projects"
          value={projectsLoading ? '—' : totalProjects}
          icon={<FolderOpenDot className="h-5 w-5" />}
        />
        <StatCard
          label="Active Projects"
          value={projectsLoading ? '—' : openAnomalies}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Total Reports"
          value={projectsLoading ? '—' : recentReports}
          icon={<FileText className="h-5 w-5" />}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Avg Utilization"
          value={projectsLoading ? '—' : `${avgUtilization}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="bg-green-50 text-green-600"
        />
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900">Recent Projects</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {projectsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-4 space-y-2">
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-slate-50 rounded animate-pulse w-1/3" />
                </div>
              ))
            ) : recentProjects.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">No projects yet</div>
            ) : (
              recentProjects.map((project) => (
                <a
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{project.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {project.district ? `${project.district}, ` : ''}{project.state ?? ''}
                      {project.sanctionedAmount && (
                        <span className="ml-2">{formatCurrency(project.sanctionedAmount)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Badge
                      variant={
                        project.status === 'COMPLETED'
                          ? 'success'
                          : project.status === 'IN_PROGRESS'
                          ? 'info'
                          : project.status === 'CANCELLED'
                          ? 'danger'
                          : 'neutral'
                      }
                    >
                      {project.status}
                    </Badge>
                  </div>
                </a>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Quick Facts</h2>
          </div>
          <CardBody className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Completed</span>
              <span className="font-medium text-slate-900">
                {projects.filter((p) => p.status === ProjectStatus.COMPLETED).length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">In Progress</span>
              <span className="font-medium text-slate-900">
                {projects.filter((p) => p.status === ProjectStatus.IN_PROGRESS).length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Verified</span>
              <span className="font-medium text-slate-900">
                {projects.filter((p) => p.status === ProjectStatus.VERIFIED).length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Sectors</span>
              <span className="font-medium text-slate-900">
                {new Set(projects.map((p) => p.sector)).size}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
