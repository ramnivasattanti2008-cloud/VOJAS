'use client';

/**
 * M14 Admin: Audit Log
 * Comprehensive audit trail, filtering, export functionality
 */

import { useState } from 'react';
import {
  FileText, Search, RefreshCw, Download, Filter, X,
  Clock, User, Activity, Shield, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn, formatDateTime } from '@/lib/utils';
import { useAdminAudit } from '@/hooks/useAdmin';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
  LOGIN: 'bg-purple-100 text-purple-700 border-purple-200',
  LOGOUT: 'bg-slate-100 text-slate-700 border-slate-200',
  AUTH_FAILED: 'bg-red-100 text-red-700 border-red-200',
  ESCALATE: 'bg-amber-100 text-amber-700 border-amber-200',
  RESOLVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const ENTITY_ICONS: Record<string, string> = {
  User: 'text-blue-500',
  Project: 'text-purple-500',
  Anomaly: 'text-red-500',
  Report: 'text-amber-500',
  Vendor: 'text-emerald-500',
  Role: 'text-indigo-500',
  Rule: 'text-pink-500',
  DataSource: 'text-cyan-500',
  Session: 'text-violet-500',
  AuditEvent: 'text-slate-500',
  Notification: 'text-teal-500',
  RiskFinding: 'text-orange-500',
};

export default function AdminAuditPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const { data: events, isLoading, refetch } = useAdminAudit({
    limit: 200,
    action: actionFilter || undefined,
    entityType: entityFilter || undefined,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const csv = generateCSV(events ?? []);
      downloadCSV(csv, `audit-log-${timestamp}.csv`);
    } catch {
      console.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const generateCSV = (data: any[]) => {
    const headers = ['Timestamp', 'Actor ID', 'Actor Type', 'Action', 'Entity Type', 'Entity ID', 'IP Address'];
    const rows = data.map((event) => [
      event.timestamp,
      event.actorId,
      event.actorType,
      event.action,
      event.entityType,
      event.entityId,
      event.ipAddress || '',
    ]);
    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleExpanded = (id: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredEvents = events?.filter((event) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        event.actorId.toLowerCase().includes(searchLower) ||
        event.entityId.toLowerCase().includes(searchLower) ||
        event.action.toLowerCase().includes(searchLower) ||
        event.entityType.toLowerCase().includes(searchLower)
      );
    }
    return true;
  }) ?? [];

  const actions = [...new Set(events?.map((e) => e.action) ?? [])];
  const entities = [...new Set(events?.map((e) => e.entityType) ?? [])];

  const actionCategory = (action: string): string => {
    if (action.includes('CREATE')) return 'CREATE';
    if (action.includes('UPDATE') || action.includes('CHANGE')) return 'UPDATE';
    if (action.includes('DELETE')) return 'DELETE';
    if (action.includes('LOGIN') || action.includes('AUTH')) return action.includes('FAILED') ? 'AUTH_FAILED' : 'LOGIN';
    if (action.includes('ESCALATE')) return 'ESCALATE';
    if (action.includes('RESOLVE') || action.includes('ACKNOWLEDGED')) return 'RESOLVE';
    return 'UPDATE';
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <FileText className="h-4 w-4" />
            <span>System Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">
            Comprehensive audit trail of all sensitive admin actions
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
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleExport}
            disabled={exporting || !filteredEvents.length}
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: events?.length ?? 0, color: 'text-slate-600' },
          { label: 'User Actions', value: events?.filter((e) => e.actorType === 'USER').length ?? 0, color: 'text-blue-600' },
          { label: 'System Actions', value: events?.filter((e) => e.actorType === 'SYSTEM').length ?? 0, color: 'text-purple-600' },
          { label: 'AI Actions', value: events?.filter((e) => e.actorType === 'AI').length ?? 0, color: 'text-cyan-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardBody className="p-4 text-center">
              <p className={cn('text-2xl font-bold', color)}>{value.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search by actor, entity, or action..."
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
        {(actionFilter || entityFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActionFilter('');
              setEntityFilter('');
            }}
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
            <label className="text-sm font-medium text-slate-700 block mb-1">Action</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All Actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Entity Type</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="">All Entities</option>
              {entities.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        </CardBody>
      )}

      {/* Audit Events */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No audit events found</p>
              <p className="text-slate-400 text-sm mt-1">
                {search || actionFilter || entityFilter
                  ? 'Try adjusting your filters'
                  : 'Audit events will appear here as actions occur'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEvents.map((event) => {
                const category = actionCategory(event.action);
                const colors = ACTION_COLORS[category] ?? ACTION_COLORS.UPDATE;
                const iconColor = ENTITY_ICONS[event.entityType] ?? 'text-slate-400';
                const isExpanded = expandedEvents.has(event.id);

                return (
                  <div key={event.id} className="hover:bg-slate-50">
                    <button
                      className="w-full text-left p-4 flex items-start gap-3"
                      onClick={() => event.metadata && toggleExpanded(event.id)}
                    >
                      <div className="mt-0.5">
                        {event.metadata ? (
                          isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            'inline-flex px-2 py-0.5 rounded-full text-xs font-medium border',
                            colors
                          )}>
                            {event.action}
                          </span>
                          <span className="text-sm font-medium text-slate-700">
                            {event.entityType}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {event.entityId.slice(0, 8)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {event.actorType === 'USER' ? (
                              <span className="font-mono">{event.actorId.slice(0, 8)}</span>
                            ) : (
                              event.actorType
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(event.timestamp)}
                          </span>
                          {event.ipAddress && (
                            <span className="font-mono">{event.ipAddress}</span>
                          )}
                        </div>
                      </div>
                    </button>
                    {event.metadata && isExpanded && (
                      <div className="px-8 pb-4">
                        <div className="p-3 bg-slate-100 rounded-lg">
                          <pre className="text-xs text-slate-700 whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
