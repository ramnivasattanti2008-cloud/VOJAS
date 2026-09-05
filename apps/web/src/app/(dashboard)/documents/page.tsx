'use client';

import { useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Search, FileText, FileCheck, Download, Filter, X, Building2 } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useDocuments } from '@/hooks/useDocuments';
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

export default function DocumentsPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const { data, isLoading, error } = useDocuments({ limit: 100 });

  const documents = data?.data ?? [];
  const total = data?.total ?? 0;

  const filtered = documents.filter((d) => {
    if (type && d.type !== type) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.title.toLowerCase().includes(q) || d.filename.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {isLoading ? 'Loading…' : `${total} documents`}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search documents..."
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            aria-label="Search documents"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Type</label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All types</option>
            <option value="PDF">PDF</option>
            <option value="IMAGE">Image</option>
            <option value="INVOICE">Invoice</option>
            <option value="CONTRACT">Contract</option>
            <option value="REPORT">Report</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        {(search || type) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setType('');
            }}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load documents'}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="space-y-2">
                <div className="h-4 bg-slate-100 rounded animate-pulse w-1/3" />
                <div className="h-3 bg-slate-50 rounded animate-pulse w-1/2" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <FileText className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No documents found</p>
            <p className="text-xs text-slate-400 mt-1">
              {documents.length === 0
                ? 'Documents are uploaded per-project from the project detail page'
                : 'Try adjusting your search or filters'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <Card key={doc.id} className="hover:border-vojas-300 transition-colors">
              <CardBody>
                <div className="flex items-start gap-4">
                  <div className="text-3xl shrink-0">
                    {TYPE_ICON[doc.type] ?? '📎'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-medium text-slate-900 truncate">{doc.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{doc.filename}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
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
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                      {doc.project && (
                        <Link
                          href={`/projects/${doc.project.id}`}
                          className="flex items-center gap-1 hover:text-vojas-600"
                        >
                          <Building2 className="h-3 w-3" />
                          {doc.project.name}
                        </Link>
                      )}
                      {doc.uploadedBy && (
                        <span>By {doc.uploadedBy.name}</span>
                      )}
                      <span>{formatBytes(doc.size)}</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-vojas-600 hover:text-vojas-700 font-medium"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
