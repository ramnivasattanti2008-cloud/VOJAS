'use client';

import type { SatelliteAnalysis } from '@vojas/api-client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Brain, AlertTriangle, CheckCircle2, Info, TrendingUp, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { cn, formatDate } from '@/lib/utils';

interface AIFindingsPanelProps {
  analyses: SatelliteAnalysis[];
  comparison?: {
    status: string;
    reportedProgress: number;
    evidence: string;
    limitations: string;
  } | null;
}

const CHANGE_LABELS: Record<string, string> = {
  NO_OBSERVABLE_CHANGE: 'No Observable Change',
  LOW_OBSERVABLE_CHANGE: 'Low Observable Change',
  MODERATE_OBSERVABLE_CHANGE: 'Moderate Observable Change',
  HIGH_OBSERVABLE_CHANGE: 'High Observable Change',
};

const STATUS_LABELS: Record<string, { icon: typeof CheckCircle2; label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  CONSISTENT: { icon: CheckCircle2, label: 'Consistent', variant: 'success' },
  POSSIBLY_INCONSISTENT: { icon: AlertTriangle, label: 'Possible Discrepancy', variant: 'warning' },
  INCONCLUSIVE: { icon: Info, label: 'Inconclusive', variant: 'info' },
  INSUFFICIENT_DATA: { icon: Info, label: 'Insufficient Data', variant: 'neutral' },
};

const ANALYSIS_ICONS: Record<string, typeof Brain> = {
  WEEK_OVER_WEEK: Brain,
  BASELINE_VS_LATEST: TrendingUp,
  QUARTERLY: Brain,
  MULTI_DATE: Brain,
};

export function AIFindingsPanel({ analyses, comparison }: AIFindingsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!analyses.length && !comparison) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <Brain className="h-8 w-8 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">No AI findings yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            AI analysis runs when at least two satellite observations are available for a project.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall assessment */}
      {comparison && (() => {
        const cfg = STATUS_LABELS[comparison.status] ?? STATUS_LABELS.INSUFFICIENT_DATA;
        const CfgIcon = cfg.icon;
        return (
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  cfg.variant === 'success' ? 'bg-emerald-50 text-emerald-600'
                    : cfg.variant === 'warning' ? 'bg-amber-50 text-amber-600'
                    : cfg.variant === 'info' ? 'bg-blue-50 text-blue-600'
                    : 'bg-slate-100 text-slate-500',
                )}>
                  <CfgIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-slate-900">AI Assessment</h3>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{comparison.evidence}</p>
                </div>
              </div>

              {/* Reported progress */}
              <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
                <div className="flex-1">
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Reported Progress</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900">{comparison.reportedProgress}</span>
                    <span className="text-slate-500 text-lg font-bold">%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-slate-400 rounded-full"
                      style={{ width: `${Math.min(100, comparison.reportedProgress)}%` }}
                    />
                  </div>
                </div>
                <div className="text-slate-300 text-2xl">→</div>
                <div className="flex-1">
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Observable Change</div>
                  <div className="text-base font-bold text-slate-800">
                    {CHANGE_LABELS[comparison.status] ?? 'Insufficient Data'}
                  </div>
                </div>
              </div>

              {/* Limitations */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-500 leading-relaxed">{comparison.limitations}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        );
      })()}

      {/* Individual analysis cards */}
      {analyses.length > 0 && (
        <>
          <div className="text-sm font-semibold text-slate-700">
            Change Analyses ({analyses.length})
          </div>
          <div className="space-y-3">
            {analyses.map((analysis) => {
              const isExpanded = expandedId === analysis.id;
              const Icon = ANALYSIS_ICONS[analysis.analysisType] ?? Brain;
              const changeLabel = CHANGE_LABELS[analysis.changeClassification] ?? analysis.changeClassification;

              return (
                <Card key={analysis.id}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setExpandedId(isExpanded ? null : analysis.id)}
                    aria-expanded={isExpanded}
                  >
                    <CardBody className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                            analysis.changeClassification === 'HIGH_OBSERVABLE_CHANGE' || analysis.changeClassification === 'MODERATE_OBSERVABLE_CHANGE'
                              ? 'bg-amber-50 text-amber-600'
                              : analysis.changeClassification === 'LOW_OBSERVABLE_CHANGE'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-slate-100 text-slate-500',
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">{changeLabel}</span>
                              <Badge
                                variant={
                                  analysis.confidence === 'HIGH' ? 'success'
                                    : analysis.confidence === 'MEDIUM' ? 'warning'
                                    : 'neutral'
                                }
                              >
                                {analysis.confidence} confidence
                              </Badge>
                              <Badge variant="neutral">{analysis.analysisType.replace(/_/g, ' ')}</Badge>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {analysis.baselineDate && `Baseline: ${formatDate(analysis.baselineDate)}`}
                              {analysis.baselineDate && analysis.comparisonDate && ' → '}
                              {analysis.comparisonDate && `Latest: ${formatDate(analysis.comparisonDate)}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-slate-400">
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />}
                        </div>
                      </div>
                    </CardBody>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                      {/* Methodology */}
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Methodology</div>
                        <p className="text-xs text-slate-700 leading-relaxed">{analysis.methodology}</p>
                      </div>

                      {/* Evidence */}
                      {analysis.evidence && Object.keys(analysis.evidence).length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Evidence</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(analysis.evidence)
                              .filter(([, v]) => v != null)
                              .map(([k, v]) => (
                                <div key={k} className="flex gap-2 bg-slate-50 rounded-lg px-3 py-2">
                                  <span className="text-slate-500 font-mono shrink-0">{k}:</span>
                                  <span className="text-slate-800 font-medium truncate">
                                    {typeof v === 'number' ? v.toFixed(4) : String(v)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Limitations */}
                      {analysis.limitations && (
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Limitations</div>
                          <p className="text-xs text-slate-600 leading-relaxed">{analysis.limitations}</p>
                        </div>
                      )}

                      {/* Source link */}
                      {analysis.analysisDate && (
                        <div className="text-xs text-slate-400">
                          Analysis computed {formatDate(analysis.analysisDate)}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
