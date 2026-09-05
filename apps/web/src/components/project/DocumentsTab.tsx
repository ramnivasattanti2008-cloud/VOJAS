'use client';

import { useState, useRef } from 'react';
import {
  useDocuments,
  useDocumentsByProject,
  useDocumentExtraction,
  useDocumentCrossCheck,
  useUploadDocument,
  useReprocessDocument,
  useVerifyDocument,
} from '@/hooks/useDocuments';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  FileText, FileCheck, Download, Upload, ShieldCheck,
  AlertTriangle, XCircle, CheckCircle2, Loader2,
  ChevronDown, ChevronRight, Search, RefreshCw,
} from 'lucide-react';
import { formatDate, formatBytes, cn } from '@/lib/utils';

const TYPE_ICON: Record<string, string> = {
  PDF: '📕', IMAGE: '🖼️', INVOICE: '🧾', RECEIPT: '🧾',
  CONTRACT: '📄', REPORT: '📊', SANCTION_ORDER: '📋',
  COMPLETION_CERTIFICATE: '✅', TENDER: '📑', WORK_ORDER: '📝',
  ENVIRONMENTAL_CLEARANCE: '🌿', UTILIZATION_CERTIFICATE: '📊',
  PHOTOGRAPH: '📷', BILL_OF_QUANTITIES: '📐', OTHER: '📎',
};

const TYPE_COLORS: Record<string, string> = {
  INVOICE: 'bg-amber-50 border-amber-200 text-amber-700',
  RECEIPT: 'bg-green-50 border-green-200 text-green-700',
  COMPLETION_CERTIFICATE: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  CONTRACT: 'bg-blue-50 border-blue-200 text-blue-700',
  TENDER: 'bg-purple-50 border-purple-200 text-purple-700',
  SANCTION_ORDER: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  ENVIRONMENTAL_CLEARANCE: 'bg-teal-50 border-teal-200 text-teal-700',
};

const STATUS_BADGE: Record<string, { variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info'; label: string }> = {
  VERIFIED: { variant: 'success', label: 'Verified' },
  PENDING: { variant: 'warning', label: 'Pending' },
  REJECTED: { variant: 'danger', label: 'Rejected' },
  REQUIRES_INFO: { variant: 'neutral', label: 'Needs Info' },
};

