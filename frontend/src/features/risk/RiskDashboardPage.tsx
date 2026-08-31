import { useState, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  TrendingUp,
  ChevronDown,
  RefreshCw,
  Loader2,
  AlertTriangle,
  DollarSign,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileText,
  Sparkles,
} from "lucide-react";
import { useRiskList, useRiskStats, useRecalculateAllRisk } from "@/hooks/useRisk";
import { useAnomalies } from "@/hooks/useAnomalies";
import { aiApi, type AIExplanation } from "@/services/ai-api";
import type { RiskLevel, RiskStats } from "@/services/risk-api";
import type { Anomaly } from "@/types";

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string; dot: string }> = {
  LOW:      { bg: "bg-emerald-500/10",  text: "text-emerald-400", border: "border-emerald-500/20",  dot: "bg-emerald-400" },
  MEDIUM:   { bg: "bg-amber-500/10",    text: "text-amber-400",   border: "border-amber-500/20",    dot: "bg-amber-400" },
  HIGH:     { bg: "bg-orange-500/10",   text: "text-orange-400",  border: "border-orange-500/20",   dot: "bg-orange-400" },
  CRITICAL: { bg: "bg-red-500/10",      text: "text-red-400",     border: "border-red-500/20",     dot: "bg-red-400" },
};

const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical",
};

const ALL_LEVELS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function ScoreBar({ score, max, color }: { score: number; max: number; color: string }) {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const c = RISK_COLORS[level];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {RISK_LABELS[level]}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-navy-800/50 border border-white/5 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <p className="text-slate-400 text-sm font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function BreakdownRow({ label, score, max, icon: Icon, colorClass }: {
  label: string;
  score: number;
  max: number;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={`w-4 h-4 shrink-0 ${colorClass}`} />
      <span className="text-sm text-slate-400 w-32 shrink-0">{label}</span>
      <ScoreBar score={score} max={max} color={colorClass.replace("text-", "bg-")} />
      <span className="text-xs font-mono text-slate-500 w-10 text-right shrink-0">{score}/{max}</span>
    </div>
  );
}

