'use client';

import { useDocuments } from '@/hooks/useDocuments';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FileText, FileCheck, Download, Upload } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const TYPE_ICON: Record<string, string> = {
  PDF: '📕',
  IMAGE: '🖼️',
  INVOICE: '🧾',
  RECEIPT: '🧾',
  CONTRACT: '📄',
  REPORT: '📊',
  OTHER: '📎',
};

function formatBytes(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ProjectDocumentsTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useDocuments({ projectId, limit: 50 });
  const documents = data?.data ?? [];

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
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Project Documents</h2>
        <span className="text-xs text-slate-500">{documents.length} document(s)</span>
      </CardHeader>
      {documents.length === 0 ? (
        <CardBody className="py-12 text-center">
          <Upload className="h-8 w-8 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">No documents uploaded</p>
          <p className="text-xs text-slate-400 mt-1">
            Documents (invoices, contracts, photos) will appear here
          </p>
        </CardBody>
      ) : (
        <div className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <div key={doc.id} className="px-5 py-3 flex items-center gap-4">
              <div className="text-2xl shrink-0">
                {TYPE_ICON[doc.type] ?? '📎'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-900 truncate">{doc.title}</p>
                  {doc.verified ? (
                    <Badge variant="success">
                      <FileCheck className="h-3 w-3 mr-0.5" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="warning">Pending</Badge>
                  )}
                  <Badge variant="neutral">{doc.type}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {doc.filename} · {formatBytes(doc.size)} · {formatDate(doc.createdAt)}
                </p>
              </div>
              {doc.url && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 text-xs text-vojas-600 hover:text-vojas-700 font-medium"
                  aria-label={`Download ${doc.title}`}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