export function ProjectDocumentsTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useDocuments({ projectId, limit: 50 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useUploadDocument();
  const reprocess = useReprocessDocument();
  const verify = useVerifyDocument();
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const documents = (data?.data ?? []).filter((doc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.title?.toLowerCase().includes(q) ||
      doc.type?.toLowerCase().includes(q) ||
      doc.filename?.toLowerCase().includes(q) ||
      doc.extractedText?.toLowerCase().includes(q)
    );
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1] ?? '';
        await upload.mutateAsync({
          projectId,
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          content: base64,
        });
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.onerror = () => setUploading(false);
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardBody className="space-y-2">
              <div className="h-4 bg-slate-100 rounded animate-pulse w-1/3" />
              <div className="h-3 bg-slate-50 rounded animate-pulse w-1/2" />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by name, type, or content…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vojas-500 focus:border-transparent"
          />
        </div>

        {/* Upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Upload className="h-4 w-4" />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || upload.isPending}
        >
          {uploading || upload.isPending ? 'Uploading…' : 'Upload Document'}
        </Button>
      </div>

      {/* Upload error */}
      {upload.isError && (
        <div className="px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Upload failed. Please try again.
        </div>
      )}

      {/* Document list */}
      {documents.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <Upload className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">
              {searchQuery ? 'No matching documents' : 'No documents uploaded'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Try a different search term' : 'Upload invoices, contracts, photos, and more'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              isExpanded={expandedId === doc.id}
              reprocessingId={reprocessingId}
              onToggle={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
              onReprocess={(id) => {
                setReprocessingId(id);
                reprocess.mutate(id, {
                  onSettled: () => setReprocessingId(null),
                });
              }}
              onVerify={({ id, status, note }) =>
                verify.mutate({ id, status: status as any, verificationNote: note })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentRow({
  doc,
  isExpanded,
  reprocessingId,
  onToggle,
  onReprocess,
  onVerify,
}: {
  doc: any;
  isExpanded: boolean;
  reprocessingId: string | null;
  onToggle: () => void;
  onReprocess: (id: string) => void;
  onVerify: (opts: { id: string; status: string; note?: string }) => void;
}) {
  const [showIntelligence, setShowIntelligence] = useState(false);
  const { data: extraction, isLoading: loadingExtraction } = useDocumentExtraction(
    showIntelligence ? doc.id : null
  );
  const { data: crossCheck, isLoading: loadingCrossCheck } = useDocumentCrossCheck(
    showIntelligence ? doc.id : null
  );

  const statusInfo = STATUS_BADGE[doc.status] ?? { variant: 'neutral' as const, label: doc.status };

  return (
    <Card className={cn(!isExpanded && 'hover:border-slate-300 transition-colors')}>
      {/* Header row */}
      <div
        className="px-5 py-3.5 flex items-center gap-3 cursor-pointer"
        onClick={onToggle}
        role="button"
        aria-expanded={isExpanded}
      >
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          {isExpanded
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="text-2xl shrink-0">{TYPE_ICON[doc.type] ?? '📎'}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-slate-900 truncate">{doc.title || doc.filename}</p>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full border font-medium',
              TYPE_COLORS[doc.type] ?? 'bg-slate-50 border-slate-200 text-slate-600'
            )}>
              {doc.type}
            </span>
            <Badge variant={statusInfo.variant}>
              {statusInfo.label}
            </Badge>
            {doc.aiConfidence != null && (
              <Badge variant={doc.aiConfidence >= 80 ? 'success' : doc.aiConfidence >= 50 ? 'warning' : 'neutral'}>
                AI {doc.aiConfidence}%
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {formatBytes(doc.size)} · {formatDate(doc.createdAt)}
            {doc.suggestedType && doc.suggestedType !== doc.type && (
              <span className="ml-2 text-amber-600">
                → Suggested: {doc.suggestedType}
              </span>
            )}
          </p>
        </div>

        {doc.url && (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 inline-flex items-center gap-1 text-xs text-vojas-600 hover:text-vojas-700 font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {/* Extracted text preview */}
          {doc.extractedText && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Extracted Text
              </h3>
              <pre className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                {doc.extractedText.slice(0, 800)}
                {(doc.extractedText?.length ?? 0) > 800 ? '…' : ''}
              </pre>
            </div>
          )}

          {/* Intelligence panel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Document Intelligence
              </h3>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={showIntelligence ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                onClick={() => setShowIntelligence(!showIntelligence)}
              >
                {showIntelligence ? 'Hide' : 'Analyze'}
              </Button>
            </div>

            {showIntelligence && (
              <div className="space-y-3">
                {/* Extraction status */}
                {loadingExtraction ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading extraction…
                  </div>
                ) : extraction ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">AI Confidence</p>
                      <p className="text-lg font-bold text-slate-900">
                        {extraction.aiConfidence != null ? `${extraction.aiConfidence}%` : '—'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Status</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {extraction.processingComplete ? '✅ Extracted' : '⏳ Processing'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Suggested Type</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {extraction.suggestedType ?? '—'}
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Cross-check results */}
                {loadingCrossCheck ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running cross-checks…
                  </div>
                ) : crossCheck ? (
                  <div className="space-y-2">
                    {/* Score */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
                        crossCheck.overallScore >= 70 ? 'bg-green-100 text-green-700' :
                        crossCheck.overallScore >= 40 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        {crossCheck.overallScore}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Cross-Check Score: {crossCheck.overallScore}/100
                          {crossCheck.overallPassed ? ' ✅ Passed' : ' ❌ Issues found'}
                        </p>
                      </div>
                    </div>

                    {/* Individual checks */}
                    <div className="space-y-1.5">
                      {crossCheck.checks.map((check, i) => (
                        <div key={i} className={cn(
                          'flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm',
                          check.passed
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                        )}>
                          {check.passed
                            ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                            : <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />}
                          <div>
                            <span className="font-medium">{check.checkType.replace(/_/g, ' ')}</span>
                            <span className="text-slate-600 ml-2">{check.finding}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Recommendations */}
                    {crossCheck.recommendations.length > 0 && (
                      <div className="space-y-1">
                        {crossCheck.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            {rec}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => onReprocess(doc.id)}
              disabled={reprocessingId !== null || reprocessingId === doc.id}
            >
              {reprocessingId === doc.id ? 'Reprocessing…' : 'Reprocess'}
            </Button>
            {doc.status !== 'VERIFIED' && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<ShieldCheck className="h-3.5 w-3.5" />}
                onClick={() => onVerify({ id: doc.id, status: 'VERIFIED' })}
              >
                Verify
              </Button>
            )}
            {doc.status === 'VERIFIED' && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<XCircle className="h-3.5 w-3.5" />}
                onClick={() => onVerify({ id: doc.id, status: 'REJECTED' })}
              >
                Reject
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
