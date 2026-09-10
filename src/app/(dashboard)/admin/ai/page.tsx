'use client';

/**
 * M14 Admin: AI Control Center
 * AI providers, model status, usage statistics, analysis job status
 */

import { useState } from 'react';
import {
  Brain, RefreshCw, CheckCircle, AlertTriangle, XCircle,
  Activity, Clock, Zap, BarChart3, Server, Cpu,
  Eye, TrendingUp, AlertCircle, X,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn, formatDateTime } from '@/lib/utils';
import { useAIProviders, useAIProviderStats } from '@/hooks/useAdmin';

const PROVIDER_STATUS_COLORS = {
  ACTIVE: 'text-emerald-500',
  DEGRADED: 'text-amber-500',
  DOWN: 'text-red-500',
  UNKNOWN: 'text-slate-400',
};

const PROVIDER_STATUS_BG = {
  ACTIVE: 'bg-emerald-50',
  DEGRADED: 'bg-amber-50',
  DOWN: 'bg-red-50',
  UNKNOWN: 'bg-slate-50',
};

const MODEL_STATUS_COLORS = {
  ACTIVE: 'success',
  DEGRADED: 'warning',
  DOWN: 'danger',
  UNKNOWN: 'neutral',
};

export default function AdminAIPage() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: providers, isLoading: providersLoading } = useAIProviders();
  const { data: stats, isLoading: statsLoading } = useAIProviderStats();

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Brain className="h-4 w-4" />
            <span>System Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">AI Control Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor AI providers, model status, and usage statistics
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

      {/* Overview Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardBody className="p-4 animate-pulse">
                <div className="h-8 bg-slate-100 rounded mb-2" />
                <div className="h-4 bg-slate-50 rounded w-2/3" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardBody className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{stats.totalRequests.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Total Requests</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {stats.totalRequests > 0
                  ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
                  : '100'}%
              </p>
              <p className="text-xs text-slate-500 mt-1">Success Rate</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.failedRequests.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Failed Requests</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.avgLatencyMs.toFixed(0)}ms</p>
              <p className="text-xs text-slate-500 mt-1">Avg Latency</p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* AI Providers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800">AI Providers</h3>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {providersLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : !providers || providers.length === 0 ? (
            <div className="p-12 text-center">
              <Brain className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No AI providers configured</p>
              <p className="text-slate-400 text-sm mt-1">
                AI services are not available. Check system configuration.
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
                        <Brain className={cn(
                          'h-6 w-6',
                          PROVIDER_STATUS_COLORS[provider.status] ?? PROVIDER_STATUS_COLORS.UNKNOWN
                        )} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{provider.name}</h4>
                        <Badge
                          variant={
                            provider.status === 'ACTIVE' ? 'success' :
                            provider.status === 'DEGRADED' ? 'warning' : 'danger'
                          }
                        >
                          {provider.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-slate-500">Last 24h</p>
                      <p className="font-medium text-slate-900">
                        {provider.usageStats.last24h.requests.toLocaleString()} requests
                      </p>
                      <p className="text-xs text-slate-500">
                        {provider.usageStats.last24h.avgLatencyMs.toFixed(0)}ms avg latency
                      </p>
                    </div>
                  </div>

                  {/* Models */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Models ({provider.models.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {provider.models.map((model) => (
                        <div
                          key={model.id}
                          className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">{model.name}</span>
                            <Badge
                              variant={(MODEL_STATUS_COLORS[model.status as keyof typeof MODEL_STATUS_COLORS] ?? 'neutral') as any}
                              className="text-xs"
                            >
                              {model.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{model.failureCount} failures</span>
                            <span>
                              {model.latencyMs ? `${model.latencyMs.toFixed(0)}ms` : 'N/A'}
                            </span>
                          </div>
                          {model.lastUsed && (
                            <p className="text-xs text-slate-400 mt-1">
                              Last used: {formatDateTime(model.lastUsed)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">
                        {provider.usageStats.totalRequests.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">Total Requests</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-emerald-600">
                        {provider.usageStats.successfulRequests.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">Successful</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-600">
                        {provider.usageStats.failedRequests.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">Failed</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Per-Provider Stats Chart */}
      {stats?.byProvider && Object.keys(stats.byProvider).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-800">Usage by Provider</h3>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {Object.entries(stats.byProvider).map(([providerName, providerStats]) => (
                <div key={providerName} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{providerName}</span>
                    <span className="text-slate-500">
                      {providerStats.requests.toLocaleString()} requests |{' '}
                      {providerStats.failures.toLocaleString()} failures |{' '}
                      {providerStats.avgLatency.toFixed(0)}ms avg
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-vojas-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (providerStats.requests / Math.max(...Object.values(stats.byProvider).map((s) => s.requests), 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
