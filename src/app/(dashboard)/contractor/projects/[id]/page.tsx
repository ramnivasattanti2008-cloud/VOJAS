'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  Flag,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Shield,
  Upload,
  Eye,
  Check,
  X,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useContractorProject, useContractorMilestones, useContractorDocuments } from '@/hooks/useContractor';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { ContractorMilestone, ContractorDocument } from '@vojas/api-client';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  COMPLETED: 'success',
  VERIFIED: 'success',
  CURRENT: 'info',
  UPCOMING: 'neutral',
  IN_PROGRESS: 'info',
  PENDING_VERIFICATION: 'warning',
  REJECTED: 'danger',
  CORRECTION_NEEDED: 'danger',
};

const milestoneStatusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  COMPLETED: 'success',
  VERIFIED: 'success',
  CURRENT: 'info',
  UPCOMING: 'neutral',
  PENDING_VERIFICATION: 'warning',
  REJECTED: 'danger',
  CORRECTION_NEEDED: 'danger',
};

const docStatusVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
};

export default function ContractorProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { data: project, isLoading: projectLoading } = useContractorProject(projectId);
  const { data: milestonesData, isLoading: milestonesLoading } = useContractorMilestones({
    projectId,
    limit: 50,
  });
  const { data: documentsData, isLoading: documentsLoading } = useContractorDocuments({
    projectId,
    limit: 50,
  });

  const milestones = milestonesData?.data ?? [];
  const documents = documentsData?.data ?? [];

  if (projectLoading) {
    return <ProjectDetailSkeleton />;
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Project Not Found</h2>
        <p className="text-slate-500 mb-4">
          This project may not be assigned to you or does not exist.
        </p>
        <Button onClick={() => router.push('/contractor')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  const currentMilestones = milestones.filter((m) => m.status === 'CURRENT');
  const upcomingMilestones = milestones.filter((m) => m.status === 'UPCOMING');
  const completedMilestones = milestones.filter((m) => m.status === 'COMPLETED');
  const pendingVerification = milestones.filter((m) => m.status === 'PENDING_VERIFICATION');
  const rejectedMilestones = milestones.filter((m) => m.status === 'REJECTED' || m.status === 'CORRECTION_NEEDED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/contractor')} className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Projects
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={statusVariant[project.status] ?? 'neutral'}>
              {project.status.replace('_', ' ')}
            </Badge>
            {project.sector && (
              <span className="text-sm text-slate-500">{project.sector.replace('_', ' ')}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          {project.progressPercent != null && (
            <div className="text-2xl font-bold text-vojas-600">{project.progressPercent}%</div>
          )}
          <p className="text-sm text-slate-500">Progress</p>
        </div>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard
          icon={<MapPin className="h-5 w-5" />}
          label="Location"
          value={project.district ? `${project.district}, ${project.state ?? ''}` : project.state ?? '—'}
        />
        <InfoCard
          icon={<Calendar className="h-5 w-5" />}
          label="Timeline"
          value={
            project.startDate
              ? `${formatDate(project.startDate)} - ${project.endDate ? formatDate(project.endDate) : 'Ongoing'}`
              : '—'
          }
        />
        <InfoCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Sanctioned Amount"
          value={formatCurrency(project.sanctionedAmount)}
        />
        <InfoCard
          icon={<Flag className="h-5 w-5" />}
          label="Current Milestone"
          value={project.currentMilestone ?? '—'}
          highlight
        />
      </div>

      {/* Progress Bar */}
      {project.progressPercent != null && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Overall Progress</span>
              <span className="text-sm text-slate-500">{project.progressPercent}%</span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  project.progressPercent >= 100
                    ? 'bg-green-500'
                    : project.progressPercent >= 50
                    ? 'bg-vojas-500'
                    : 'bg-amber-500'
                )}
                style={{ width: `${project.progressPercent}%` }}
              />
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="milestones" className="space-y-4">
        <TabsList>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          {/* Current Milestone - Prominent */}
          {currentMilestones.length > 0 && (
            <Card className="border-vojas-500 border-2">
              <CardHeader className="bg-vojas-50">
                <div className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-vojas-600" />
                  <h3 className="font-semibold text-vojas-700">Current Milestone</h3>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                {currentMilestones.map((milestone) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} projectId={projectId} />
                ))}
              </CardBody>
            </Card>
          )}

          {/* Upcoming Milestones */}
          {upcomingMilestones.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Upcoming Milestones</h3>
              <div className="space-y-3">
                {upcomingMilestones.map((milestone) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} projectId={projectId} />
                ))}
              </div>
            </div>
          )}

          {/* Pending Verification */}
          {pendingVerification.length > 0 && (
            <div>
              <h3 className="font-semibold text-amber-700 mb-3">Pending Verification</h3>
              <div className="space-y-3">
                {pendingVerification.map((milestone) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} projectId={projectId} />
                ))}
              </div>
            </div>
          )}

          {/* Rejected / Needs Correction */}
          {rejectedMilestones.length > 0 && (
            <div>
              <h3 className="font-semibold text-red-700 mb-3">Needs Correction</h3>
              <div className="space-y-3">
                {rejectedMilestones.map((milestone) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} projectId={projectId} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Milestones */}
          {completedMilestones.length > 0 && (
            <div>
              <h3 className="font-semibold text-green-700 mb-3">Completed Milestones</h3>
              <div className="space-y-3">
                {completedMilestones.map((milestone) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} projectId={projectId} />
                ))}
              </div>
            </div>
          )}

          {milestonesLoading && (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          )}

          {!milestonesLoading && milestones.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No milestones found for this project.
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Project Documents</h3>
            <Button size="sm" leftIcon={<Upload className="h-4 w-4" />}>
              Upload Document
            </Button>
          </div>
          {documentsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          ) : documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">No documents uploaded yet.</div>
          )}
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Sanctioned"
              value={formatCurrency(project.sanctionedAmount)}
            />
            <InfoCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Released"
              value={formatCurrency(project.releasedAmount)}
            />
            <InfoCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Utilized"
              value={formatCurrency(project.utilizedAmount)}
            />
          </div>
          <Card>
            <CardBody>
              <p className="text-sm text-slate-600">
                Payment details are managed through the Payments section.
                Visit the{' '}
                <a href="/contractor/payments" className="text-vojas-600 hover:underline">
                  Payments page
                </a>{' '}
                for detailed payment information.
              </p>
            </CardBody>
          </Card>
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Project Issues</h3>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              Report Issue
            </Button>
          </div>
          <Card>
            <CardBody>
              <p className="text-sm text-slate-600">
                Visit the{' '}
                <a href="/contractor/issues" className="text-vojas-600 hover:underline">
                  Issues page
                </a>{' '}
                to view and manage issues for this project.
              </p>
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Helper Components ──────────────────────────────────────────────────────────

function InfoCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-vojas-200 bg-vojas-50' : ''}>
      <CardBody>
        <div className="flex items-center gap-2 text-slate-500 mb-1">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
        <p className={cn('font-medium', highlight ? 'text-vojas-700' : 'text-slate-900')}>{value}</p>
      </CardBody>
    </Card>
  );
}

function MilestoneCard({ milestone, projectId }: { milestone: ContractorMilestone; projectId: string }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-slate-900">{milestone.title}</h4>
              <Badge variant={milestoneStatusVariant[milestone.status] ?? 'neutral'}>
                {milestone.status.replace('_', ' ')}
              </Badge>
            </div>
            {milestone.description && (
              <p className="text-sm text-slate-600 mb-2">{milestone.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-slate-500">
              {milestone.dueDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due: {formatDate(milestone.dueDate)}
                </span>
              )}
              {milestone.amount && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(milestone.amount)}
                </span>
              )}
            </div>
            {milestone.rejectionNote && (
              <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                <strong>Rejection Note:</strong> {milestone.rejectionNote}
              </div>
            )}
            {milestone.correctionNote && (
              <div className="mt-2 p-2 bg-amber-50 rounded text-sm text-amber-700">
                <strong>Correction Needed:</strong> {milestone.correctionNote}
              </div>
            )}
          </div>
          <div className="flex gap-2 ml-4">
            {(milestone.status === 'CURRENT' || milestone.status === 'UPCOMING') && (
              <Button size="sm" variant="primary" leftIcon={<Upload className="h-3 w-3" />}>
                Submit
              </Button>
            )}
            {milestone.status === 'REJECTED' || milestone.status === 'CORRECTION_NEEDED' ? (
              <Button size="sm" variant="secondary" leftIcon={<Check className="h-3 w-3" />}>
                Correct
              </Button>
            ) : null}
          </div>
        </div>
        {milestone.progressPercent != null && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">Progress</span>
              <span className="text-slate-700">{milestone.progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-vojas-500 rounded-full"
                style={{ width: `${milestone.progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function DocumentCard({ document }: { document: ContractorDocument }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className="p-2 bg-slate-100 rounded-lg">
          <FileText className="h-5 w-5 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900">{document.title}</p>
          <p className="text-xs text-slate-500">
            {document.type} • Uploaded {formatDate(document.uploadedAt)}
          </p>
        </div>
        <Badge variant={docStatusVariant[document.status] ?? 'neutral'}>{document.status}</Badge>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </CardBody>
    </Card>
  );
}

function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-8 w-96 mb-2" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
}
