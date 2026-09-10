'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createInvestigationsApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import { Shield, FileSearch, Plus, ChevronRight, X } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

const investigationsApi = createInvestigationsApi(apiClient);

const STATUS_BADGE: Record<string, 'info' | 'warning' | 'success' | 'neutral'> = {
  OPEN: 'info',
  ASSIGNED: 'warning',
  UNDER_REVIEW: 'warning',
  CLOSED: 'neutral',
  REOPENED: 'info',
};

function NewInvestigationModal({ onClose }: { onClose: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [type, setType] = useState('RISK_VERIFICATION');
  const [priority, setPriority] = useState('MEDIUM');
  const [notes, setNotes] = useState('');
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: () => investigationsApi.create({ projectId, type, priority, notes: notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investigations'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Open New Investigation</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Project ID</label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Real project ID"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
            >
              <option value="RISK_VERIFICATION">Risk Verification</option>
              <option value="CITIZEN_COMPLAINT">Citizen Complaint Follow-up</option>
              <option value="FINANCIAL_REVIEW">Financial Review</option>
              <option value="FIELD_INSPECTION">Field Inspection Follow-up</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
            >
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500 min-h-20"
            />
          </div>
          {create.isError && (
            <p className="text-xs text-red-600">{create.error instanceof Error ? create.error.message : 'Failed to create investigation'}</p>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!projectId || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Creating...' : 'Open Investigation'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function InvestigationsListPage() {
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['investigations', statusFilter],
    queryFn: () => investigationsApi.list({ status: statusFilter || undefined, limit: 50 }),
  });

  const cases = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-vojas-600" />
            Investigations
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Open investigation cases, dossiers, and enforcement referrals.
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowNew(true)}>
          New Investigation
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {['', 'OPEN', 'ASSIGNED', 'UNDER_REVIEW', 'CLOSED', 'REOPENED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              statusFilter === s ? 'bg-vojas-600 text-white border-vojas-600' : 'bg-white text-slate-600 border-slate-200 hover:border-vojas-300'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load investigations'}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardBody className="h-16 bg-slate-50 rounded animate-pulse" /></Card>
          ))}
        </div>
      ) : cases.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <FileSearch className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No investigations found</p>
            <p className="text-xs text-slate-400 mt-1">Open a new investigation to start building a dossier.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Link key={c.id} href={`/officer/investigations/${c.id}`}>
              <Card className="hover:border-vojas-300 transition-colors cursor-pointer">
                <CardBody className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={STATUS_BADGE[c.status] ?? 'neutral'}>{c.status.replace(/_/g, ' ')}</Badge>
                      <Badge variant="neutral">{c.priority}</Badge>
                      <span className="text-xs text-slate-400">{c.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-800">{c.project?.name ?? c.projectId}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Opened {formatDate(c.createdAt)}
                      {c.assignedTo && ` · Assigned: ${c.assignedTo.name}`}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showNew && <NewInvestigationModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
