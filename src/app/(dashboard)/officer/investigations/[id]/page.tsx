'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createInvestigationsApi, createReferralsApi } from '@vojas/api-client';
import type { Referral, ReferralStatus } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import {
  Shield, ArrowLeft, Gavel, X, AlertTriangle, CheckCircle, XCircle,
  FileText, Camera, HardHat, MessageSquare, Loader2, Clock,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate, formatDateTime, cn } from '@/lib/utils';

const investigationsApi = createInvestigationsApi(apiClient);
const referralsApi = createReferralsApi(apiClient);

const REFERRAL_STATUS_BADGE: Record<string, 'neutral' | 'warning' | 'info' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  PENDING_REVIEW: 'warning',
  APPROVED: 'info',
  REFERRED: 'info',
  ACKNOWLEDGED: 'success',
  UNDER_REVIEW: 'warning',
  ACTION_TAKEN: 'success',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

const NEXT_STATUSES: Record<string, ReferralStatus[]> = {
  APPROVED: ['REFERRED'],
  REFERRED: ['ACKNOWLEDGED'],
  ACKNOWLEDGED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['ACTION_TAKEN'],
  ACTION_TAKEN: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
};

function NewReferralModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const [authority, setAuthority] = useState('');
  const [reason, setReason] = useState('');
  const qc = useQueryClient();

  const { data: authorities } = useQuery({
    queryKey: ['referral-authorities'],
    queryFn: () => investigationsApi.getAuthorities(),
  });

  const create = useMutation({
    mutationFn: () => investigationsApi.createReferral(caseId, { destinationAuthority: authority, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investigations', caseId, 'referrals'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Gavel className="h-5 w-5 text-vojas-600" /> Prepare Enforcement Referral
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              This creates a DRAFT referral only. It is not sent anywhere and no authority is notified until a
              separate authorized reviewer approves it.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Destination Authority</label>
            <select
              value={authority}
              onChange={(e) => setAuthority(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
            >
              <option value="">Select an authority...</option>
              {authorities?.authorities.map((a) => (
                <option key={a.code} value={a.code}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Reason for Referral</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe, using the real signals and evidence in this dossier, why this referral is being made..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500 min-h-24"
            />
          </div>
          {create.isError && (
            <p className="text-xs text-red-600">{create.error instanceof Error ? create.error.message : 'Failed to create referral'}</p>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!authority || reason.trim().length < 10 || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Saving draft...' : 'Save Draft'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReferralCard({ referral, caseId }: { referral: Referral; caseId: string }) {
  const qc = useQueryClient();
  const [rejectNotes, setRejectNotes] = useState('');
  const [showReject, setShowReject] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['investigations', caseId, 'referrals'] });

  const approve = useMutation({ mutationFn: () => referralsApi.approve(referral.id), onSuccess: invalidate });
  const reject = useMutation({ mutationFn: () => referralsApi.reject(referral.id, rejectNotes), onSuccess: () => { invalidate(); setShowReject(false); } });
  const advance = useMutation({ mutationFn: (status: ReferralStatus) => referralsApi.updateStatus(referral.id, status), onSuccess: invalidate });

  const canReview = referral.status === 'DRAFT' || referral.status === 'PENDING_REVIEW';
  const nextOptions = NEXT_STATUSES[referral.status] ?? [];

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={REFERRAL_STATUS_BADGE[referral.status] ?? 'neutral'}>{referral.status.replace(/_/g, ' ')}</Badge>
              <span className="text-xs font-mono text-slate-500">{referral.referenceNo}</span>
            </div>
            <p className="text-sm font-medium text-slate-800">To: {referral.destinationAuthority.replace(/_/g, ' ')}</p>
            <p className="text-sm text-slate-600 mt-1">{referral.reason}</p>
            <p className="text-xs text-slate-400 mt-2">
              Prepared by {referral.preparedBy?.name ?? referral.preparedById} · {formatDateTime(referral.createdAt)}
              {referral.approvedBy && ` · Approved by ${referral.approvedBy.name}`}
            </p>
            {referral.notes && <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{referral.notes}</p>}
          </div>
          <div className="flex flex-col gap-2 items-end shrink-0">
            {canReview && !showReject && (
              <>
                <Button size="sm" variant="primary" leftIcon={<CheckCircle className="h-3.5 w-3.5" />} disabled={approve.isPending} onClick={() => approve.mutate()}>
                  Approve
                </Button>
                <Button size="sm" variant="ghost" leftIcon={<XCircle className="h-3.5 w-3.5" />} onClick={() => setShowReject(true)}>
                  Reject
                </Button>
              </>
            )}
            {nextOptions.length > 0 && (
              <select
                className="text-xs px-2 py-1.5 rounded-lg border border-slate-300"
                defaultValue=""
                disabled={advance.isPending}
                onChange={(e) => { if (e.target.value) advance.mutate(e.target.value as ReferralStatus); }}
              >
                <option value="" disabled>Advance status...</option>
                {nextOptions.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            )}
          </div>
        </div>
        {showReject && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm min-h-16"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowReject(false)}>Cancel</Button>
              <Button size="sm" variant="danger" disabled={!rejectNotes.trim() || reject.isPending} onClick={() => reject.mutate()}>
                Confirm Reject
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default function InvestigationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [showNewReferral, setShowNewReferral] = useState(false);

  const { data: caseData, isLoading: caseLoading, error: caseError } = useQuery({
    queryKey: ['investigations', id],
    queryFn: () => investigationsApi.getById(id),
  });
  const { data: dossier, isLoading: dossierLoading, error: dossierError } = useQuery({
    queryKey: ['investigations', id, 'dossier'],
    queryFn: () => investigationsApi.getDossier(id),
  });
  const { data: referralsData } = useQuery({
    queryKey: ['investigations', id, 'referrals'],
    queryFn: () => investigationsApi.getCaseReferrals(id),
  });

  const referrals = referralsData?.data ?? [];

  if (caseLoading || dossierLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading investigation dossier...
      </div>
    );
  }

  if (caseError || dossierError || !caseData || !dossier) {
    return (
      <div className="space-y-4">
        <Link href="/officer/investigations">
          <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
        </Link>
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {caseError instanceof Error ? caseError.message : dossierError instanceof Error ? dossierError.message : 'Unable to load this investigation. It may not exist, or you may not be authorized.'}
        </div>
      </div>
    );
  }

  const intel = dossier.intelligence;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/officer/investigations">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} className="-ml-2 mb-2">Back</Button>
          </Link>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-vojas-600" /> {intel.project.name}
          </h1>
          <div className="flex items-center gap-3 text-sm text-slate-500 mt-1 flex-wrap">
            <Badge variant="neutral">{caseData.status.replace(/_/g, ' ')}</Badge>
            <Badge variant="neutral">{caseData.priority}</Badge>
            <span>{caseData.type.replace(/_/g, ' ')}</span>
            {dossier.responsibleOfficer && <span>Assigned: {dossier.responsibleOfficer.name}</span>}
          </div>
        </div>
        <Button variant="primary" leftIcon={<Gavel className="h-4 w-4" />} onClick={() => setShowNewReferral(true)}>
          Prepare Enforcement Referral
        </Button>
      </div>

      {/* Why flagged */}
      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-slate-900">Why This Case Matters</h3></CardHeader>
        <CardBody className="space-y-1">
          {intel.whyFlagged.map((line, i) => (
            <p key={i} className={cn('text-sm', line === '' ? 'h-2' : 'text-slate-600')}>{line}</p>
          ))}
        </CardBody>
      </Card>

      {/* Signal overview */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Signal Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {intel.signalCards.map((card) => (
            <Card key={card.key}>
              <CardBody className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-slate-500">{card.label}</p>
                  <Badge variant={card.status === 'HIGH' ? 'danger' : card.status === 'MEDIUM' ? 'warning' : card.status === 'LOW' ? 'success' : 'neutral'}>
                    {card.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">{card.summary}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* Cross-signal findings */}
      {intel.crossSignalFindings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Cross-Signal Findings ({intel.crossSignalFindings.length})</h3>
          <div className="space-y-2">
            {intel.crossSignalFindings.map((f) => (
              <Card key={f.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-800">{f.title}</h4>
                    <Badge variant={f.severity === 'HIGH' || f.severity === 'CRITICAL' ? 'danger' : 'warning'}>{f.severity}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{f.description}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Grid: inspections / contractor / citizen / evidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex items-center gap-2"><Camera className="h-4 w-4 text-slate-400" /><h3 className="text-sm font-semibold text-slate-900">Field Inspections</h3></CardHeader>
          <CardBody className="space-y-2">
            {dossier.fieldVerifications.length === 0 ? (
              <p className="text-xs text-slate-400">None on record.</p>
            ) : dossier.fieldVerifications.map((fv) => (
              <div key={fv.id} className="text-xs border-b border-slate-100 pb-2 last:border-0">
                <p className="text-slate-700">{fv.result.replace(/_/g, ' ')} — {fv.locationDesc ?? 'no location'}</p>
                <p className="text-slate-400">{fv.completedDate ? `Completed ${formatDate(fv.completedDate)}` : 'Not completed'}</p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2"><HardHat className="h-4 w-4 text-slate-400" /><h3 className="text-sm font-semibold text-slate-900">Contractor Submissions</h3></CardHeader>
          <CardBody className="space-y-2">
            {dossier.contractorSubmissions.length === 0 ? (
              <p className="text-xs text-slate-400">None on record.</p>
            ) : dossier.contractorSubmissions.map((c) => (
              <div key={c.id} className="text-xs border-b border-slate-100 pb-2 last:border-0">
                <p className="text-slate-700">{c.title} — {c.status.replace(/_/g, ' ')}</p>
                <p className="text-slate-400">{formatDate(c.submittedAt)}</p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-slate-400" /><h3 className="text-sm font-semibold text-slate-900">Citizen Reports</h3></CardHeader>
          <CardBody className="space-y-2">
            {dossier.citizenReports.length === 0 ? (
              <p className="text-xs text-slate-400">None on record.</p>
            ) : dossier.citizenReports.map((r) => (
              <div key={r.id} className="text-xs border-b border-slate-100 pb-2 last:border-0">
                <p className="text-slate-700">{r.title} ({r.category})</p>
                <p className="text-slate-400">{r.status.replace(/_/g, ' ')} · {r.isAnonymous ? 'Anonymous' : 'Identified'} · {formatDate(r.submittedAt)}</p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" /><h3 className="text-sm font-semibold text-slate-900">Evidence ({dossier.evidence.length})</h3></CardHeader>
          <CardBody className="space-y-2">
            {dossier.evidence.length === 0 ? (
              <p className="text-xs text-slate-400">None on record.</p>
            ) : dossier.evidence.slice(0, 8).map((e) => (
              <div key={e.id} className="text-xs border-b border-slate-100 pb-2 last:border-0">
                <p className="text-slate-700">{e.title}</p>
                <p className="text-slate-400">{e.evidenceType.replace(/_/g, ' ')} · {e.verificationStatus.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Referrals */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Gavel className="h-4 w-4 text-slate-400" /> Enforcement Referrals ({referrals.length})
        </h3>
        {referrals.length === 0 ? (
          <Card>
            <CardBody className="py-8 text-center text-slate-400 text-sm">
              <Clock className="h-6 w-6 mx-auto mb-2 text-slate-300" />
              No referrals prepared yet for this investigation.
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {referrals.map((r) => <ReferralCard key={r.id} referral={r} caseId={id} />)}
          </div>
        )}
      </div>

      {showNewReferral && <NewReferralModal caseId={id} onClose={() => setShowNewReferral(false)} />}
    </div>
  );
}
