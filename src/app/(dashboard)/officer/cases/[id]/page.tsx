'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  ArrowLeft,
  ChevronRight,
  MapPin,
  FileText,
  Satellite,
  DollarSign,
  Users,
  UserCheck,
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Upload,
  Eye,
  RefreshCw,
  History,
  ExternalLink,
  Globe,
  Map,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  useOfficerCase,
  useOfficerCaseHistory,
  useOfficerAcknowledgeCase,
  useOfficerReviewCase,
  useOfficerRequestInfo,
  useOfficerRequestInspection,
  useOfficerRequestContractorResponse,
  useOfficerAddEvidence,
  useOfficerAddNotes,
  useOfficerVerifyCase,
  useOfficerDismissCase,
  useOfficerResolveCase,
  useOfficerReopenCase,
  useOfficerEscalateCase,
} from '@/hooks/useOfficer';
import { formatDate } from '@/lib/utils';

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-slate-100 text-slate-700',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  ASSIGNED: 'bg-purple-100 text-purple-700',
  UNDER_REVIEW: 'bg-indigo-100 text-indigo-700',
  VERIFICATION_REQUIRED: 'bg-orange-100 text-orange-700',
  RESOLVED: 'bg-green-100 text-green-700',
  DISMISSED: 'bg-slate-100 text-slate-700',
  ESCALATED: 'bg-red-100 text-red-700',
};

type TabKey = 'overview' | 'project' | 'evidence' | 'satellite' | 'financial' | 'history' | 'actions';

interface ActionModalProps {
  title: string;
  description?: string;
  show: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => void;
  confirmLabel: string;
  requiresNotes?: boolean;
  children?: React.ReactNode;
}

