'use client';

/**
 * M14 Admin: Satellite Control Center
 * Provider status, dataset availability, observation job queue, retry operations
 */

import { useState } from 'react';
import {
  Satellite, RefreshCw, Globe, CheckCircle, AlertTriangle, XCircle,
  Activity, Clock, Database, Play, Loader2, Eye,
  AlertCircle, X,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn, formatDateTime } from '@/lib/utils';
import { useSatelliteProviders, useSatelliteObservations, useRetrySatelliteJob } from '@/hooks/useAdmin';

const PROVIDER_STATUS_COLORS = {
  ONLINE: 'text-emerald-500',
  DEGRADED: 'text-amber-500',
  OFFLINE: 'text-red-500',
  UNKNOWN: 'text-slate-400',
};

const PROVIDER_STATUS_BG = {
  ONLINE: 'bg-emerald-50',
  DEGRADED: 'bg-amber-50',
  OFFLINE: 'bg-red-50',
  UNKNOWN: 'bg-slate-50',
};

export default function AdminSatellitesPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const { data: providers, isLoading: providersLoading } = useSatelliteProviders();
  const { data: observationsData, isLoading: obsLoading } = useSatelliteObservations({ limit: 20 });
  const retryMutation = useRetrySatelliteJob();

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleRetry = async (jobId: string) => {
    setRetryingId(jobId);
    try {
      await retryMutation.mutateAsync(jobId);
    } catch {
      // Error handled by hook
    } finally {
      setRetryingId(null);
    }
  };

  const observations = observationsData?.observations ?? [];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Satellite className="h-4 w-4" />
            <span>System Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Satellite Control Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor satellite providers, datasets, and observation processing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Satellite Providers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800">Satellite Providers</h3>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {providersLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : !providers || providers.length === 0 ? (
            <div className="p-12 text-center">
              <Satellite className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No satellite providers configured</p>
              <p className="text-slate-400 text-sm mt-1">
                Satellite data sources are not available.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {providers.map((provider) => (
                <div key={provider.id} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center',
                        PROVIDER_STATUS_BG[provider.status] ?? PROVIDER_STATUS_BG.UNKNOWN
                      )}>
                        <Satellite className={cn(
                          'h-6 w-6',
                          PROVIDER_STATUS_COLORS[provider.status] ?? PROVIDER_STATUS_COLORS.UNKNOWN
                        )} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{provider.name}</h4>
                        <Badge
                          variant={
                            provider.status === 'ONLINE' ? 'success' :
                            provider.status === 'DEGRADED' ? 'warning' : 'danger'
                          }
                        >
                          {provider.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm space-y-1">
                      <div className="flex items-center gap-2 justify-end">
                        <Database className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-700">
                          {provider.datasets.filter((d) => d.available).length}/{provider.datasets.length} datasets
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Datasets */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                      Datasets ({provider.datasets.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {provider.datasets.map((dataset) => (
                        <div
                          key={dataset.id}
                          className="p-2 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">{dataset.name}</span>
                            {dataset.available ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                            <span>{dataset.coverage}</span>
                            <span>
                              {dataset.lastUpdated
                                ? formatDateTime(dataset.lastUpdated)
                                : 'Never updated'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">
                        {provider.stats.totalObservations.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">Total Observations</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">
                        {provider.stats.processingQueue}
                      </p>
                      <p className="text-xs text-slate-500">Processing Queue</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-600">
                        {provider.stats.failedJobs}
                      </p>
                      <p className="text-xs text-slate-500">Failed Jobs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-600">
                        {(provider.stats.avgProcessingTimeMs / 1000).toFixed(1)}s
                      </p>
                      <p className="text-xs text-slate-500">Avg Processing Time</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Recent Observations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800">Recent Observations</h3>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {obsLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : observations.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No recent observations</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Provider</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Dataset</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Date</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Quality</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Cloud Cover</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {observations.map((obs: any) => (
                    <tr key={obs.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-700">{obs.provider}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{obs.dataset}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDateTime(obs.observationDate)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={obs.quality === 'PROCESSED' ? 'success' : obs.quality === 'ANALYZED' ? 'info' : 'neutral'}
                        >
                          {obs.quality}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {(obs.cloudCover * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={retryingId === obs.id}
                          leftIcon={retryingId === obs.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                        >
                          Retry
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