export default function RiskDashboardPage() {
  const navigate = useNavigate();
  const [filterLevel, setFilterLevel] = useState<RiskLevel | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"overallScore" | "riskLevel" | "updatedAt">("overallScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  // AI explanation state (Phase 11)
  const [aiExplanation, setAiExplanation] = useState<AIExplanation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [expandedAnomaly, setExpandedAnomaly] = useState<string | null>(null);
  const [anomaliesProjectId, setAnomaliesProjectId] = useState<string | null>(null);

  // React Query
  const risksQuery = useRiskList({
    riskLevel: filterLevel === "ALL" ? undefined : filterLevel,
    sortBy,
    sortOrder,
    page,
    limit: 20,
  });
  const statsQuery = useRiskStats();
  const recalculateMutation = useRecalculateAllRisk();
  const anomaliesQuery = useAnomalies(
    anomaliesProjectId ? { projectId: anomaliesProjectId, limit: 50 } : {}
  );

  const risks = risksQuery.data?.items ?? [];
  const totalPages = risksQuery.data?.totalPages ?? 1;
  const total = risksQuery.data?.total ?? 0;
  const stats: RiskStats | null = statsQuery.data ?? null;
  const loading = risksQuery.isLoading;
  const error = risksQuery.error?.message ?? null;
  const recalculating = recalculateMutation.isPending;
  const anomalies: Anomaly[] = anomaliesQuery.data?.items ?? [];
  const anomaliesLoading = anomaliesQuery.isFetching;

  const loadAnomalies = useCallback((projectId: string) => {
    setAnomaliesProjectId(projectId);
  }, []);

  const generateAIExplanation = useCallback(
    async (anomaly: Anomaly) => {
      setAiLoading(true);
      setAiError(null);
      try {
        const result = await aiApi.explainAnomaly({
          title: anomaly.title,
          description: anomaly.description,
          category: anomaly.category,
          severity: anomaly.severity,
          riskScore: anomaly.riskScore,
          ruleCode: anomaly.ruleCode ?? undefined,
          evidence: anomaly.evidence ?? undefined,
        });
        setAiExplanation(result);
      } catch (err: any) {
        setAiError(err?.message ?? "Failed to generate AI explanation");
      } finally {
        setAiLoading(false);
      }
    },
    []
  );

  const handleRecalculate = async () => {
    if (recalculating) return;
    try {
      await recalculateMutation.mutateAsync();
    } catch { /* silent */ }
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortOrder(o => o === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-electric-400" />
            Risk Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Unified risk scores combining anomalies, financials, reports &amp; timelines
          </p>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          aria-label={recalculating ? "Recalculating risk scores" : "Recalculate all risk scores"}
          className="flex items-center gap-2 px-4 py-2 bg-electric-500/10 border border-electric-500/20 text-electric-400 rounded-lg text-sm font-medium hover:bg-electric-500/20 transition-colors disabled:opacity-50"
        >
          {recalculating ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="w-4 h-4" aria-hidden="true" />}
          {recalculating ? "Recalculating..." : "Recalculate All"}
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard icon={TrendingUp} label="Avg Score" value={stats.avgScore.toFixed(1)} sub="out of 100" color="bg-electric-500/20 text-electric-400" />
          <StatCard icon={ShieldAlert} label="Critical" value={stats.distribution.CRITICAL} sub="projects" color="bg-red-500/20 text-red-400" />
          <StatCard icon={AlertTriangle} label="High" value={stats.distribution.HIGH} sub="projects" color="bg-orange-500/20 text-orange-400" />
          <StatCard icon={TrendingUp} label="Medium" value={stats.distribution.MEDIUM} sub="projects" color="bg-amber-500/20 text-amber-400" />
          <StatCard icon={ShieldAlert} label="Low" value={stats.distribution.LOW} sub="projects" color="bg-emerald-500/20 text-emerald-400" />
          <StatCard icon={FileText} label="Total" value={stats.totalProjects} sub="projects scored" color="bg-slate-500/20 text-slate-400" />
        </div>
      )}

      {/* Risk Distribution Bar */}
      {stats && (
        <div className="bg-navy-800/50 border border-white/5 rounded-xl p-5">
          <p className="text-sm font-medium text-slate-300 mb-3">Risk Distribution</p>
          <div
            className="flex h-6 rounded-full overflow-hidden gap-0.5"
            role="img"
            aria-label={`Risk distribution: ${stats.distribution.CRITICAL} critical, ${stats.distribution.HIGH} high, ${stats.distribution.MEDIUM} medium, ${stats.distribution.LOW} low out of ${stats.totalProjects} total projects`}
          >
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as RiskLevel[]).map((level) => {
              const count = stats.distribution[level];
              const pct = stats.totalProjects > 0 ? (count / stats.totalProjects) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={level}
                  className={`flex items-center justify-center text-xs font-bold text-white/80 transition-all ${RISK_COLORS[level].dot.replace("bg-", "bg-")}`}
                  style={{ width: `${pct}%` }}
                  title={`${level}: ${count} projects`}
                >
                  {pct > 10 ? count : ""}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 flex-wrap">
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as RiskLevel[]).map((level) => (
              <div key={level} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className={`w-2 h-2 rounded-full ${RISK_COLORS[level].dot}`} />
                {level}: {stats.distribution[level]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Table */}
      <div className="bg-navy-800/50 border border-white/5 rounded-xl overflow-hidden">
        {/* Filter bar */}
        <div className="flex items-center gap-3 p-4 border-b border-white/5 flex-wrap" role="group" aria-label="Filter by risk level">
          <span className="text-sm text-slate-400 font-medium">Filter:</span>
          <button
            onClick={() => { setFilterLevel("ALL"); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterLevel === "ALL"
                ? "bg-electric-500/20 text-electric-400 border border-electric-500/30"
                : "bg-navy-700 text-slate-400 border border-white/10 hover:bg-navy-600"
            }`}
          >
            All ({total})
          </button>
          {ALL_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => { setFilterLevel(level); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterLevel === level
                  ? `${RISK_COLORS[level].bg} ${RISK_COLORS[level].text} border ${RISK_COLORS[level].border}`
                  : "bg-navy-700 text-slate-400 border border-white/10 hover:bg-navy-600"
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-electric-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20" role="alert">
            <p className="text-red-400">{error}</p>
          </div>
        ) : risks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ShieldAlert className="w-10 h-10 text-slate-600" />
            <p className="text-slate-400">No risk data found</p>
            <button onClick={handleRecalculate} className="text-sm text-electric-400 hover:underline">
              Run risk calculation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Project risk scores — sortable by overall score, with district, status, level, and risk factors</caption>
              <thead>
                <tr className="border-b border-white/5">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">District</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Status</th>
                  <th
                    scope="col"
                    aria-sort={sortBy === "overallScore" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                    className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    <button
                      onClick={() => toggleSort("overallScore")}
                      className="flex items-center justify-end gap-1 w-full cursor-pointer hover:text-slate-300"
                      aria-label={`Sort by overall score, currently ${sortBy === "overallScore" ? (sortOrder === "asc" ? "ascending" : "descending") : "unsorted"}`}
                    >
                      Score <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th scope="col" className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Level</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Factors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {risks.map((risk) => (
                  <Fragment key={risk.id}>
                    <tr
                      className="hover:bg-white/3 transition-colors cursor-pointer"
                      onClick={() => navigate(`/projects/${risk.projectId}`)}
                    >
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-slate-200 leading-tight">{risk.project.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{risk.project.sector.replace(/_/g, " ")}</p>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className="text-sm text-slate-400">{risk.project.district}</p>
                        <p className="text-xs text-slate-600">{risk.project.state}</p>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-slate-400">{risk.project.status.replace(/_/g, " ")}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-lg font-bold ${RISK_COLORS[risk.riskLevel].text}`}>
                            {risk.overallScore}
                          </span>
                          <div className="w-20">
                            <ScoreBar
                              score={risk.overallScore}
                              max={100}
                              color={`bg-electric-500`}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <RiskBadge level={risk.riskLevel} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (expandedRisk === risk.id) {
                              setExpandedRisk(null);
                              setAiExplanation(null);
                              setExpandedAnomaly(null);
                            } else {
                              setExpandedRisk(risk.id);
                              setAiExplanation(null);
                              setExpandedAnomaly(null);
                              loadAnomalies(risk.projectId);
                            }
                          }}
                          className="text-xs text-electric-400 hover:text-electric-300 flex items-center gap-1 mx-auto"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedRisk === risk.id ? "rotate-180" : ""}`} />
                          {risk.factors.length}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded breakdown row */}
                    {expandedRisk === risk.id && (
                      <tr className="bg-navy-900/50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Score breakdown */}
                            <div className="space-y-3">
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Score Breakdown</p>
                              <BreakdownRow label="Anomalies" score={risk.anomalyScore} max={40} icon={AlertTriangle} colorClass="text-red-400" />
                              <BreakdownRow label="Financial" score={risk.financialScore} max={25} icon={DollarSign} colorClass="text-amber-400" />
                              <BreakdownRow label="Reports" score={risk.reportScore} max={20} icon={Users} colorClass="text-blue-400" />
                              <BreakdownRow label="Timeline" score={risk.timelineScore} max={15} icon={Clock} colorClass="text-purple-400" />
                              <div className="flex items-center gap-3 pt-1 border-t border-white/5">
                                <TrendingUp className="w-4 h-4 text-electric-400" />
                                <span className="text-sm text-slate-400 w-32">Total</span>
                                <ScoreBar score={risk.overallScore} max={100} color="bg-electric-500" />
                                <span className="text-xs font-mono text-electric-400 w-10 text-right">{risk.overallScore}/100</span>
                              </div>
                            </div>

                            {/* Risk factors */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Risk Factors</p>
                              {risk.factors.length === 0 ? (
                                <p className="text-sm text-slate-500 italic">No risk factors detected</p>
                              ) : (
                                risk.factors.map((f, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <span className={`text-xs font-bold mt-0.5 ${f.points > 0 ? "text-red-400" : "text-slate-500"}`}>
                                      +{f.points}
                                    </span>
                                    <div>
                                      <p className="text-sm text-slate-300">{f.label}</p>
                                      <p className="text-xs text-slate-500">{f.detail}</p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Anomalies + AI Analysis (Phase 11) */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Anomalies &amp; AI</p>
                              {anomaliesLoading ? (
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <div className="w-3.5 h-3.5 border border-slate-500/30 border-t-slate-400 rounded-full animate-spin" />
                                  Loading...
                                </div>
                              ) : anomalies.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">No anomalies detected</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {anomalies.slice(0, 4).map((a) => (
                                    <div key={a.id} className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (expandedAnomaly === a.id) {
                                              setExpandedAnomaly(null);
                                              setAiExplanation(null);
                                            } else {
                                              setExpandedAnomaly(a.id);
                                              setAiExplanation(null);
                                              if (!a.aiExplanation) {
                                                generateAIExplanation(a);
                                              } else {
                                                try {
                                                  setAiExplanation(JSON.parse(a.aiExplanation));
                                                } catch { /* ignore */ }
                                              }
                                            }
                                          }}
                                          className={`text-[11px] font-medium transition-colors flex-1 text-left truncate ${
                                            expandedAnomaly === a.id
                                              ? "text-electric-400"
                                              : "text-slate-300 hover:text-slate-100"
                                          }`}
                                        >
                                          {a.title.length > 40 ? a.title.slice(0, 40) + "…" : a.title}
                                        </button>
                                        {a.aiExplanation && (
                                          <span title="AI explanation available"><Sparkles className="w-3 h-3 text-saffron-400 shrink-0" /></span>
                                        )}
                                      </div>
                                      {expandedAnomaly === a.id && (
                                        <div className="ml-1 pl-2 border-l border-white/10 space-y-1.5">
                                          {aiLoading ? (
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                              <div className="w-3 h-3 border border-slate-500/30 border-t-saffron-400 rounded-full animate-spin" />
                                              Generating AI explanation...
                                            </div>
                                          ) : aiError ? (
                                            <p className="text-[10px] text-red-400">{aiError}</p>
                                          ) : aiExplanation ? (
                                            <div className="space-y-1.5">
                                              <p className="text-[10px] text-slate-300 leading-relaxed">{aiExplanation.explanation}</p>
                                              {aiExplanation.recommendation && (
                                                <p className="text-[10px] text-saffron-400/80 italic">→ {aiExplanation.recommendation}</p>
                                              )}
                                            </div>
                                          ) : null}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {anomalies.length > 4 && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); navigate(`/anomalies?projectId=${risk.projectId}`); }}
                                      className="text-[10px] text-electric-400 hover:text-electric-300"
                                    >
                                      +{anomalies.length - 4} more →
                                    </button>
                                  )}
                                </div>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/projects/${risk.projectId}`); }}
                                className="text-[10px] text-electric-400 hover:text-electric-300 mt-1"
                              >
                                View full project →
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages} — {total} projects
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-400 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="text-sm text-slate-400 font-mono">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-400 transition-colors"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
