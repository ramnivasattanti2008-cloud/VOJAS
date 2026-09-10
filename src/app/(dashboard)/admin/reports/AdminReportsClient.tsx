'use client';

import { useState } from 'react';

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="hover:text-red-900" aria-label="Dismiss error">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
import { Search, Filter, X, Eye, CheckCircle, XCircle, AlertTriangle, Clock, Play, AlertCircle } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ExportButton } from '@/components/ui/ExportButton';
import { Modal } from '@/components/ui/Modal';
import { useCitizenReports, useModerateReport, useRunReportTriage } from '@/hooks/useCitizenReports';
import { REPORT_STATUS_LABELS, REPORT_CATEGORY_LABELS, type ModerationAction } from '@vojas/api-client';
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

const MODERATION_ACTIONS: { action: ModerationAction; label: string; icon: React.ReactNode; variant: 'success' | 'warning' | 'danger' | 'info'; description: string }[] = [
  { action: 'PUBLISH', label: 'Publish', icon: <CheckCircle className="h-4 w-4" />, variant: 'success', description: 'Make this report visible in transparency views' },
  { action: 'RESTRICT', label: 'Restrict', icon: <XCircle className="h-4 w-4" />, variant: 'warning', description: 'Limit access to authorized reviewers only' },
  { action: 'REQUEST_MORE_INFORMATION', label: 'Request Info', icon: <Clock className="h-4 w-4" />, variant: 'info', description: 'Contact reporter for additional details' },
  { action: 'REJECT', label: 'Reject', icon: <XCircle className="h-4 w-4" />, variant: 'danger', description: 'Reject this report (invalid or spam)' },
  { action: 'ESCALATE', label: 'Escalate', icon: <AlertTriangle className="h-4 w-4" />, variant: 'danger', description: 'Escalate to law enforcement or higher authority' },
];

