/**
 * RiskDashboardPage — VOJAS 2.0
 *
 * IBM Carbon–inspired light theme. Professional data-management layout.
 * No glassmorphism, no gradients, no glow effects, no decorative animations.
 * All data sourced from real hooks (useRiskList, useRiskStats, useAnomalies, aiApi).
 */

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
  type LucideIcon,
} from "lucide-react";
import { useRiskList, useRiskStats, useRecalculateAllRisk } from "@/hooks/useRisk";
import { useAnomalies } from "@/hooks/useAnomalies";
import { aiApi, type AIExplanation } from "@/services/ai-api";
import type { RiskLevel, RiskStats } from "@/services/risk-api";
import type { Anomaly } from "@/types";
import EmptyState from "@/components/ui/Empty";
import { cn } from "@/lib/utils";

// ── Risk level semantic tokens (IBM Carbon light) ──────────────────────────

const RISK_TOKENS: Record<
  RiskLevel,
  { bg: string; text: string; border: string; dot: string; bar: string; accent: string }
> = {
  LOW: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    dot: "bg-green-500",
    bar: "bg-green-500",
    accent: "green",
  },
  MEDIUM: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    accent: "amber",
  },
  HIGH: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    dot: "bg-orange-500",
    bar: "bg-orange-500",
    accent: "amber",
  },
  CRITICAL: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
    bar: "bg-red-500",
    accent: "red",
  },
};

const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const ALL_LEVELS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// ── Reusable UI primitives ─────────────────────────────────────────────────

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900 leading-tight">{title}</h2>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "blue",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  accent?: "blue" | "green" | "amber" | "red" | "slate";
}) {
  const iconBg: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-gray-100 text-gray-600",
  };
  const bar: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    slate: "bg-gray-400",
  };

  return (
    <div className="relative bg-white border border-gray-200 rounded-md p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200 h-full">
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 rounded-t-md", bar[accent])} aria-hidden />
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-8 h-8 rounded flex items-center justify-center", iconBg[accent])}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-gray-900 tabular-nums leading-none">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
      <p className="text-sm text-gray-700 font-medium mt-1.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function ScoreBar({ score, max, color }: { score: number; max: number; color: string }) {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full", color)}
        style={{ width: `${pct}%` }}
        aria-hidden
      />
    </div>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const t = RISK_TOKENS[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
        t.bg,
        t.text,
        t.border
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", t.dot)} />
      {RISK_LABELS[level]}
    </span>
  );
}

