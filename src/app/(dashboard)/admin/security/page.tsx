'use client';

/**
 * M14 Admin: Security Dashboard
 * Security events, threat detection, access patterns
 */

import { useState } from 'react';
import {
  Shield, Search, RefreshCw, Download, Filter, X, AlertTriangle,
  Lock, Clock, User, Globe, CheckCircle, XCircle, AlertCircle,
  ShieldCheck, ShieldAlert,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn, formatDateTime } from '@/lib/utils';
import { useSecurityEvents } from '@/hooks/useAdmin';

const SEVERITY_COLORS = {
  LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  HIGH: 'bg-red-100 text-red-700 border-red-200',
  CRITICAL: 'bg-red-600 text-white border-red-700',
};

const RESULT_COLORS = {
  SUCCESS: 'text-emerald-500',
  FAILURE: 'text-red-500',
  BLOCKED: 'text-amber-500',
};

export default function AdminSecurityPage() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useSecurityEvents({
    page,
    limit: 50,
    severity: severityFilter || undefined,
  });

  const events = data?.events ?? [];
  const pagination = data?.pagination;
  const summary = data?.summary;

  const filteredEvents = events.filter((event) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        event.actorEmail?.toLowerCase().includes(searchLower) ||
        event.ipAddress?.includes(searchLower) ||
        event.action.toLowerCase().includes(searchLower) ||
        event.resource.toLowerCase().includes(searchLower) ||
        event.type.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Shield className="h-4 w-4" />
            <span>System Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Security Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor security events, threats, and access patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Critical', value: summary.bySeverity.CRITICAL ?? 0, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'High', value: summary.bySeverity.HIGH ?? 0, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Medium', value: summary.bySeverity.MEDIUM ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Low', value: summary.bySeverity.LOW ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Success', value: summary.byResult.SUCCESS ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Failed', value: summary.byResult.FAILURE ?? 0, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Blocked', value: summary.byResult.BLOCKED ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(({ label, value, color, bg }) => (
            <Card key={label}>
              <CardBody className="p-3 text-center">
                <p className={cn('text-xl font-bold', color)}>{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Threat Indicators */}
      {summary && (summary.bySeverity.CRITICAL > 0 || summary.bySeverity.HIGH > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900">
                  Security Alert: {summary.bySeverity.CRITICAL + summary.bySeverity.HIGH} High/Critical Events
                </h3>
                <p className="text-sm text-red-700 mt-0.5">
                  Review the security events below for potential threats
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search by email, IP, or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
          />
        </div>
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          size="sm"
          leftIcon={<Filter className="h-4 w-4" />}
          onClick={() => setShowFilters((s) => !s)}
        >
          Filters
        </Button>
        {severityFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSeverityFilter('')}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
        <span className="text-xs text-slate-500 ml-auto">
          {filteredEvents.length} events
        </span>
      </div>

      {showFilters && (
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white rounded-xl border border-slate-200 -mt-2">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Severity</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </CardBody>
      )}

      {/* Security Events */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="h-12 w-12 text-emerald-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No security events</p>
              <p className="text-slate-400 text-sm mt-1">
                {search || severityFilter
                  ? 'Try adjusting your filters'
                  : 'All systems operating normally'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Type</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Severity</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Actor</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Action</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Resource</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Result</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">IP Address</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => {
                    const severityColor = SEVERITY_COLORS[event.severity] ?? SEVERITY_COLORS.LOW;
                    return (
                      <tr key={event.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {event.severity === 'CRITICAL' || event.severity === 'HIGH' ? (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Shield className="h-4 w-4 text-slate-400" />
                            )}
                            <span className="text-sm font-medium text-slate-700">{event.type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex px-2 py-0.5 rounded-full text-xs font-medium border',
                            severityColor
                          )}>
                            {event.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-600">
                              {event.actorEmail || event.actorId?.slice(0, 8) || 'System'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{event.action}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{event.resource}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {event.result === 'SUCCESS' && (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            )}
                            {event.result === 'FAILURE' && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            {event.result === 'BLOCKED' && (
                              <Lock className="h-4 w-4 text-amber-500" />
                            )}
                            <span className={cn(
                              'text-sm font-medium',
                              RESULT_COLORS[event.result]
                            )}>
                              {event.result}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Globe className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-mono text-slate-600">
                              {event.ipAddress || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDateTime(event.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
