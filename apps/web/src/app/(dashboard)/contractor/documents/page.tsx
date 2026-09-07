'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  X,
  Upload,
  FileText,
  Eye,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useContractorDocuments } from '@/hooks/useContractor';
import { formatDate, cn } from '@/lib/utils';
import type { ContractorDocument } from '@vojas/api-client';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
};

const statusLabels: Record<string, string> = {
  VERIFIED: 'Verified',
  PENDING: 'Pending',
  REJECTED: 'Rejected',
};

const docTypes = [
  'TENDER',
  'CONTRACT',
  'COMPLETION_CERT',
  'INSPECTION_REPORT',
  'BILL',
  'WORK_ORDER',
  'MILESTONE_EVIDENCE',
  'PERMIT',
  'PHOTO_EVIDENCE',
  'OTHER',
];

export default function DocumentsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useContractorDocuments({
    type: typeFilter || undefined,
    page: 1,
    limit: 100,
  });

  const documents = data?.data ?? [];

  // Group by status
  const pending = documents.filter((d) => d.status === 'PENDING');
  const verified = documents.filter((d) => d.status === 'VERIFIED');
  const rejected = documents.filter((d) => d.status === 'REJECTED');

  // Filter by search
  const filteredDocuments = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.projectName?.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">DOCUMENTS</h1>
        <p className="text-emerald-100 text-sm">
          Upload, manage, and track your project documents
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Total Documents"
          value={documents.length}
          color="slate"
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="Pending"
          value={pending.length}
          color="amber"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Verified"
          value={verified.length}
          color="green"
        />
        <StatCard
          icon={<X className="h-5 w-5" />}
          label="Rejected"
          value={rejected.length}
          color="red"
        />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {docTypes.map((type) => (
            <option key={type} value={type}>
              {type.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
        {(typeFilter || statusFilter || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTypeFilter('');
              setStatusFilter('');
              setSearch('');
            }}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
        <Button size="sm" variant="primary" leftIcon={<Upload className="h-4 w-4" />}>
          Upload Document
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load documents'}
        </div>
      )}

      {/* Missing Documents Alert */}
      {pending.length > 0 && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50">
          <CardBody className="flex items-center gap-4">
            <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">
                {pending.length} Document{pending.length > 1 ? 's' : ''} Require{pending.length === 1 ? 's' : ''} Upload
              </p>
              <p className="text-sm text-amber-700">
                These documents are pending or were rejected. Please upload the required documents.
              </p>
            </div>
            <Button size="sm" variant="secondary" leftIcon={<Upload className="h-3 w-3" />}>
              Upload Now
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Document List */}
      {isLoading ? (
        <DocumentSkeleton />
      ) : filteredDocuments.length > 0 ? (
        <div className="space-y-3">
          {filteredDocuments.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No Documents Found</h3>
          <p className="text-sm">
            {search || typeFilter || statusFilter
              ? 'Try adjusting your search or filters.'
              : 'Upload your first document to get started.'}
          </p>
          {!search && !typeFilter && !statusFilter && (
            <Button size="sm" variant="primary" leftIcon={<Upload className="h-4 w-4" />} className="mt-4">
              Upload Document
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Components ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'slate' | 'amber' | 'green' | 'red';
}) {
  const colorClasses = {
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg', colorClasses[color])}>{icon}</div>
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-lg font-bold text-slate-900">{value}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function DocumentCard({ document }: { document: ContractorDocument }) {
  const isRejected = document.status === 'REJECTED';

  return (
    <Card className={cn(isRejected && 'border-l-4 border-l-red-500')}>
      <CardBody className="flex items-center gap-4">
        {/* Icon */}
        <div className="p-3 bg-slate-100 rounded-lg flex-shrink-0">
          <FileText className="h-6 w-6 text-slate-500" />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-slate-900 truncate">{document.title}</h3>
            <Badge variant={statusVariant[document.status] ?? 'neutral'}>
              {statusLabels[document.status]}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">
              {document.type.replace(/_/g, ' ')}
            </span>
            {document.projectName && (
              <button
                onClick={() => window.location.href = `/contractor/projects/${document.projectId}`}
                className="text-vojas-600 hover:underline"
              >
                {document.projectName}
              </button>
            )}
            {document.milestoneTitle && (
              <span>{document.milestoneTitle}</span>
            )}
          </div>
          {document.description && (
            <p className="text-sm text-slate-600 mt-1 truncate">{document.description}</p>
          )}
          {document.rejectionNote && (
            <p className="text-sm text-red-600 mt-1">
              <strong>Rejection Reason:</strong> {document.rejectionNote}
            </p>
          )}
        </div>

        {/* Timestamps */}
        <div className="text-right text-xs text-slate-500 flex-shrink-0">
          <p>Uploaded {formatDate(document.uploadedAt)}</p>
          {document.verifiedAt && (
            <p className="text-green-600">Verified {formatDate(document.verifiedAt)}</p>
          )}
          {document.verifiedBy && (
            <p>By: {document.verifiedBy}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" title="View">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" title="Download">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function DocumentSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-20 rounded-lg" />
      <Skeleton className="h-20 rounded-lg" />
      <Skeleton className="h-20 rounded-lg" />
    </div>
  );
}