function BreakdownRow({
  label,
  score,
  max,
  icon: Icon,
  colorClass,
}: {
  label: string;
  score: number;
  max: number;
  icon: LucideIcon;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={cn("w-4 h-4 shrink-0", colorClass)} />
      <span className="text-sm text-gray-600 w-32 shrink-0">{label}</span>
      <ScoreBar score={score} max={max} color={colorClass.replace("text-", "bg-")} />
      <span className="text-xs font-mono text-gray-500 w-10 text-right shrink-0">{score}/{max}</span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function RiskDashboardPage() {
  const navigate = useNavigate();
  const [filterLevel, setFilterLevel] = useState<RiskLevel | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"overallScore" | "riskLevel" | "updatedAt">("overallScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  const [aiExplanation, setAiExplanation] = useState<AIExplanation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [expandedAnomaly, setExpandedAnomaly] = useState<string | null>(null);
  const [anomaliesProjectId, setAnomaliesProjectId] = useState<string | null>(null);

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

  const generateAIExplanation = useCallback(async (anomaly: Anomaly) => {
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
  }, []);

  const handleRecalculate = async () => {
    if (recalculating) return;
    try {
      await recalculateMutation.mutateAsync();
    } catch {
      /* silent */
    }
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* ── Page header (Carbon style — compact, no hero) ─────────────── */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <button
              onClick={() => navigate("/")}
              className="hover:text-blue-600 transition-colors"
            >
              Dashboard
            </button>
            <span>/</span>
            <span className="text-gray-700">Risk Dashboard</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 leading-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-600" />
            Risk Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Unified risk scores combining anomalies, financials, reports &amp; timelines
          </p>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          aria-label={recalculating ? "Recalculating risk scores" : "Recalculate all risk scores"}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium rounded-md border border-red-700 transition-colors"
        >
          {recalculating ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          )}
          {recalculating ? "Recalculating..." : "Recalculate All"}
        </button>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            icon={TrendingUp}
            label="Avg Score"
            value={stats.avgScore.toFixed(1)}
            sub="out of 100"
            accent="blue"
          />
          <KpiCard
            icon={ShieldAlert}
            label="Critical"
            value={stats.distribution.CRITICAL}
            sub="projects"
            accent="red"
          />
          <KpiCard
            icon={AlertTriangle}
            label="High"
            value={stats.distribution.HIGH}
            sub="projects"
            accent="amber"
          />
          <KpiCard
            icon={TrendingUp}
            label="Medium"
            value={stats.distribution.MEDIUM}
            sub="projects"
            accent="amber"
          />
          <KpiCard
            icon={ShieldAlert}
            label="Low"
            value={stats.distribution.LOW}
            sub="projects"
            accent="green"
          />
          <KpiCard
            icon={FileText}
            label="Total"
            value={stats.totalProjects}
            sub="projects scored"
            accent="slate"
          />
        </div>
      )}

      {/* ── Risk Distribution ──────────────────────────────────────── */}
      {stats && (
        <div className="bg-white border border-gray-200 rounded-md p-5">
          <SectionHeader
            title="Risk Distribution"
            description={`${stats.totalProjects.toLocaleString("en-IN")} projects scored`}
            action={
              <div className="flex items-center gap-3 text-[11px] text-gray-600">
                {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as RiskLevel[]).map((level) => (
                  <span key={level} className="flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full", RISK_TOKENS[level].dot)} />
                    <span>{level}:</span>
                    <span className={cn("font-semibold", RISK_TOKENS[level].text)}>
                      {stats.distribution[level]}
                    </span>
                  </span>
                ))}
              </div>
            }
          />
          <div
            className="flex h-7 rounded overflow-hidden border border-gray-200"
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
                  className={cn(
                    "flex items-center justify-center text-[11px] font-semibold text-white",
                    RISK_TOKENS[level].bar
                  )}
                  style={{ width: `${pct}%` }}
                  title={`${level}: ${count} projects`}
                >
                  {pct > 8 ? count : ""}
                </div>
              );
            })}
            {stats.totalProjects === 0 && (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-500 bg-gray-50">
                No scored projects
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Filters & Table ────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        {/* Filter bar (sticky) */}
        <div
          className="flex items-center gap-2 p-3 border-b border-gray-200 flex-wrap bg-white sticky top-0 z-10"
          role="group"
          aria-label="Filter by risk level"
        >
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider mr-1">
            Filter:
          </span>
          <button
            onClick={() => {
              setFilterLevel("ALL");
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
              filterLevel === "ALL"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
            )}
          >
            All ({total.toLocaleString("en-IN")})
          </button>
          {ALL_LEVELS.map((level) => {
            const t = RISK_TOKENS[level];
            const isActive = filterLevel === level;
            return (
              <button
                key={level}
                onClick={() => {
                  setFilterLevel(level);
                  setPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                  isActive
                    ? cn(t.bg, t.text, t.border)
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                )}
              >
                {RISK_LABELS[level]}
              </button>
            );
          })}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20" role="alert">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : risks.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No risk data found"
            description="Run a risk calculation to populate this dashboard."
            accent="red"
            action={
              <button
                onClick={handleRecalculate}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Run risk calculation
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">
                Project risk scores — sortable by overall score, with district, status, level, and risk
                factors
              </caption>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th
                    scope="col"
                    className="text-left px-4 py-3 text-[11px] font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    Project
                  </th>
                  <th
                    scope="col"
                    className="text-left px-4 py-3 text-[11px] font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell"
                  >
                    District
                  </th>
                  <th
                    scope="col"
                    className="text-left px-4 py-3 text-[11px] font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      sortBy === "overallScore"
                        ? sortOrder === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className="text-right px-4 py-3 text-[11px] font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    <button
                      onClick={() => toggleSort("overallScore")}
                      className="flex items-center justify-end gap-1 w-full cursor-pointer hover:text-gray-900"
                      aria-label={`Sort by overall score, currently ${
                        sortBy === "overallScore"
                          ? sortOrder === "asc"
                            ? "ascending"
                            : "descending"
                          : "unsorted"
                      }`}
                    >
                      Score <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="text-center px-4 py-3 text-[11px] font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    Level
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-[11px] font-semibold text-gray-600 uppercase tracking-wider text-center"
                  >
                    Factors
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {risks.map((risk) => (
                  <Fragment key={risk.id}>
                    <tr
                      className="hover:bg-gray-50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/projects/${risk.projectId}`)}
                    >
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 leading-tight">
                          {risk.project.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {risk.project.sector.replace(/_/g, " ")}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className="text-sm text-gray-700">{risk.project.district}</p>
                        <p className="text-xs text-gray-500">{risk.project.state}</p>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-gray-600">
                          {risk.project.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <span
                            className={cn(
                              "text-lg font-semibold tabular-nums",
                              RISK_TOKENS[risk.riskLevel].text
                            )}
                          >
                            {risk.overallScore}
                          </span>
                          <div className="w-20">
                            <ScoreBar
                              score={risk.overallScore}
                              max={100}
                              color={RISK_TOKENS[risk.riskLevel].bar}
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
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto transition-colors"
                        >
                          <ChevronDown
                            className={cn(
                              "w-3.5 h-3.5 transition-transform",
                              expandedRisk === risk.id ? "rotate-180" : ""
                            )}
                          />
                          {risk.factors.length}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded breakdown row */}
                    {expandedRisk === risk.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-5">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Score breakdown */}
                            <div className="space-y-3">
                              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Score Breakdown
                              </p>
                              <BreakdownRow
                                label="Anomalies"
                                score={risk.anomalyScore}
                                max={40}
                                icon={AlertTriangle}
                                colorClass="text-red-600"
                              />
                              <BreakdownRow
                                label="Financial"
                                score={risk.financialScore}
                                max={25}
                                icon={DollarSign}
                                colorClass="text-amber-600"
                              />
                              <BreakdownRow
                                label="Reports"
                                score={risk.reportScore}
                                max={20}
                                icon={Users}
                                colorClass="text-blue-600"
                              />
                              <BreakdownRow
                                label="Timeline"
                                score={risk.timelineScore}
                                max={15}
                                icon={Clock}
                                colorClass="text-purple-600"
                              />
                              <div className="flex items-center gap-3 pt-2 mt-1 border-t border-gray-200">
                                <TrendingUp className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-gray-700 w-32">Total</span>
                                <ScoreBar score={risk.overallScore} max={100} color="bg-blue-500" />
                                <span className="text-xs font-mono text-blue-700 w-10 text-right">
                                  {risk.overallScore}/100
                                </span>
                              </div>
                            </div>

                            {/* Risk factors */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Risk Factors
                              </p>
                              {risk.factors.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">No risk factors detected</p>
                              ) : (
                                <div className="space-y-2">
                                  {risk.factors.map((f, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                      <span
                                        className={cn(
                                          "text-xs font-semibold mt-0.5 tabular-nums",
                                          f.points > 0 ? "text-red-600" : "text-gray-500"
                                        )}
                                      >
                                        +{f.points}
                                      </span>
                                      <div>
                                        <p className="text-sm text-gray-800">{f.label}</p>
                                        <p className="text-xs text-gray-500">{f.detail}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Anomalies + AI Analysis */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Anomalies &amp; AI
                              </p>
                              {anomaliesLoading ? (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <div className="w-3.5 h-3.5 border border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                                  Loading...
                                </div>
                              ) : anomalies.length === 0 ? (
                                <p className="text-xs text-gray-500 italic">No anomalies detected</p>
                              ) : (
                                <div className="space-y-2">
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
                                                } catch {
                                                  /* ignore */
                                                }
                                              }
                                            }
                                          }}
                                          className={cn(
                                            "text-[11px] font-medium transition-colors flex-1 text-left truncate",
                                            expandedAnomaly === a.id
                                              ? "text-blue-600"
                                              : "text-gray-800 hover:text-blue-600"
                                          )}
                                        >
                                          {a.title.length > 40 ? a.title.slice(0, 40) + "…" : a.title}
                                        </button>
                                        {a.aiExplanation && (
                                          <span title="AI explanation available">
                                            <Sparkles
                                              className="w-3 h-3 text-amber-600 shrink-0"
                                              aria-hidden="true"
                                            />
                                          </span>
                                        )}
                                      </div>
                                      {expandedAnomaly === a.id && (
                                        <div className="ml-1 pl-2 border-l-2 border-gray-200 space-y-1.5">
                                          {aiLoading ? (
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                              <div className="w-3 h-3 border border-gray-300 border-t-amber-600 rounded-full animate-spin" />
                                              Generating AI explanation...
                                            </div>
                                          ) : aiError ? (
                                            <p className="text-[10px] text-red-600">{aiError}</p>
                                          ) : aiExplanation ? (
                                            <div className="space-y-1.5">
                                              <p className="text-[11px] text-gray-800 leading-relaxed">
                                                {aiExplanation.explanation}
                                              </p>
                                              {aiExplanation.recommendation && (
                                                <p className="text-[10px] text-amber-700 italic">
                                                  → {aiExplanation.recommendation}
                                                </p>
                                              )}
                                            </div>
                                          ) : null}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {anomalies.length > 4 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/anomalies?projectId=${risk.projectId}`);
                                      }}
                                      className="text-[10px] text-blue-600 hover:text-blue-800"
                                    >
                                      +{anomalies.length - 4} more →
                                    </button>
                                  )}
                                </div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/projects/${risk.projectId}`);
                                }}
                                className="text-[10px] text-blue-600 hover:text-blue-800 mt-1"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
            <p className="text-sm text-gray-600">
              Page <span className="font-medium text-gray-900">{page}</span> of{" "}
              <span className="font-medium text-gray-900">{totalPages}</span>
              <span className="text-gray-500">
                {" "}
                — {total.toLocaleString("en-IN")} projects
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
                className="p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200 text-gray-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="text-sm text-gray-700 font-mono tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
                className="p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200 text-gray-700 transition-colors"
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