export function AdminReportsClient() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [triageFilter, setTriageFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [moderationAction, setModerationAction] = useState<ModerationAction | null>(null);
  const [moderationReason, setModerationReason] = useState('');

  const { data, isLoading, error } = useCitizenReports({
    status: statusFilter || undefined,
    triageStatus: triageFilter || undefined,
    limit: 50,
  });

  const moderateMutation = useModerateReport();
  const triageMutation = useRunReportTriage();
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [triageError, setTriageError] = useState<string | null>(null);

  const reports = data?.data ?? [];
  const total = data?.total ?? 0;

  const hasFilters = !!(statusFilter || triageFilter);

  const handleOpenDetail = (report: any) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const handleModerate = async () => {
    if (!selectedReport || !moderationAction) return;
    try {
      await moderateMutation.mutateAsync({
        id: selectedReport.id,
        action: moderationAction,
        reason: moderationReason,
      });
      setModerationAction(null);
      setModerationReason('');
      setShowDetailModal(false);
    } catch {
      setModerationError('Moderation action failed. Please try again.');
    }
  };

  const handleRunTriage = async (id: string) => {
    try {
      await triageMutation.mutateAsync(id);
    } catch {
      setTriageError(`Triage failed for this report. Please try again.`);
    }
  };

  const pendingCount = reports.filter((r) => r.triageStatus === 'PENDING').length;
  const reviewCount = reports.filter((r) => r.status === 'REVIEW_QUEUE' || r.status === 'UNDER_VERIFICATION').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {(moderationError || triageError) && (
        <div className="space-y-2">
          {moderationError && <ErrorBanner message={moderationError} onDismiss={() => setModerationError(null)} />}
          {triageError && <ErrorBanner message={triageError} onDismiss={() => setTriageError(null)} />}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Citizen Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? 'Loading...' : `${total} reports found`}
          </p>
        </div>
        <ExportButton
          csvEndpoint={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/export/reports`}
          csvParams={{ status: statusFilter || undefined, triageStatus: triageFilter || undefined }}
          filenameHint="vojas-reports"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
              <p className="text-sm text-slate-500 mt-0.5">Pending Triage</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{reviewCount}</p>
              <p className="text-sm text-slate-500 mt-0.5">Under Review</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 text-green-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{resolvedCount}</p>
              <p className="text-sm text-slate-500 mt-0.5">Resolved</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
          />
        </div>

        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          leftIcon={<Filter className="h-4 w-4" />}
          onClick={() => setShowFilters((s) => !s)}
        >
          Filters
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setTriageFilter('');
            }}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white rounded-xl border border-slate-200">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Status</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="RECEIVED">Received</option>
              <option value="REVIEW_QUEUE">Review Queue</option>
              <option value="UNDER_VERIFICATION">Under Verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Triage Status</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
              value={triageFilter}
              onChange={(e) => setTriageFilter(e.target.value)}
            >
              <option value="">All triage statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="CATEGORY_SUGGESTED">Category Suggested</option>
              <option value="PROJECT_MATCHED">Project Matched</option>
              <option value="CLAIMS_EXTRACTED">Claims Extracted</option>
              <option value="DUPLICATES_CHECKED">Duplicates Checked</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </CardBody>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load reports'}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="space-y-2">
                <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
                <div className="h-3 bg-slate-50 rounded animate-pulse w-2/3" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No reports found</p>
            <p className="text-xs text-slate-400 mt-1">
              {hasFilters ? 'Try adjusting your filters' : 'No reports submitted yet'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports
            .filter((r) =>
              search
                ? r.title.toLowerCase().includes(search.toLowerCase()) ||
                  r.reportReference.toLowerCase().includes(search.toLowerCase()) ||
                  r.description.toLowerCase().includes(search.toLowerCase())
                : true
            )
            .map((r) => (
              <Card key={r.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-slate-500">{r.reportReference}</span>
                        <h3 className="font-semibold text-slate-900">{r.title}</h3>
                        <Badge variant={STATUS_VARIANT[r.status] ?? 'neutral'}>
                          {REPORT_STATUS_LABELS[r.status] || r.status}
                        </Badge>
                        <Badge variant={TRIAGE_STATUS_VARIANT[r.triageStatus] ?? 'neutral'}>
                          {r.triageStatus.replace(/_/g, ' ')}
                        </Badge>
                        {r.isAnonymous && <Badge variant="neutral">Anonymous</Badge>}
                        {r.privacyLevel !== 'PUBLIC' && (
                          <Badge variant="info">{r.privacyLevel}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{r.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                        <span className="font-mono">
                          {REPORT_CATEGORY_LABELS[r.category] || r.category}
                        </span>
                        {r.project && <span>Project: {r.project.name}</span>}
                        {r.assignedTo && <span>Assigned: {r.assignedTo.name}</span>}
                        <span>{formatDate(r.submittedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.triageStatus === 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRunTriage(r.id)}
                          isLoading={triageMutation.isPending}
                          leftIcon={<Play className="h-3 w-3" />}
                        >
                          Run Triage
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenDetail(r)}
                        leftIcon={<Eye className="h-4 w-4" />}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setModerationAction(null);
          setModerationReason('');
        }}
        title={`Review Report: ${selectedReport?.reportReference}`}
        size="lg"
        footer={
          moderationAction ? (
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Selected: <strong>{MODERATION_ACTIONS.find((a) => a.action === moderationAction)?.label}</strong>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setModerationAction(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleModerate}
                  isLoading={moderateMutation.isPending}
                  variant={MODERATION_ACTIONS.find((a) => a.action === moderationAction)?.variant as any}
                >
                  Confirm Action
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          )
        }
      >
        {selectedReport && (
          <div className="space-y-6">
            {/* Report Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={STATUS_VARIANT[selectedReport.status] ?? 'neutral'}>
                  {REPORT_STATUS_LABELS[selectedReport.status] || selectedReport.status}
                </Badge>
                <Badge variant={TRIAGE_STATUS_VARIANT[selectedReport.triageStatus] ?? 'neutral'}>
                  {selectedReport.triageStatus.replace(/_/g, ' ')}
                </Badge>
                {selectedReport.isAnonymous && <Badge variant="neutral">Anonymous</Badge>}
              </div>

              <h3 className="text-lg font-semibold text-slate-900">{selectedReport.title}</h3>
              <p className="text-slate-700">{selectedReport.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Category</p>
                  <p className="font-medium">
                    {REPORT_CATEGORY_LABELS[selectedReport.category] || selectedReport.category}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Privacy Level</p>
                  <p className="font-medium">{selectedReport.privacyLevel}</p>
                </div>
                <div>
                  <p className="text-slate-500">Submitted</p>
                  <p className="font-medium">{formatDateTime(selectedReport.submittedAt)}</p>
                </div>
                {selectedReport.incidentDate && (
                  <div>
                    <p className="text-slate-500">Incident Date</p>
                    <p className="font-medium">{formatDate(selectedReport.incidentDate)}</p>
                  </div>
                )}
                {selectedReport.locationDesc && (
                  <div className="col-span-2">
                    <p className="text-slate-500">Location</p>
                    <p className="font-medium">{selectedReport.locationDesc}</p>
                    {selectedReport.latitude && selectedReport.longitude && (
                      <p className="text-xs text-slate-500 font-mono">
                        {selectedReport.latitude}, {selectedReport.longitude}
                        {selectedReport.locationAccuracyM && ` (±${Math.round(selectedReport.locationAccuracyM)}m)`}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {!selectedReport.isAnonymous && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm text-slate-500 mb-2">Reporter Information</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedReport.reporterName && (
                      <div>
                        <span className="text-slate-500">Name: </span>
                        <span className="font-medium">{selectedReport.reporterName}</span>
                      </div>
                    )}
                    {selectedReport.reporterEmail && (
                      <div>
                        <span className="text-slate-500">Email: </span>
                        <span className="font-medium">{selectedReport.reporterEmail}</span>
                      </div>
                    )}
                    {selectedReport.reporterPhone && (
                      <div>
                        <span className="text-slate-500">Phone: </span>
                        <span className="font-medium">{selectedReport.reporterPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Triage Results */}
              {selectedReport.aiTriage && (
                <div className="bg-vojas-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-vojas-800 mb-2">AI Triage Analysis</p>
                  <div className="text-sm space-y-1">
                    {selectedReport.aiTriage.suggestedCategory && (
                      <p>
                        <span className="text-vojas-700">Suggested Category: </span>
                        {REPORT_CATEGORY_LABELS[selectedReport.aiTriage.suggestedCategory] || selectedReport.aiTriage.suggestedCategory}
                      </p>
                    )}
                    {selectedReport.aiTriage.evidenceQuality && (
                      <p>
                        <span className="text-vojas-700">Evidence Quality: </span>
                        {selectedReport.aiTriage.evidenceQuality}
                      </p>
                    )}
                    {selectedReport.aiTriage.notes && (
                      <p className="text-vojas-700">{selectedReport.aiTriage.notes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Claims */}
              {selectedReport.claims && selectedReport.claims.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Extracted Claims</p>
                  <div className="space-y-2">
                    {selectedReport.claims.map((claim: any) => (
                      <div key={claim.id} className="bg-slate-50 rounded-lg p-3 text-sm">
                        <p className="font-medium text-slate-800">{claim.claimText}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="neutral" className="text-xs">
                            {claim.claimType.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-slate-500 text-xs">
                            Confidence: {claim.confidenceScore}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Moderation Actions */}
            {!moderationAction ? (
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-medium text-slate-700 mb-3">Take Action</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MODERATION_ACTIONS.map((mod) => (
                    <button
                      key={mod.action}
                      onClick={() => setModerationAction(mod.action)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        mod.variant === 'success' ? 'border-green-200 hover:bg-green-50' :
                        mod.variant === 'warning' ? 'border-amber-200 hover:bg-amber-50' :
                        mod.variant === 'danger' ? 'border-red-200 hover:bg-red-50' :
                        'border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {mod.icon}
                        <span className="font-medium">{mod.label}</span>
                      </div>
                      <p className="text-xs text-slate-600">{mod.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-200 pt-4">
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Reason for {MODERATION_ACTIONS.find((a) => a.action === moderationAction)?.label}
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
                  rows={3}
                  placeholder="Enter reason for this action..."
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                />
              </div>
            )}

            {/* Moderation History */}
            {selectedReport.moderations && selectedReport.moderations.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Moderation History</p>
                <div className="space-y-2">
                  {selectedReport.moderations.map((mod: any) => (
                    <div key={mod.id} className="bg-slate-50 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <Badge variant="neutral">{mod.action}</Badge>
                        <span className="text-slate-500 text-xs">{formatDateTime(mod.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-slate-700">{mod.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
