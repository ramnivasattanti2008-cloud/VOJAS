'use client';

/**
 * M14 Admin: Data Source Management
 * Source list, sync status, record counts, authorized sync triggers
 */

import { useState } from 'react';
import {
  Database, Search, RefreshCw, RefreshCw as Sync, ExternalLink,
  AlertCircle, CheckCircle, XCircle, Clock, HardDrive, Globe,
  Eye, X, Loader2,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn, formatDateTime } from '@/lib/utils';
import { useAdminDataSources, useTriggerDataSourceSync } from '@/hooks/useAdmin';

const STATUS_COLORS = {
  ACTIVE: 'success',
  STALE: 'warning',
  UNAVAILABLE: 'danger',
  DEPRECATED: 'neutral',
};

const FORMAT_ICONS: Record<string, string> = {
  CSV: 'text-amber-600',
  JSON: 'text-blue-600',
  XML: 'text-purple-600',
  API: 'text-emerald-600',
  MANUAL: 'text-slate-600',
};

export default function AdminDataSourcesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: sources, isLoading, refetch } = useAdminDataSources({
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const syncMutation = useTriggerDataSourceSync();

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      await syncMutation.mutateAsync(id);
      setError(null);
    } catch {
      setError('Sync failed. Please try again.');
    } finally {
      setSyncingId(null);
    }
  };

  const filteredSources = sources?.filter((s) =>
    s.sourceName.toLowerCase().includes(search.toLowerCase()) ||
    s.datasetName.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'STALE': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'UNAVAILABLE': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'DEPRECATED': return <XCircle className="h-4 w-4 text-slate-400" />;
      default: return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Database className="h-4 w-4" />
            <span>System Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Data Source Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor data sources, trigger authorized syncs, view freshness
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search data sources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="STALE">Stale</option>
          <option value="UNAVAILABLE">Unavailable</option>
          <option value="DEPRECATED">Deprecated</option>
        </select>
        <span className="text-xs text-slate-500 ml-auto">
          {filteredSources.length} sources
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="hover:text-red-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Data Sources Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardBody className="p-6">
                <div className="h-6 bg-slate-100 rounded animate-pulse w-1/3 mb-4" />
                <div className="h-4 bg-slate-50 rounded animate-pulse w-2/3" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : filteredSources.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center">
            <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">No data sources found</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSources.map((source) => (
            <Card key={source.id}>
              <CardBody>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      source.status === 'ACTIVE' && 'bg-emerald-50',
                      source.status === 'STALE' && 'bg-amber-50',
                      source.status === 'UNAVAILABLE' && 'bg-red-50',
                      source.status === 'DEPRECATED' && 'bg-slate-50'
                    )}>
                      <Database className={cn(
                        'h-5 w-5',
                        source.status === 'ACTIVE' && 'text-emerald-600',
                        source.status === 'STALE' && 'text-amber-600',
                        source.status === 'UNAVAILABLE' && 'text-red-600',
                        source.status === 'DEPRECATED' && 'text-slate-400'
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{source.sourceName}</h3>
                      <p className="text-sm text-slate-500">{source.datasetName}</p>
                      {source.department && (
                        <p className="text-xs text-slate-400 mt-1">{source.department}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={(STATUS_COLORS[source.status as keyof typeof STATUS_COLORS] ?? 'neutral') as any}>
                    {source.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="text-center p-2 rounded-lg bg-slate-50">
                    <p className="text-lg font-bold text-slate-900">{source.recordCount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Records</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-50">
                    <p className={cn(
                      'text-lg font-bold',
                      source.apiAvailable ? 'text-emerald-600' : 'text-slate-400'
                    )}>
                      {source.format}
                    </p>
                    <p className="text-xs text-slate-500">Format</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-50">
                    <div className="flex items-center justify-center gap-1">
                      {getStatusIcon(source.status)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Status</p>
                  </div>
                </div>

                <div className="text-xs text-slate-500 mb-4 space-y-1">
                  <div className="flex justify-between">
                    <span>Last Fetched:</span>
                    <span className="text-slate-700">
                      {source.lastFetched ? formatDateTime(source.lastFetched) : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Updated:</span>
                    <span className="text-slate-700">
                      {source.lastUpdated ? formatDateTime(source.lastUpdated) : 'Unknown'}
                    </span>
                  </div>
                </div>

                {source.lastError && (
                  <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">{source.lastError}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleSync(source.id)}
                    disabled={syncingId === source.id || source.status === 'UNAVAILABLE'}
                    leftIcon={syncingId === source.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sync className="h-3 w-3" />}
                  >
                    {syncingId === source.id ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  {source.officialUrl && (
                    <a
                      href={source.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedSource(source);
                      setShowDetailModal(true);
                    }}
                    leftIcon={<Eye className="h-3 w-3" />}
                  >
                    Details
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Source Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedSource(null);
        }}
        title="Data Source Details"
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
        }
      >
        {selectedSource && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                <Database className="h-6 w-6 text-slate-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedSource.sourceName}</h3>
                <p className="text-sm text-slate-500">{selectedSource.datasetName}</p>
              </div>
              <Badge variant={(STATUS_COLORS[selectedSource.status as keyof typeof STATUS_COLORS] ?? 'neutral') as any} className="ml-auto">
                {selectedSource.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Department</p>
                <p className="font-medium text-slate-900">{selectedSource.department || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500">Format</p>
                <p className="font-medium text-slate-900">{selectedSource.format}</p>
              </div>
              <div>
                <p className="text-slate-500">API Available</p>
                <p className="font-medium text-slate-900">{selectedSource.apiAvailable ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-slate-500">Download Available</p>
                <p className="font-medium text-slate-900">{selectedSource.downloadAvailable ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-slate-500">Last Fetched</p>
                <p className="font-medium text-slate-900">
                  {selectedSource.lastFetched ? formatDateTime(selectedSource.lastFetched) : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Last Updated</p>
                <p className="font-medium text-slate-900">
                  {selectedSource.lastUpdated ? formatDateTime(selectedSource.lastUpdated) : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Record Count</p>
                <p className="font-medium text-slate-900">{selectedSource.recordCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500">Created</p>
                <p className="font-medium text-slate-900">{formatDateTime(selectedSource.createdAt)}</p>
              </div>
            </div>

            {selectedSource.officialUrl && (
              <div>
                <p className="text-slate-500 mb-1">Official URL</p>
                <a
                  href={selectedSource.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-vojas-600 hover:underline break-all"
                >
                  {selectedSource.officialUrl}
                </a>
              </div>
            )}

            {selectedSource.notes && (
              <div>
                <p className="text-slate-500 mb-1">Notes</p>
                <p className="text-sm text-slate-700">{selectedSource.notes}</p>
              </div>
            )}

            {selectedSource.transformationNotes && (
              <div>
                <p className="text-slate-500 mb-1">Transformation Notes</p>
                <p className="text-sm text-slate-700">{selectedSource.transformationNotes}</p>
              </div>
            )}

            {selectedSource.lastError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-700 mb-1">Last Error</p>
                <p className="text-sm text-red-600">{selectedSource.lastError}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
