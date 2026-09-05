'use client';

import { use } from 'react';
import Link from 'next/link';
import { Building2, Flag, Mail, Phone, ArrowLeft, Users } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useMP, useMPProjects } from '@/hooks/useMPs';
import { formatCurrency } from '@/lib/utils';

const HOUSE_LABEL: Record<string, string> = {
  LOK_SABHA: 'Lok Sabha',
  RAJYA_SABHA: 'Rajya Sabha',
  STATE_ASSEMBLY: 'State Assembly',
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  COMPLETED: 'success',
  IN_PROGRESS: 'info',
  CANCELLED: 'danger',
  PROPOSED: 'neutral',
  APPROVED: 'info',
  VERIFIED: 'success',
};

export default function MPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: mp, isLoading: mpLoading, error } = useMP(id);
  const { data: projectsData, isLoading: projectsLoading } = useMPProjects(id, { limit: 50 });

  const projects = projectsData?.data ?? [];

  if (mpLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-100 rounded animate-pulse w-32" />
        <div className="h-8 bg-slate-100 rounded animate-pulse w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !mp) {
    return (
      <div className="space-y-4">
        <Link href="/mps">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to MPs
          </Button>
        </Link>
        <div className="px-4 py-8 text-center text-red-600">
          {error instanceof Error ? error.message : 'Failed to load MP details'}
        </div>
      </div>
    );
  }

  const completedProjects = projects.filter((p) => p.status === 'COMPLETED').length;
  const inProgressProjects = projects.filter((p) => p.status === 'IN_PROGRESS').length;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/mps">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to MPs
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{mp.name}</h1>
            <Badge variant="primary">{HOUSE_LABEL[mp.house] ?? mp.house}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600 mt-2 flex-wrap">
            <p className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
              {mp.constituency}
            </p>
            <p className="flex items-center gap-1.5">
              <Flag className="h-4 w-4 text-slate-400" aria-hidden="true" />
              {mp.state}
            </p>
            {mp.party && <span className="font-medium">{mp.party}</span>}
          </div>
          {(mp.email || mp.phone) && (
            <div className="flex items-center gap-4 text-sm text-slate-500 mt-1 flex-wrap">
              {mp.email && (
                <p className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <a href={`mailto:${mp.email}`} className="hover:text-vojas-600">{mp.email}</a>
                </p>
              )}
              {mp.phone && (
                <p className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <a href={`tel:${mp.phone}`} className="hover:text-vojas-600">{mp.phone}</a>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-vojas-50 text-vojas-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {mp._count?.projects ?? 0}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">Total Projects</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 text-green-600">
              <span className="text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{completedProjects}</p>
              <p className="text-sm text-slate-500 mt-0.5">Completed</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
              <span className="text-lg">↗</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{inProgressProjects}</p>
              <p className="text-sm text-slate-500 mt-0.5">In Progress</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Projects */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Projects</h2>
        {projectsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardBody className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-slate-50 rounded animate-pulse w-1/3" />
                </CardBody>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardBody className="py-8 text-center text-slate-400 text-sm">
              No projects found for this MP
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:border-vojas-300 transition-colors cursor-pointer">
                  <CardBody className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{project.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {project.district ? `${project.district}, ` : ''}{project.state ?? ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className="text-sm font-medium text-slate-900">
                        {formatCurrency(project.approvedAmount ?? project.spentAmount)}
                      </span>
                      <Badge variant={STATUS_VARIANT[project.status] ?? 'neutral'}>
                        {project.status}
                      </Badge>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
