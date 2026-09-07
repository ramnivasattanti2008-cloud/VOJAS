'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  FileCheck,
  Search,
  Filter,
  X,
  FileText,
  Satellite,
  Image,
  DollarSign,
  User,
  Upload,
  CheckCircle,
  XCircle,
  ExternalLink,
  Link as LinkIcon,
  Calendar,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useOfficerEvidence, useOfficerVerifyEvidence } from '@/hooks/useOfficer';
import { formatDate } from '@/lib/utils';

const EVIDENCE_TYPES = [
  { key: 'SATELLITE', label: 'Satellite', icon: Satellite, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: 'DOCUMENT', label: 'Document', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'CITIZEN', label: 'Citizen', icon: User, color: 'text-green-600', bg: 'bg-green-50' },
  { key: 'FINANCIAL', label: 'Financial', icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'FIELD', label: 'Field', icon: Upload, color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'PHOTO', label: 'Photo', icon: Image, color: 'text-pink-600', bg: 'bg-pink-50' },
  { key: 'VIDEO', label: 'Video', icon: Image, color: 'text-red-600', bg: 'bg-red-50' },
];

const SOURCE_TYPES = ['MPLS_OFFICIAL', 'SATELLITE_CDSE', 'SATELLITE_GEE', 'CITIZEN_REPORT', 'FIELD_INSPECTION', 'DOCUMENT_UPLOAD', 'FINANCIAL_SYSTEM'];

export default function EvidenceCenterPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);

  const queryParams = useMemo(() => ({
    type: typeFilter || undefined,
    source: sourceFilter || undefined,
    projectId: projectFilter || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    limit: 50,
  }), [typeFilter, sourceFilter, projectFilter, fromDate, toDate]);

  const { data, isLoading, error } = useOfficerEvidence(queryParams);
  const verifyEvidence = useOfficerVerifyEvidence();

  const evidence = data?.data ?? [];
  const hasFilters = !!(typeFilter || sourceFilter || projectFilter || fromDate || toDate || search);

  const filteredEvidence = useMemo(() => {
    if (!search) return evidence;
    const q = search.toLowerCase();
    return evidence.filter((e) =>
      e.title.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.source.toLowerCase().includes(q)
    );
  }, [evidence, search]);

  const handleVerify = (evidenceId: string, verified: boolean) => {
    verifyEvidence.mutate({ evidenceId, verified });
  };

  const getTypeConfig = (type: string) => {
    return EVIDENCE_TYPES.find((t) => t.key === type) ?? EVIDENCE_TYPES[1];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-vojas-600" />
            Evidence Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Centralized evidence library for all officer cases
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/officer">
            <Button variant="secondary" size="sm">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {EVIDENCE_TYPES.slice(0, 4).map(({ key, label, icon: Icon, color, bg }) => {
          const count = evidence.filter((e) => e.type === key).length;
          return (
            <Card key={key}>
              <CardBody className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{isLoading ? '—' : count}</p>
                  <p className="text-xs text-slate-500">{label}</p>
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
              placeholder="Search evidence..."
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
                setTypeFilter('');
                setSourceFilter('');
                setProjectFilter('');
                setFromDate('');
                setToDate('');
              }}
              leftIcon={<X className="h-3 w-3" />}
            >
              Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <Card>
            <CardBody className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Type</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  {EVIDENCE_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Source</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                >
                  <option value="">All Sources</option>
                  {SOURCE_TYPES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Project ID</label>
                <input
                  type="text"
                  placeholder="Filter by project..."
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
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
          {error instanceof Error ? error.message : 'Failed to load evidence'}
        </div>
      )}

      {/* Evidence Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="h-48 bg-slate-50 rounded animate-pulse" />
            </Card>
          ))}
        </div>
      ) : filteredEvidence.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <FileCheck className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No evidence found</p>
            <p className="text-xs text-slate-400 mt-1">
              {hasFilters ? 'Try adjusting your filters' : 'Evidence will appear here as cases are worked on'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvidence.map((e) => {
            const typeConfig = getTypeConfig(e.type);
            return (
              <Card
                key={e.id}
                className="hover:border-vojas-300 transition-colors cursor-pointer"
                onClick={() => setSelectedEvidence(e)}
              >
                <CardBody className="space-y-3">
                  {/* Thumbnail placeholder */}
                  <div className={`h-32 rounded-lg ${typeConfig.bg} flex items-center justify-center`}>
                    <typeConfig.icon className={`h-10 w-10 ${typeConfig.color}`} />
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-slate-900 line-clamp-2">{e.title}</h3>
                      {e.verified ? (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                    </div>
                    {e.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{e.description}</p>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="neutral" className="text-xs">{typeConfig.label}</Badge>
                    {e.source && (
                      <span className="text-xs text-slate-400 truncate max-w-[120px]" title={e.source}>
                        {e.source.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="h-3 w-3" />
                      {formatDate(e.createdAt)}
                    </div>
                    {e.project && (
                      <Link
                        href={`/projects/${e.projectId}`}
                        className="text-xs text-vojas-600 hover:underline flex items-center gap-1"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        {e.project.name}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Evidence Detail Modal */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Evidence Details</h3>
              <button
                onClick={() => setSelectedEvidence(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Preview */}
              <div className={`h-48 rounded-lg ${getTypeConfig(selectedEvidence.type).bg} flex items-center justify-center`}>
                {React.createElement(getTypeConfig(selectedEvidence.type).icon, {
                  className: `h-16 w-16 ${getTypeConfig(selectedEvidence.type).color}`
                })}
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Title</p>
                  <p className="text-sm font-medium text-slate-700">{selectedEvidence.title}</p>
                </div>
                {selectedEvidence.description && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Description</p>
                    <p className="text-sm text-slate-600">{selectedEvidence.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Type</p>
                    <Badge variant="neutral">{getTypeConfig(selectedEvidence.type).label}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Source</p>
                    <p className="text-sm text-slate-600">{selectedEvidence.source}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Verified</p>
                    <p className="text-sm text-slate-600">{selectedEvidence.verified ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Created</p>
                    <p className="text-sm text-slate-600">{formatDate(selectedEvidence.createdAt)}</p>
                  </div>
                </div>
                {selectedEvidence.uploadedBy && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Uploaded By</p>
                    <p className="text-sm text-slate-600">{selectedEvidence.uploadedBy.name}</p>
                  </div>
                )}
                {selectedEvidence.chainOfCustody && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Chain of Custody</p>
                    <p className="text-sm text-slate-600">{selectedEvidence.chainOfCustody}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <Button
                variant="secondary"
                leftIcon={<LinkIcon className="h-4 w-4" />}
                onClick={() => {/* Link to case */}}
              >
                Link to Case
              </Button>
              {selectedEvidence.verified ? (
                <Button
                  variant="secondary"
                  leftIcon={<XCircle className="h-4 w-4" />}
                  onClick={() => handleVerify(selectedEvidence.id, false)}
                >
                  Unverify
                </Button>
              ) : (
                <Button
                  variant="primary"
                  leftIcon={<CheckCircle className="h-4 w-4" />}
                  onClick={() => handleVerify(selectedEvidence.id, true)}
                >
                  Verify
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Need to import React for JSX
import React from 'react';
