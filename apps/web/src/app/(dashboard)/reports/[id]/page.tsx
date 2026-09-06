'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Shield,
  FileText,
  Image,
  CheckCircle,
  Clock,
  AlertCircle,
  Bot,
  MessageSquare,
  X,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useCitizenReport, useModerateReport, useUpdateCitizenReport, useRunReportTriage } from '@/hooks/useCitizenReports';
import { REPORT_STATUS_LABELS, REPORT_CATEGORY_LABELS, REPORT_CATEGORY_LABELS as CATEGORY_LABELS, type ModerationAction } from '@vojas/api-client';
import { formatDate, formatDateTime } from '@/lib/utils';

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

const TRIAGE_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  CATEGORY_SUGGESTED: 'info',
  PROJECT_MATCHED: 'info',
  CLAIMS_EXTRACTED: 'info',
  DUPLICATES_CHECKED: 'info',
  COMPLETED: 'success',
  FAILED: 'danger',
};

const MODERATION_ACTIONS: { action: ModerationAction; label: string; variant: 'success' | 'warning' | 'danger' | 'info' }[] = [
  { action: 'PUBLISH', label: 'Publish', variant: 'success' },
  { action: 'RESTRICT', label: 'Restrict', variant: 'warning' },
  { action: 'REQUEST_MORE_INFORMATION', label: 'Request Info', variant: 'info' },
  { action: 'REJECT', label: 'Reject', variant: 'danger' },
  { action: 'ESCALATE', label: 'Escalate', variant: 'danger' },
];

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [showModerationModal, setShowModerationModal] = useState(false);
  const [moderationAction, setModerationAction] = useState<ModerationAction | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);

  const { data: report, isLoading, error } = useCitizenReport(id);
  const updateMutation = useUpdateCitizenReport();
  const moderateMutation = useModerateReport();
  const triageMutation = useRunReportTriage();
  const [actionError, setActionError] = useState<string | null>(null);

  const handleStatusChange = async (status: string) => {
    if (!report) return;
    try {
      await updateMutation.mutateAsync({ id: report.id, payload: { status } });
    } catch {
      setActionError('Status update failed. Please try again.');
    }
  };

  const handleModerate = async () => {
    if (!report || !moderationAction) return;
    try {
      await moderateMutation.mutateAsync({
        id: report.id,
        action: moderationAction,
        reason: moderationReason,
      });
      setShowModerationModal(false);
      setModerationAction(null);
      setModerationReason('');
    } catch {
      setActionError('Moderation action failed. Please try again.');
    }
  };

  const handleRunTriage = async () => {
    if (!report) return;
    try {
      await triageMutation.mutateAsync(report.id);
    } catch {
      setActionError('AI triage failed. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-100 rounded animate-pulse w-48" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
        <div className="h-48 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Report Not Found</h2>
        <p className="text-slate-600 mb-6">The report you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.</p>
        <Link href="/reports">
          <Button>Back to Reports</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button onClick={() => setActionError(null)} className="hover:text-red-900" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/reports" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <span className="font-mono text-sm text-slate-500">{report.reportReference}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{report.title}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={STATUS_VARIANT[report.status] ?? 'neutral'} className="text-sm">
              {REPORT_STATUS_LABELS[report.status] || report.status}
            </Badge>
            <Badge variant={TRIAGE_STATUS_VARIANT[report.triageStatus] ?? 'neutral'}>
              {report.triageStatus.replace(/_/g, ' ')}
            </Badge>
            {report.isAnonymous ? (
              <Badge variant="neutral">Anonymous</Badge>
            ) : (
              <Badge variant="info">
                <User className="h-3 w-3 mr-1" />
                Identified
              </Badge>
            )}
            <Badge variant="neutral">{report.privacyLevel}</Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {report.triageStatus === 'PENDING' && (
            <Button
              variant="secondary"
              onClick={handleRunTriage}
              isLoading={triageMutation.isPending}
              leftIcon={<Bot className="h-4 w-4" />}
            >
              Run AI Triage
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => setShowModerationModal(true)}
          >
            Moderate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-500" />
                Description
              </h2>
            </CardHeader>
            <CardBody>
              <p className="text-slate-700 whitespace-pre-wrap">{report.description}</p>
            </CardBody>
          </Card>

          {/* AI Triage Results */}
          {report.aiTriage && (
            <Card className="border-vojas-200">
              <CardHeader className="bg-vojas-50">
                <h2 className="text-lg font-semibold text-vojas-800 flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Analysis
                  {report.aiAnalyzedAt && (
                    <span className="text-sm font-normal text-vojas-600">
                      — {formatDateTime(report.aiAnalyzedAt)}
                    </span>
                  )}
                </h2>
              </CardHeader>
              <CardBody className="space-y-4">
                {report.aiTriage.suggestedCategory && (
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-vojas-700">Suggested Category:</span>
                    <Badge variant="primary">
                      {REPORT_CATEGORY_LABELS[report.aiTriage.suggestedCategory] || report.aiTriage.suggestedCategory}
                    </Badge>
                  </div>
                )}
                {report.aiTriage.evidenceQuality && (
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-vojas-700">Evidence Quality:</span>
                    <Badge
                      variant={
                        report.aiTriage.evidenceQuality === 'HIGH'
                          ? 'success'
                          : report.aiTriage.evidenceQuality === 'MEDIUM'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {report.aiTriage.evidenceQuality}
                    </Badge>
                  </div>
                )}
                {report.aiTriage.notes && (
                  <div className="bg-vojas-50 rounded-lg p-3 text-sm text-vojas-800">
                    {report.aiTriage.notes}
                  </div>
                )}
                {report.aiTriage.matchedProjectIds && report.aiTriage.matchedProjectIds.length > 0 && (
                  <div>
                    <span className="text-sm text-vojas-700 block mb-2">Possible Related Projects:</span>
                    <div className="flex flex-wrap gap-2">
                      {report.aiTriage.matchedProjectIds.map((pid) => (
                        <Link key={pid} href={`/projects/${pid}`}>
                          <Badge variant="info" className="cursor-pointer hover:bg-blue-100">
                            {pid}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Claims */}
          {report.claims && report.claims.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-slate-500" />
                  Extracted Claims
                </h2>
              </CardHeader>
              <CardBody className="space-y-4">
                {report.claims.map((claim) => (
                  <div key={claim.id} className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="neutral">{claim.claimType.replace(/_/g, ' ')}</Badge>
                      <span className="text-xs text-slate-500">
                        Confidence: {claim.confidenceScore}%
                      </span>
                      <Badge
                        variant={claim.status === 'VERIFIED' ? 'success' : claim.status === 'REJECTED' ? 'danger' : 'warning'}
                        className="ml-auto"
                      >
                        {claim.status}
                      </Badge>
                    </div>
                    <p className="text-slate-700">{claim.claimText}</p>
                    {claim.verificationNote && (
                      <p className="text-sm text-slate-500 mt-2 italic">{claim.verificationNote}</p>
                    )}
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {/* Media */}
          {report.media && report.media.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Image className="h-5 w-5 text-slate-500" />
                  Evidence ({report.media.length} files)
                </h2>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {report.media.map((media) => (
                    <a
                      key={media.id}
                      href={media.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square bg-slate-100 rounded-lg overflow-hidden hover:bg-slate-200 transition-colors"
                    >
                      {media.mimeType.startsWith('image/') ? (
                        <img
                          src={media.url}
                          alt={media.originalName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="h-8 w-8 text-slate-400" />
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Moderation History */}
          {report.moderations && report.moderations.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-slate-500" />
                  Moderation History
                </h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {report.moderations.map((mod) => (
                    <div key={mod.id} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <Shield className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral">{mod.action}</Badge>
                          <span className="text-sm text-slate-500">{formatDateTime(mod.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-700 mt-1">{mod.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Details</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Category</p>
                <p className="font-medium">
                  {REPORT_CATEGORY_LABELS[report.category] || report.category}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Submitted</p>
                <p className="font-medium">{formatDateTime(report.submittedAt)}</p>
              </div>

              {report.incidentDate && (
                <div>
                  <p className="text-sm text-slate-500">Incident Date</p>
                  <p className="font-medium">{formatDate(report.incidentDate)}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-slate-500">Source</p>
                <p className="font-medium capitalize">{report.source}</p>
              </div>

              {report.project && (
                <div>
                  <p className="text-sm text-slate-500">Related Project</p>
                  <Link href={`/projects/${report.project.id}`}>
                    <p className="font-medium text-vojas-600 hover:underline">
                      {report.project.name}
                    </p>
                  </Link>
                  <p className="text-xs text-slate-500">
                    {report.project.district}, {report.project.state}
                  </p>
                </div>
              )}

              {report.assignedTo && (
                <div>
                  <p className="text-sm text-slate-500">Assigned To</p>
                  <p className="font-medium">{report.assignedTo.name}</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Location */}
          {(report.latitude || report.locationDesc) && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-slate-500" />
                  Location
                </h2>
              </CardHeader>
              <CardBody>
                {report.locationDesc && (
                  <p className="text-slate-700 mb-2">{report.locationDesc}</p>
                )}
                {report.latitude && report.longitude && (
                  <p className="text-sm font-mono text-slate-500">
                    {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                    {report.locationAccuracyM && ` (±${Math.round(report.locationAccuracyM)}m)`}
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          {/* Reporter */}
          {!report.isAnonymous && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <User className="h-5 w-5 text-slate-500" />
                  Reporter
                </h2>
              </CardHeader>
              <CardBody className="space-y-2">
                {report.reporterName && (
                  <div>
                    <p className="text-sm text-slate-500">Name</p>
                    <p className="font-medium">{report.reporterName}</p>
                  </div>
                )}
                {report.reporterEmail && (
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="font-medium">{report.reporterEmail}</p>
                  </div>
                )}
                {report.reporterPhone && (
                  <div>
                    <p className="text-sm text-slate-500">Phone</p>
                    <p className="font-medium">{report.reporterPhone}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Quick Status Change */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Status</h2>
            </CardHeader>
            <CardBody className="space-y-2">
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
                value={report.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updateMutation.isPending}
              >
                <option value="SUBMITTED">Submitted</option>
                <option value="RECEIVED">Received</option>
                <option value="REVIEW_QUEUE">Review Queue</option>
                <option value="UNDER_VERIFICATION">Under Verification</option>
                <option value="VERIFIED">Verified</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
                <option value="ESCALATED">Escalated</option>
              </select>
              {report.resolution && (
                <div className="mt-3">
                  <p className="text-sm text-slate-500">Resolution</p>
                  <p className="text-sm text-slate-700">{report.resolution}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Moderation Modal */}
      <Modal
        isOpen={showModerationModal}
        onClose={() => {
          setShowModerationModal(false);
          setModerationAction(null);
          setModerationReason('');
        }}
        title="Moderate Report"
        footer={
          moderationAction ? (
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setModerationAction(null)}>
                Back
              </Button>
              <Button onClick={handleModerate} isLoading={moderateMutation.isPending}>
                Confirm
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setShowModerationModal(false)}>
              Close
            </Button>
          )
        }
      >
        {!moderationAction ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 mb-4">Select an action to take on this report:</p>
            {MODERATION_ACTIONS.map((mod) => (
              <button
                key={mod.action}
                onClick={() => setModerationAction(mod.action)}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  mod.variant === 'success' ? 'border-green-200 hover:bg-green-50' :
                  mod.variant === 'warning' ? 'border-amber-200 hover:bg-amber-50' :
                  'border-red-200 hover:bg-red-50'
                }`}
              >
                <span className="font-medium">{mod.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Provide a reason for <strong>{MODERATION_ACTIONS.find((a) => a.action === moderationAction)?.label}</strong>:
            </p>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
              rows={4}
              placeholder="Enter reason..."
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
