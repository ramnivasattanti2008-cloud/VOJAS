'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, XCircle, Shield, Clock, FileText, ChevronRight, ExternalLink
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  useRiskFindings,
  useUpdateFindingStatus,
} from '@/hooks/useRisk';
import { formatDate } from '@/lib/utils';

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  ACKNOWLEDGED: 'bg-amber-100 text-amber-700',
  UNDER_REVIEW: 'bg-purple-100 text-purple-700',
  VERIFICATION_REQUIRED: 'bg-orange-100 text-orange-700',
  RESOLVED: 'bg-green-100 text-green-700',
  DISMISSED: 'bg-slate-100 text-slate-700',
  ESCALATED: 'bg-red-100 text-red-700',
};

export default function VerificationPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('VERIFICATION_REQUIRED');

  const { data, isLoading } = useRiskFindings(undefined, {
    status: statusFilter || undefined,
  });
  const updateStatus = useUpdateFindingStatus();

  const findings = data?.findings ?? [];
  const total = data?.total ?? 0;
  const selected = findings.find((f) => f.id === selectedId) ?? findings[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Verification</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Review and resolve risk findings through human verification
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: 'VERIFICATION_REQUIRED', label: 'Verification Required' },
          { key: 'UNDER_REVIEW', label: 'Under Review' },
          { key: 'ACKNOWLEDGED', label: 'Acknowledged' },
          { key: 'RESOLVED', label: 'Resolved' },
          { key: 'DISMISSED', label: 'Dismissed' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === key
                ? 'bg-vojas-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Queue list */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Queue</h2>
            </div>
            <Badge>{total}</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-50 rounded animate-pulse" />
                ))}
              </div>
            ) : findings.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Queue is empty
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {findings.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                      selected?.id === f.id ? 'bg-vojas-50 border-l-2 border-vojas-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 truncate">{f.title}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[f.severity]}`}>
                        {f.severity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Risk: {f.riskScore}</span>
                      {f.project && <span>&middot; {f.project.name}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Detail */}
        <Card className="lg:col-span-3">
          {selected ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="text-lg font-semibold text-slate-900">{selected.title}</h2>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[selected.severity]}`}>
                        {selected.severity}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selected.status]}`}>
                        {selected.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {selected.project && (
                      <button
                        className="text-sm text-vojas-600 hover:underline flex items-center gap-1"
                        onClick={() => router.push(`/projects/${selected.projectId}`)}
                      >
                        {selected.project.name} <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-3xl font-bold text-slate-900">{selected.riskScore}</p>
                    <p className="text-xs text-slate-500">/ 100</p>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Description
                  </h3>
                  <p className="text-sm text-slate-700">{selected.description}</p>
                </div>

                {selected.recommendedAction && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                    <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
                      Recommended Action
                    </h3>
                    <p className="text-sm text-blue-700">{selected.recommendedAction}</p>
                  </div>
                )}

                {selected.limitations && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                    <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
                      Limitations
                    </h3>
                    <p className="text-sm text-amber-700 whitespace-pre-line">{selected.limitations}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-slate-500">Risk Score</p>
                    <p className="text-lg font-semibold text-slate-900">{selected.riskScore}/100</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Confidence</p>
                    <p className="text-lg font-semibold text-slate-900">{selected.confidence}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Signals</p>
                    <p className="text-lg font-semibold text-slate-900">{selected.signalIds?.length ?? 0}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  Detected {formatDate(selected.detectedAt)} &middot; Algorithm: {selected.algorithmVersion}
                </div>

                {/* Action panel */}
                {selected.status !== 'RESOLVED' && selected.status !== 'DISMISSED' && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">Verification Action</h3>
                    <textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="Add notes (required for resolution/dismissal)..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 min-h-20"
                    />
                    <div className="flex flex-wrap gap-2">
                      {selected.status === 'NEW' && (
                        <Button
                          variant="secondary"
                          leftIcon={<Clock className="h-4 w-4" />}
                          onClick={() =>
                            updateStatus.mutate({
                              findingId: selected.id,
                              params: { status: 'UNDER_REVIEW' },
                            })
                          }
                        >
                          Start Review
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        leftIcon={<CheckCircle2 className="h-4 w-4" />}
                        disabled={!resolution.trim()}
                        onClick={() => {
                          updateStatus.mutate({
                            findingId: selected.id,
                            params: { status: 'RESOLVED', resolution },
                          });
                          setResolution('');
                        }}
                      >
                        Mark Resolved
                      </Button>
                      <Button
                        variant="ghost"
                        leftIcon={<XCircle className="h-4 w-4" />}
                        disabled={!resolution.trim()}
                        onClick={() => {
                          updateStatus.mutate({
                            findingId: selected.id,
                            params: { status: 'DISMISSED', resolution },
                          });
                          setResolution('');
                        }}
                      >
                        Dismiss
                      </Button>
                      <Button
                        variant="danger"
                        leftIcon={<Shield className="h-4 w-4" />}
                        onClick={() =>
                          updateStatus.mutate({
                            findingId: selected.id,
                            params: { status: 'ESCALATED' },
                          })
                        }
                      >
                        Escalate to Law Enforcement
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </>
          ) : (
            <CardBody className="py-16 text-center">
              <FileText className="h-8 w-8 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Select a finding to review</p>
              <p className="text-xs text-slate-400 mt-1">
                Choose from the queue to see full details
              </p>
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
}