function ActionModal({ title, description, show, onClose, onConfirm, confirmLabel, requiresNotes, children }: ActionModalProps) {
  const [notes, setNotes] = useState('');

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {description && <p className="text-sm text-slate-600">{description}</p>}
          {children}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={requiresNotes ? 'Notes required...' : 'Add notes (optional)...'}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500 min-h-20"
            required={requiresNotes}
          />
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={requiresNotes && !notes.trim()}
            onClick={() => { onConfirm(notes); setNotes(''); }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function OfficerCaseWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showActionModal, setShowActionModal] = useState<string | null>(null);
  const [actionData, setActionData] = useState<any>({});

  const { data: caseData, isLoading, error, refetch } = useOfficerCase(id);
  const { data: historyData } = useOfficerCaseHistory(id);

  const acknowledgeCase = useOfficerAcknowledgeCase();
  const reviewCase = useOfficerReviewCase();
  const requestInfo = useOfficerRequestInfo();
  const requestInspection = useOfficerRequestInspection();
  const requestContractorResponse = useOfficerRequestContractorResponse();
  const addEvidence = useOfficerAddEvidence();
  const addNotes = useOfficerAddNotes();
  const verifyCase = useOfficerVerifyCase();
  const dismissCase = useOfficerDismissCase();
  const resolveCase = useOfficerResolveCase();
  const reopenCase = useOfficerReopenCase();
  const escalateCase = useOfficerEscalateCase();

  const handleAction = (action: string, data?: any) => {
    setShowActionModal(action);
    setActionData(data ?? {});
  };

  const executeAction = (action: string, notes?: string) => {
    const handlers: Record<string, () => void> = {
      acknowledge: () => acknowledgeCase.mutate(id),
      review: () => reviewCase.mutate({ caseId: id, notes }),
      requestInfo: () => requestInfo.mutate({ caseId: id, infoType: actionData.infoType ?? 'GENERAL', notes }),
      requestInspection: () => requestInspection.mutate({ caseId: id, reason: notes }),
      requestContractor: () => requestContractorResponse.mutate({ caseId: id, contractorId: actionData.contractorId, deadline: actionData.deadline }),
      addEvidence: () => addEvidence.mutate({ caseId: id, evidence: actionData.evidence }),
      addNotes: () => addNotes.mutate({ caseId: id, notes: notes! }),
      verify: () => verifyCase.mutate({ caseId: id, verified: actionData.verified ?? true, notes }),
      dismiss: () => dismissCase.mutate({ caseId: id, reason: notes! }),
      resolve: () => resolveCase.mutate({ caseId: id, resolution: notes! }),
      reopen: () => reopenCase.mutate({ caseId: id, reason: notes! }),
      escalate: () => escalateCase.mutate({ caseId: id, authority: actionData.authority ?? 'ACB', reason: notes }),
    };

    const handler = handlers[action];
    if (handler) {
      handler();
      setShowActionModal(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/officer/verification">
            <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
          </Link>
        </div>
        <Card>
          <CardBody className="py-12 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-red-400" />
            <p className="text-sm font-semibold text-slate-600">Case not found</p>
            <p className="text-xs text-slate-400 mt-1">{error?.message ?? 'Invalid case ID'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const c = caseData;

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: Shield },
    { key: 'project', label: 'Project', icon: MapPin },
    { key: 'evidence', label: 'Evidence', icon: FileText },
    { key: 'satellite', label: 'Satellite', icon: Satellite },
    { key: 'financial', label: 'Financial', icon: DollarSign },
    { key: 'history', label: 'History', icon: History },
  ];

  const actionButtons = [
    ...(c.status === 'NEW' ? [{ key: 'acknowledge', label: 'Acknowledge', icon: CheckCircle, variant: 'secondary' as const }] : []),
    ...(c.status !== 'RESOLVED' && c.status !== 'DISMISSED' ? [
      { key: 'review', label: 'Review', icon: Eye, variant: 'secondary' as const },
      { key: 'addNotes', label: 'Add Notes', icon: MessageSquare, variant: 'secondary' as const },
    ] : []),
    ...(c.status !== 'RESOLVED' && c.status !== 'DISMISSED' ? [
      { key: 'requestInfo', label: 'Request Info', icon: Send, variant: 'secondary' as const },
      { key: 'requestInspection', label: 'Request Inspection', icon: Map, variant: 'secondary' as const },
      { key: 'requestContractor', label: 'Request Contractor Response', icon: Users, variant: 'secondary' as const },
    ] : []),
    ...(c.status !== 'RESOLVED' && c.status !== 'DISMISSED' ? [
      { key: 'verify', label: 'Verify', icon: UserCheck, variant: 'secondary' as const },
    ] : []),
    ...(c.status !== 'RESOLVED' && c.status !== 'DISMISSED' ? [
      { key: 'resolve', label: 'Resolve', icon: CheckCircle, variant: 'primary' as const },
      { key: 'dismiss', label: 'Dismiss', icon: XCircle, variant: 'ghost' as const },
      { key: 'escalate', label: 'Escalate', icon: AlertTriangle, variant: 'danger' as const },
    ] : []),
    ...(c.status === 'RESOLVED' || c.status === 'DISMISSED' ? [
      { key: 'reopen', label: 'Reopen', icon: RefreshCw, variant: 'secondary' as const },
    ] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/officer/verification">
            <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{c.title}</h1>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[c.priority]}`}>
                {c.priority}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                {c.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="font-mono">{c.reference}</span>
              {c.project && <span>{c.project.name}</span>}
              {c.assignedTo && <span>Assigned: {c.assignedTo.name}</span>}
              <span>{c.age ?? 0} days old</span>
            </div>
          </div>
        </div>
        <Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {actionButtons.map(({ key, label, icon: Icon, variant }) => (
          <Button
            key={key}
            variant={variant}
            size="sm"
            leftIcon={<Icon className="h-4 w-4" />}
            onClick={() => handleAction(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-vojas-600 text-vojas-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-slate-900">Case Details</h3></CardHeader>
                <CardBody className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Description</p>
                    <p className="text-sm text-slate-700">{c.description}</p>
                  </div>
                  {c.assignedTo && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Assigned Officer</p>
                      <p className="text-sm text-slate-700">{c.assignedTo.name} ({c.assignedTo.email})</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Type</p>
                      <Badge variant="neutral">{c.type}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Confidence</p>
                      <p className="text-sm font-medium text-slate-700">{c.confidence}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-slate-900">Recommended Actions</h3>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-slate-600">
                    Review satellite imagery, compare with project records, and request field inspection if evidence is inconclusive.
                  </p>
                </CardBody>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-slate-900">Case Info</h3></CardHeader>
                <CardBody className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created</span>
                    <span className="text-slate-700">{formatDate(c.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Updated</span>
                    <span className="text-slate-700">{formatDate(c.updatedAt)}</span>
                  </div>
                  {c.project && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">State</span>
                        <span className="text-slate-700">{c.project.state}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">District</span>
                        <span className="text-slate-700">{c.project.district}</span>
                      </div>
                    </>
                  )}
                  {c.sector && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sector</span>
                      <span className="text-slate-700">{c.sector}</span>
                    </div>
                  )}
                </CardBody>
              </Card>

              {c.project && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">Project</h3>
                      <Link href={`/projects/${c.projectId}`}>
                        <Button variant="ghost" size="sm" rightIcon={<ExternalLink className="h-3 w-3" />}>
                          Open
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <p className="text-sm font-medium text-slate-700">{c.project.name}</p>
                  </CardBody>
                </Card>
              )}

              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-slate-900">Quick Stats</h3></CardHeader>
                <CardBody className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900">{c.evidenceCount ?? 0}</p>
                    <p className="text-xs text-slate-500">Evidence</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900">{c.notesCount ?? 0}</p>
                    <p className="text-xs text-slate-500">Notes</p>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'project' && c.project && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Project Context</h3>
                  <Link href={`/projects/${c.projectId}`}>
                    <Button variant="secondary" size="sm" rightIcon={<ExternalLink className="h-3 w-3" />}>
                      View Full Project
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Project Name</p>
                    <p className="text-sm font-medium text-slate-700">{c.project.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">State</p>
                    <p className="text-sm text-slate-700">{c.project.state}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">District</p>
                    <p className="text-sm text-slate-700">{c.project.district}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Sector</p>
                    <p className="text-sm text-slate-700">{c.sector ?? '—'}</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-slate-900">Time Machine</h3></CardHeader>
                <CardBody>
                  <Link href={`/projects/${c.projectId}/time-machine`}>
                    <Button variant="secondary" className="w-full" leftIcon={<Globe className="h-4 w-4" />}>
                      Open Time Machine
                    </Button>
                  </Link>
                </CardBody>
              </Card>

              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-slate-900">Location</h3></CardHeader>
                <CardBody>
                  <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-slate-400" />
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Evidence ({c.evidenceCount ?? 0})</h3>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Upload className="h-4 w-4" />}
                    onClick={() => handleAction('addEvidence')}
                  >
                    Add Evidence
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                {c.evidenceCount === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>No evidence attached</p>
                    <p className="text-xs text-slate-400 mt-1">Add satellite imagery, documents, or field photos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: c.evidenceCount ?? 0 }).map((_, i) => (
                      <div key={i} className="p-4 border border-slate-200 rounded-lg">
                        <div className="h-24 bg-slate-100 rounded mb-3 flex items-center justify-center">
                          <FileText className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-700">Evidence Item {i + 1}</p>
                        <p className="text-xs text-slate-500">Click to view details</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {activeTab === 'satellite' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Satellite Evidence</h3>
                  <Link href={`/projects/${c.projectId}/time-machine`}>
                    <Button variant="secondary" size="sm" rightIcon={<ExternalLink className="h-3 w-3" />}>
                      Open Time Machine
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardBody>
                <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                  <Satellite className="h-12 w-12 text-slate-400" />
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Financial Evidence</h3>
                  <Link href={`/projects/${c.projectId}`}>
                    <Button variant="secondary" size="sm" rightIcon={<ExternalLink className="h-3 w-3" />}>
                      View Financial Tab
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardBody>
                <div className="py-8 text-center text-slate-400">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p>Financial data for this case</p>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <Card>
              <CardHeader><h3 className="text-sm font-semibold text-slate-900">Action History</h3></CardHeader>
              <CardBody>
                {historyData?.actions && historyData.actions.length > 0 ? (
                  <div className="space-y-4">
                    {historyData.actions.map((action) => (
                      <div key={action.id} className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-vojas-100 flex items-center justify-center shrink-0">
                          <History className="h-4 w-4 text-vojas-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">{action.action}</span>
                            <span className="text-xs text-slate-400">{formatDate(action.createdAt)}</span>
                          </div>
                          {action.performedBy && (
                            <p className="text-xs text-slate-500">by {action.performedBy.name}</p>
                          )}
                          {action.notes && (
                            <p className="text-sm text-slate-600 mt-1">{action.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>No action history yet</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      {/* Action Modals */}
      <ActionModal
        title="Add Notes"
        show={showActionModal === 'addNotes'}
        onClose={() => setShowActionModal(null)}
        onConfirm={(notes) => executeAction('addNotes', notes)}
        confirmLabel="Add Notes"
        requiresNotes
      />

      <ActionModal
        title="Review Case"
        description="Mark this case as under review and add any notes."
        show={showActionModal === 'review'}
        onClose={() => setShowActionModal(null)}
        onConfirm={(notes) => executeAction('review', notes)}
        confirmLabel="Start Review"
      />

      <ActionModal
        title="Request Information"
        description="Request additional information about this case."
        show={showActionModal === 'requestInfo'}
        onClose={() => setShowActionModal(null)}
        onConfirm={(notes) => executeAction('requestInfo', notes)}
        confirmLabel="Send Request"
      />

      <ActionModal
        title="Request Field Inspection"
        description="Request a field officer to conduct an on-site inspection."
        show={showActionModal === 'requestInspection'}
        onClose={() => setShowActionModal(null)}
        onConfirm={(notes) => executeAction('requestInspection', notes)}
        confirmLabel="Request Inspection"
      />

      <ActionModal
        title="Request Contractor Response"
        description="Request the contractor to provide a response to this finding."
        show={showActionModal === 'requestContractor'}
        onClose={() => setShowActionModal(null)}
        onConfirm={() => executeAction('requestContractor')}
        confirmLabel="Send Request"
      />

      <ActionModal
        title="Verify Case"
        description="Mark this case as verified with your confirmation."
        show={showActionModal === 'verify'}
        onClose={() => setShowActionModal(null)}
        onConfirm={(notes) => executeAction('verify', notes)}
        confirmLabel="Verify"
      />

      <ActionModal
        title="Resolve Case"
        description="Mark this case as resolved. Provide a detailed resolution."
        show={showActionModal === 'resolve'}
        onClose={() => setShowActionModal(null)}
        onConfirm={(notes) => executeAction('resolve', notes)}
        confirmLabel="Resolve Case"
        requiresNotes
      />

      <ActionModal
        title="Dismiss Case"
        description="Dismiss this case if the evidence does not warrant further action."
        show={showActionModal === 'dismiss'}
        onClose={() => setShowActionModal(null)}
        onConfirm={(notes) => executeAction('dismiss', notes)}
        confirmLabel="Dismiss Case"
        requiresNotes
      />

      <ActionModal
        title="Reopen Case"
        description="Reopen this case if new evidence has emerged."
        show={showActionModal === 'reopen'}
        onClose={() => setShowActionModal(null)}
        onConfirm={(notes) => executeAction('reopen', notes)}
        confirmLabel="Reopen Case"
        requiresNotes
      />

      <ActionModal
        title="Escalate to Law Enforcement"
        description="Escalate this case to the appropriate law enforcement authority."
        show={showActionModal === 'escalate'}
        onClose={() => setShowActionModal(null)}
        onConfirm={(notes) => executeAction('escalate', notes)}
        confirmLabel="Escalate"
      />
    </div>
  );
}
