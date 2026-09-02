/**
 * LawEnforcementPage — IBM Carbon light theme.
 * No glassmorphism, no gradients, no glow effects, no decorative animations.
 * All data from real hooks.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  useLawEnforcementStats,
  useLawEscalations,
  useAcknowledgeReferral,
  useAutoEscalate,
} from "@/hooks/useLawEnforcement";
import type { LawAuthority, LawEscalationSummary } from "@/services/lawEnforcementApi";
import { LoadingState, ErrorState } from "@/components/ui";
import PageHeader from "@/components/ui/PageHeader";
import { fadeUp, staggerContainer, EASE } from "@/components/ui/Animations";
import EmptyState from "@/components/ui/Empty";
import { cn } from "@/lib/utils";
import {
  Gavel,
  Building2,
  MapPin,
  Calendar,
  Hash,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Zap,
  Filter,
  TrendingUp,
  FileWarning,
  AlertTriangle,
} from "lucide-react";

// Light-theme severity styles
const SEV_STYLE: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  LOW:      { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", border: "border-slate-200" },
  MEDIUM:   { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-400", border: "border-yellow-200" },
  HIGH:     { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400", border: "border-orange-200" },
  CRITICAL: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400", border: "border-red-200" },
};

const AUTHORITY_ACCENT: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  ACB_OFFICE:    { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    icon: "ACB" },
  POLICE_OFFICE: { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   icon: "POL" },
  CVC:           { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", icon: "CVC" },
  LOKAYUKTA:     { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  icon: "LOK" },
  VIGILANCE:     { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  icon: "VIG" },
  COMPTROLLER:   { bg: "bg-cyan-50",   border: "border-cyan-200",   text: "text-cyan-700",   icon: "CAG" },
};

function formatCurrency(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// ── Kpi card (Carbon-style) ───────────────────────────────────────────────────

function Kpi({
  label,
  value,
  sub,
  Icon,
  accent = "blue",
}: {
  label: string;
  value: number | string;
  sub?: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent?: "blue" | "red" | "amber" | "green" | "slate";
}) {
  const iconBg: Record<string, string> = {
    blue:  "bg-blue-50 text-blue-600",
    red:   "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
    slate: "bg-gray-100 text-gray-600",
  };
  const barColor: Record<string, string> = {
    blue:  "bg-blue-500",
    red:   "bg-red-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
    slate: "bg-gray-400",
  };
  const bg  = iconBg[accent]  ?? iconBg.blue;
  const bar = barColor[accent] ?? barColor.blue;

  return (
    <div className="relative bg-white border border-gray-200 rounded-md p-4 hover:border-gray-300 transition-all duration-200 h-full">
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 rounded-t-md", bar)} aria-hidden />
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-8 h-8 rounded flex items-center justify-center", bg)}>
          <Icon aria-hidden="true" className="w-4 h-4" />
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LawEnforcementPage() {
  const navigate = useNavigate();
  const [authorityFilter, setAuthorityFilter] = useState<LawAuthority | "">("");
  const [page, setPage] = useState(1);
  const [autoEscalateMsg, setAutoEscalateMsg] = useState<string | null>(null);

  const statsQuery      = useLawEnforcementStats();
  const escalationsQuery = useLawEscalations({
    authority: (authorityFilter || undefined) as LawAuthority | undefined,
    page,
    limit: 20,
  });
  const ackMutation  = useAcknowledgeReferral();
  const autoEscalate = useAutoEscalate();

  const handleAcknowledge = async (referenceNo: string) => {
    try {
      await ackMutation.mutateAsync(referenceNo);
    } catch {
      // surfaced via mutation.error
    }
  };

  const handleAutoEscalate = async () => {
    setAutoEscalateMsg(null);
    try {
      const result = await autoEscalate.mutateAsync(85);
      setAutoEscalateMsg(
        `Auto-escalated ${result.autoEscalated} CRITICAL/HIGH anomaly${
          result.autoEscalated === 1 ? "" : "ies"
        } (risk ≥ ${result.minRiskScore}/100).`,
      );
      setTimeout(() => setAutoEscalateMsg(null), 5000);
    } catch (err) {
      setAutoEscalateMsg(
        err instanceof Error ? err.message : "Auto-escalation failed",
      );
    }
  };

  if (statsQuery.isLoading) return <LoadingState message="Loading law enforcement data..." />;
  if (statsQuery.error)
    return (
      <ErrorState
        message={statsQuery.error.message}
        onRetry={() => {
          statsQuery.refetch();
          escalationsQuery.refetch();
        }}
      />
    );

  const stats      = statsQuery.data;
  const escalations = escalationsQuery.data;
  const ackRate    = stats && stats.total > 0
    ? Math.round((stats.acknowledged / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Law Enforcement"
        subtitle="Anomalies escalated to ACB, Police, CVC, Lokayukta, Vigilance & CAG"
        icon={Gavel}
        actions={
          <button
            onClick={handleAutoEscalate}
            disabled={autoEscalate.isPending}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold rounded transition-colors disabled:opacity-50"
          >
            {autoEscalate.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            Auto-escalate CRITICAL
          </button>
        }
      />

      {autoEscalateMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-md"
        >
          <Zap className="w-4 h-4 shrink-0" />
          {autoEscalateMsg}
        </motion.div>
      )}

      {ackMutation.error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
          {ackMutation.error.message}
        </div>
      )}

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi
            label="Total Escalated"
            value={stats.total}
            sub="across all authorities"
            Icon={Gavel}
            accent="slate"
          />
          <Kpi
            label="Pending Acknowledgement"
            value={stats.pending}
            sub="awaiting authority response"
            Icon={AlertTriangle}
            accent="amber"
          />
          <Kpi
            label="Acknowledged"
            value={stats.acknowledged}
            sub="under investigation"
            Icon={CheckCircle2}
            accent="green"
          />
          <Kpi
            label="Acknowledgement Rate"
            value={`${ackRate}%`}
            sub="of all escalations"
            Icon={TrendingUp}
            accent="blue"
          />
        </div>
      )}

      {/* By authority breakdown */}
      {stats && stats.byAuthority.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-md p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Escalations by Authority
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {stats.byAuthority.map((row) => {
              const style = AUTHORITY_ACCENT[row.authority ?? ""] ?? {
                bg: "bg-gray-50",
                border: "border-gray-200",
                text: "text-gray-700",
                icon: "—",
              };
              return (
                <div
                  key={row.authority}
                  className={cn("p-3 rounded border", style.bg, style.border)}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider", style.text)}>
                      {style.icon}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">{row.count}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                    {row.label?.replace(/\s*\([^)]+\)/, "") ?? row.authority ?? "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Authority filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Filter className="w-3.5 h-3.5" />
          <span>Authority:</span>
        </div>
        <button
          onClick={() => { setAuthorityFilter(""); setPage(1); }}
          className={cn(
            "px-3 py-1 rounded text-[11px] font-medium transition-colors border",
            authorityFilter === ""
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          )}
        >
          All
        </button>
        {Object.keys(AUTHORITY_ACCENT).map((code) => {
          const isActive = authorityFilter === code;
          return (
            <button
              key={code}
              onClick={() => { setAuthorityFilter(code as LawAuthority); setPage(1); }}
              className={cn(
                "px-3 py-1 rounded text-[11px] font-medium transition-colors border",
                isActive
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              )}
            >
              {AUTHORITY_ACCENT[code].icon} {code.replace("_OFFICE", "").replace("_", " ")}
            </button>
          );
        })}
      </div>

      {/* Escalations list */}
      {escalationsQuery.isLoading ? (
        <LoadingState message="Loading escalations..." />
      ) : !escalations || escalations.items.length === 0 ? (
        <EmptyState
          icon={FileWarning}
          title={authorityFilter ? "No escalations for this authority" : "No escalations yet"}
          description={
            authorityFilter
              ? "Try a different filter or clear it to see all escalations."
              : "No anomalies have been escalated to law enforcement yet. Use the auto-escalate button above or escalate from any anomaly detail page."
          }
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-2.5"
        >
          {escalations.items.map((e) => (
            <EscalationCard
              key={e.id}
              escalation={e}
              onAcknowledge={handleAcknowledge}
              isAcking={ackMutation.isPending && ackMutation.variables === e.lawReferenceNo}
              onClick={() => navigate(`/anomalies/${e.id}`)}
            />
          ))}

          {/* Pagination */}
          {escalations.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs bg-white hover:bg-gray-50 border border-gray-200 rounded text-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">
                Page {escalations.pagination.page} of {escalations.pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(escalations.pagination.totalPages, p + 1))
                }
                disabled={page >= escalations.pagination.totalPages}
                className="px-3 py-1.5 text-xs bg-white hover:bg-gray-50 border border-gray-200 rounded text-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ── Escalation card ───────────────────────────────────────────────────────────

function EscalationCard({
  escalation,
  onAcknowledge,
  isAcking,
  onClick,
}: {
  escalation: LawEscalationSummary;
  onAcknowledge: (ref: string) => void;
  isAcking: boolean;
  onClick: () => void;
}) {
  const sevStyle = SEV_STYLE[escalation.severity] ?? {
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
    border: "border-gray-200",
  };
  const authStyle = AUTHORITY_ACCENT[escalation.lawAuthority ?? ""] ?? {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    icon: "—",
  };

  const severityBar =
    escalation.severity === "CRITICAL" ? "bg-red-500"
    : escalation.severity === "HIGH"   ? "bg-orange-500"
    : "bg-amber-500";

  return (
    <motion.div
      variants={fadeUp}
      transition={{ duration: 0.3, ease: EASE }}
      className="bg-white border border-gray-200 rounded-md p-4 hover:border-gray-300 transition-all group"
    >
      <div className="flex items-start gap-3">
        {/* Severity bar */}
        <div className={cn("w-1 self-stretch rounded-full", severityBar)} />

        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                  sevStyle.bg, sevStyle.text, sevStyle.border ?? "border-transparent"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", sevStyle.dot)} />
                {escalation.severity}
              </div>
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                  authStyle.bg, authStyle.border, authStyle.text
                )}
              >
                {authStyle.icon} {escalation.lawAuthorityLabel ?? escalation.lawAuthority}
              </div>
              {escalation.lawAcknowledged ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Acknowledged
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                  Pending
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                Risk
              </p>
              <p className="text-base font-bold text-gray-900 tabular-nums">
                {escalation.riskScore}
              </p>
            </div>
          </div>

          {/* Title */}
          <button
            onClick={onClick}
            className="block text-left text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug"
          >
            {escalation.title}
          </button>

          {/* Reference + project */}
          <div className="mt-2 flex items-center gap-3 flex-wrap text-[11px] text-gray-500">
            {escalation.lawReferenceNo && (
              <div className="flex items-center gap-1 font-mono">
                <Hash className="w-3 h-3" />
                <span className="text-gray-700">{escalation.lawReferenceNo}</span>
              </div>
            )}
            {escalation.project && (
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span className="text-gray-600 truncate max-w-[260px]">
                  {escalation.project.name}
                </span>
              </div>
            )}
            {escalation.project && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="text-gray-600">
                  {escalation.project.district}, {escalation.project.state}
                </span>
              </div>
            )}
            {escalation.lawEscalatedAt && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {new Date(escalation.lawEscalatedAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            {escalation.project && (
              <div className="text-gray-400">
                {formatCurrency(escalation.project.approvedAmount)}
              </div>
            )}
          </div>

          {/* Notes */}
          {escalation.lawNotes && (
            <p className="mt-2 text-[11px] text-gray-500 italic line-clamp-2 leading-relaxed">
              "{escalation.lawNotes}"
            </p>
          )}

          {/* Actions */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="text-[10px] text-gray-400">
              {escalation.escalatedBy ? `By ${escalation.escalatedBy.name}` : "—"}
            </div>
            <div className="flex items-center gap-2">
              {!escalation.lawAcknowledged && escalation.lawReferenceNo && (
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onAcknowledge(escalation.lawReferenceNo!);
                  }}
                  disabled={isAcking}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded transition-colors disabled:opacity-50"
                >
                  {isAcking ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  Mark Acknowledged
                </button>
              )}
              <button
                onClick={onClick}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded transition-colors"
              >
                View Anomaly
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
