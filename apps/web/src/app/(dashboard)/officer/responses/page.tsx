'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  MessageSquare,
  Search,
  Filter,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  ExternalLink,
  FileText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useContractorResponses, useReviewContractorResponse } from '@/hooks/useOfficer';
import { formatDate } from '@/lib/utils';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING_REVIEW: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending Review' },
  ACCEPTED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Accepted' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  CLARIFICATION_REQUESTED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Clarification Requested' },
};

interface ResponseDetailModalProps {
  response: any;
  onClose: () => void;
  onReview: (status: string, notes?: string) => void;
}

function ResponseDetailModal({ response, onClose, onReview }: ResponseDetailModalProps) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionType, setActionType] = useState<string | null>(null);

  if (!response) return null;

  const statusConfig = STATUS_COLORS[response.status] ?? STATUS_COLORS.PENDING_REVIEW;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Contractor Response</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
            <span className="text-xs text-slate-400">
              Submitted {formatDate(response.submittedAt)}
            </span>
          </div>

          {/* Finding Info */}
          {response.findingTitle && (
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Finding</p>
              <p className="text-sm font-medium text-slate-700">{response.findingTitle}</p>
            </div>
          )}

          {/* Contractor Info */}
          {response.contractorName && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Contractor</p>
              <p className="text-sm font-medium text-slate-700">{response.contractorName}</p>
            </div>
          )}

          {/* Project Info */}
          {response.projectName && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Project</p>
              <p className="text-sm text-slate-700">{response.projectName}</p>
            </div>
          )}

          {/* Response Text */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Response</p>
            <div className="p-4 border border-slate-200 rounded-lg">
              <p className="text-sm text-slate-700 whitespace-pre-line">{response.responseText}</p>
            </div>
          </div>

          {/* Attached Documents */}
          {response.documents && response.documents.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Attached Documents</p>
              <div className="space-y-2">
                {response.documents.map((doc: any, i: number) => (
                  <a
                    key={i}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-vojas-600 hover:underline">{doc.name}</span>
                    <ExternalLink className="h-4 w-4 text-slate-400 ml-auto" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Deadline */}
          {response.deadline && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="h-4 w-4 text-slate-400" />
              Deadline: {formatDate(response.deadline)}
            </div>
          )}

          {/* Review Info */}
          {response.reviewedBy && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Review</p>
              <p className="text-sm text-green-700">
                Reviewed by {response.reviewedBy.name} on {formatDate(response.reviewedAt!)}
              </p>
              {response.reviewNotes && (
                <p className="text-sm text-green-600 mt-2">{response.reviewNotes}</p>
              )}
            </div>
          )}

          {/* Review Actions */}
          {response.status === 'PENDING_REVIEW' && (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <h4 className="text-sm font-semibold text-slate-900">Review This Response</h4>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add review notes (optional for accept/reject, required for clarification)..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500 min-h-20"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {response.status === 'PENDING_REVIEW' && (
            <>
              <Button
                variant="secondary"
                leftIcon={<MessageSquare className="h-4 w-4" />}
                onClick={() => {
                  if (reviewNotes.trim()) {
                    onReview('CLARIFICATION_REQUESTED', reviewNotes);
                  }
                }}
                disabled={!reviewNotes.trim()}
              >
                Request Clarification
              </Button>
              <Button
                variant="danger"
                leftIcon={<XCircle className="h-4 w-4" />}
                onClick={() => onReview('REJECTED', reviewNotes)}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                leftIcon={<CheckCircle className="h-4 w-4" />}
                onClick={() => onReview('ACCEPTED', reviewNotes)}
              >
                Accept
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContractorResponsesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [findingFilter, setFindingFilter] = useState<string>('');
  const [contractorFilter, setContractorFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);

  const queryParams = useMemo(() => ({
    status: statusFilter || undefined,
    findingId: findingFilter || undefined,
    contractorId: contractorFilter || undefined,
    limit: 50,
  }), [statusFilter, findingFilter, contractorFilter]);

  const { data, isLoading, error, refetch } = useContractorResponses(queryParams);
  const reviewResponse = useReviewContractorResponse();

  const responses = data?.data ?? [];
  const hasFilters = !!(statusFilter || findingFilter || contractorFilter);

  const filteredResponses = useMemo(() => {
    if (!search) return responses;
    const q = search.toLowerCase();
    return responses.filter((r) =>
      r.responseText?.toLowerCase().includes(q) ||
      r.contractorName?.toLowerCase().includes(q) ||
      r.projectName?.toLowerCase().includes(q) ||
      r.findingTitle?.toLowerCase().includes(q)
    );
  }, [responses, search]);

  const handleReview = (status: string, notes?: string) => {
    if (selectedResponse) {
      reviewResponse.mutate({
        responseId: selectedResponse.id,
        status: status as 'ACCEPTED' | 'REJECTED' | 'CLARIFICATION_REQUESTED',
        notes,
      });
      setSelectedResponse(null);
    }
  };

  // Status counts
  const statusCounts: Record<string, number> = useMemo(() => ({
    PENDING_REVIEW: responses.filter((r) => r.status === 'PENDING_REVIEW').length,
    ACCEPTED: responses.filter((r) => r.status === 'ACCEPTED').length,
    REJECTED: responses.filter((r) => r.status === 'REJECTED').length,
    CLARIFICATION_REQUESTED: responses.filter((r) => r.status === 'CLARIFICATION_REQUESTED').length,
  }), [responses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-vojas-600" />
            Contractor Responses
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Review and manage contractor responses to findings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/officer">
            <Button variant="secondary" size="sm">Back to Dashboard</Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.entries(STATUS_COLORS) as [keyof typeof STATUS_COLORS, typeof STATUS_COLORS[keyof typeof STATUS_COLORS]][]).map(([key, config]) => {
          const count = statusCounts[key] ?? 0;
          return (
            <Card
              key={key}
              className={`cursor-pointer transition-all ${statusFilter === key ? 'ring-2 ring-vojas-500' : 'hover:border-vojas-300'}`}
              onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
            >
              <CardBody className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${key === 'PENDING_REVIEW' ? 'bg-amber-500' : key === 'ACCEPTED' ? 'bg-green-500' : key === 'REJECTED' ? 'bg-red-500' : 'bg-blue-500'}`} />
                <div>
                  <p className="text-xl font-bold text-slate-900">{isLoading ? '—' : count}</p>
                  <p className={`text-xs ${config.text}`}>{config.label}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search responses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
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
                setSearch('');
                setStatusFilter('');
                setFindingFilter('');
                setContractorFilter('');
              }}
              leftIcon={<X className="h-3 w-3" />}
            >
              Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <Card>
            <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Finding</label>
                <input
                  type="text"
                  placeholder="Filter by finding..."
                  value={findingFilter}
                  onChange={(e) => setFindingFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Contractor</label>
                <input
                  type="text"
                  placeholder="Filter by contractor..."
                  value={contractorFilter}
                  onChange={(e) => setContractorFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
                />
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load responses'}
        </div>
      )}

      {/* Responses List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="h-20 bg-slate-50 rounded animate-pulse" />
            </Card>
          ))}
        </div>
      ) : filteredResponses.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <MessageSquare className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No responses found</p>
            <p className="text-xs text-slate-400 mt-1">
              {hasFilters ? 'Try adjusting your filters' : 'Contractor responses will appear here when submitted'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredResponses.map((response) => {
            const statusConfig = STATUS_COLORS[response.status] ?? STATUS_COLORS.PENDING_REVIEW;
            return (
              <Card
                key={response.id}
                className="hover:border-vojas-300 transition-colors cursor-pointer"
                onClick={() => setSelectedResponse(response)}
              >
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.label}
                        </span>
                        {response.findingTitle && (
                          <Badge variant="neutral" className="text-xs">
                            {response.findingTitle}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 line-clamp-2 mb-2">
                        {response.responseText}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        {response.contractorName && (
                          <span>Contractor: {response.contractorName}</span>
                        )}
                        {response.projectName && (
                          <span>Project: {response.projectName}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(response.submittedAt)}
                        </span>
                        {response.documents && response.documents.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {response.documents.length} docs
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {response.status === 'PENDING_REVIEW' && (
                        <Badge variant="warning" className="text-xs">
                          Needs Review
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedResponse && (
        <ResponseDetailModal
          response={selectedResponse}
          onClose={() => setSelectedResponse(null)}
          onReview={handleReview}
        />
      )}
    </div>
  );
}
