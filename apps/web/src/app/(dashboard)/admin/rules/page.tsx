'use client';

/**
 * M14 Admin: Rule Management
 * Risk thresholds, sector rules, indicator configurations, audit trail
 */

import { useState } from 'react';
import {
  Settings, Search, RefreshCw, AlertTriangle, Eye, Clock,
  Play, Pause, History, AlertCircle, X, CheckCircle, Loader2,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn, formatDateTime } from '@/lib/utils';
import { useAdminRules, useUpdateRule, useRuleAuditTrail, useRuleVersions } from '@/hooks/useAdmin';

const CATEGORY_COLORS: Record<string, string> = {
  progress_satellite_mismatch: 'bg-purple-50 text-purple-700 border-purple-200',
  cost_anomaly: 'bg-amber-50 text-amber-700 border-amber-200',
  duplicate_project: 'bg-red-50 text-red-700 border-red-200',
  timeline: 'bg-blue-50 text-blue-700 border-blue-200',
  financial: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  geographic: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  compliance: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const SEVERITY_COLORS = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
};

export default function AdminRulesPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: rules, isLoading, refetch } = useAdminRules({
    category: categoryFilter || undefined,
    status: statusFilter || undefined,
  });
  const { data: auditTrail } = useRuleAuditTrail(selectedRule?.id ?? '');
  const { data: versions } = useRuleVersions(selectedRule?.id ?? '');
  const updateMutation = useUpdateRule();

  const filteredRules = rules?.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const handleToggleRule = async (rule: any) => {
    try {
      await updateMutation.mutateAsync({
        id: rule.id,
        data: { enabled: !rule.enabled },
      });
    } catch {
      setError('Failed to toggle rule');
    }
  };

  const handleViewDetails = (rule: any) => {
    setSelectedRule(rule);
    setShowDetailModal(true);
  };

  const handleViewAudit = (rule: any) => {
    setSelectedRule(rule);
    setShowAuditModal(true);
  };

  const handleViewVersions = (rule: any) => {
    setSelectedRule(rule);
    setShowVersionModal(true);
  };

  const categories = [...new Set(rules?.map((r) => r.category) ?? [])];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Settings className="h-4 w-4" />
            <span>System Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Rule Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure risk thresholds, sector rules, and analysis parameters
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
            placeholder="Search rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="ENABLED">Enabled</option>
          <option value="DISABLED">Disabled</option>
        </select>
        <span className="text-xs text-slate-500 ml-auto">
          {filteredRules.length} rules
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

      {/* Rules Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="p-12 text-center">
              <Settings className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No rules found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Rule Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Version</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Severity</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Matches</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Last Run</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map((rule) => (
                    <tr key={rule.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900">{rule.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex px-2 py-0.5 rounded-full text-xs font-medium border',
                          CATEGORY_COLORS[rule.category] ?? 'bg-slate-50 text-slate-700 border-slate-200'
                        )}>
                          {rule.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600">{rule.version}</td>
                      <td className="px-4 py-3">
                        <Badge variant={(SEVERITY_COLORS[rule.severityModifier as keyof typeof SEVERITY_COLORS] ?? 'neutral') as any}>
                          {rule.severityModifier}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{rule.matchCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {rule.lastRun ? formatDateTime(rule.lastRun) : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={rule.enabled ? 'success' : 'neutral'}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleRule(rule)}
                            disabled={updateMutation.isPending}
                            leftIcon={rule.enabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          >
                            {rule.enabled ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewAudit(rule)}
                            leftIcon={<History className="h-3 w-3" />}
                          >
                            Audit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewVersions(rule)}
                            leftIcon={<Clock className="h-3 w-3" />}
                          >
                            Versions
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(rule)}
                            leftIcon={<Eye className="h-3 w-3" />}
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Rule Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedRule(null);
        }}
        title="Rule Details"
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
        }
      >
        {selectedRule && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{selectedRule.name}</h3>
              <Badge variant={selectedRule.enabled ? 'success' : 'neutral'}>
                {selectedRule.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Category</p>
                <span className={cn(
                  'inline-flex px-2 py-0.5 rounded-full text-xs font-medium border',
                  CATEGORY_COLORS[selectedRule.category] ?? 'bg-slate-50 text-slate-700 border-slate-200'
                )}>
                  {selectedRule.category.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <p className="text-slate-500">Version</p>
                <p className="font-medium text-slate-900">{selectedRule.version}</p>
              </div>
              <div>
                <p className="text-slate-500">Severity Modifier</p>
                <Badge variant={(SEVERITY_COLORS[selectedRule.severityModifier as keyof typeof SEVERITY_COLORS] ?? 'neutral') as any}>
                  +{selectedRule.severityModifier === 'LOW' ? '0' : selectedRule.severityModifier === 'MEDIUM' ? '5' : selectedRule.severityModifier === 'HIGH' ? '15' : '30'}
                </Badge>
              </div>
              <div>
                <p className="text-slate-500">Confidence Modifier</p>
                <p className="font-medium text-slate-900">{selectedRule.confidenceModifier}</p>
              </div>
              <div>
                <p className="text-slate-500">Match Count</p>
                <p className="font-medium text-slate-900">{selectedRule.matchCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500">Last Run</p>
                <p className="font-medium text-slate-900">
                  {selectedRule.lastRun ? formatDateTime(selectedRule.lastRun) : 'Never'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Rule Audit Trail Modal */}
      <Modal
        isOpen={showAuditModal}
        onClose={() => {
          setShowAuditModal(false);
          setSelectedRule(null);
        }}
        title={`Audit Trail: ${selectedRule?.name}`}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setShowAuditModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          {!auditTrail || auditTrail.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No audit events for this rule</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditTrail.map((event) => (
                <div key={event.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="info">Update</Badge>
                      <span className="text-sm text-slate-700">by <strong>{event.actorName}</strong></span>
                    </div>
                    <span className="text-xs text-slate-500">{formatDateTime(event.timestamp)}</span>
                  </div>
                  {event.previousValue && event.newValue && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Previous</p>
                        <pre className="text-xs bg-white p-2 rounded border border-slate-200 overflow-x-auto max-h-32">
                          {JSON.stringify(event.previousValue, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">New</p>
                        <pre className="text-xs bg-white p-2 rounded border border-slate-200 overflow-x-auto max-h-32">
                          {JSON.stringify(event.newValue, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Rule Versions Modal */}
      <Modal
        isOpen={showVersionModal}
        onClose={() => {
          setShowVersionModal(false);
          setSelectedRule(null);
        }}
        title={`Version History: ${selectedRule?.name}`}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setShowVersionModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          {!versions || versions.length === 0 ? (
            <div className="p-8 text-center">
              <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No version history available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div key={version.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={version.isActive ? 'success' : 'neutral'}>
                        v{version.version}
                      </Badge>
                      {version.isActive && (
                        <span className="text-xs text-emerald-600">Current</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{formatDateTime(version.effectiveAt)}</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Severity: +{version.severityModifier} | Confidence: {version.confidenceModifier}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
