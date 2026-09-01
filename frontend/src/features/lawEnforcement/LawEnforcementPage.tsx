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
} from "lucide-react";
import { SEVERITY_COLORS } from "@/types";

const AUTHORITY_ACCENT: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  ACB_OFFICE: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-300", icon: "🛡️" },
  POLICE_OFFICE: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-300", icon: "👮" },
  CVC: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-300", icon: "⚖️" },
  LOKAYUKTA: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-300", icon: "🏛️" },
  VIGILANCE: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-300", icon: "🔍" },
  COMPTROLLER: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-300", icon: "📊" },
};

function formatCurrency(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function LawEnforcementPage() {
  const navigate = useNavigate();
  const [authorityFilter, setAuthorityFilter] = useState<LawAuthority | "">("");
  const [page, setPage] = useState(1);
  const [autoEscalateMsg, setAutoEscalateMsg] = useState<string | null>(null);

  const statsQuery = useLawEnforcementStats();
  const escalationsQuery = useLawEscalations({
    authority: (authorityFilter || undefined) as LawAuthority | undefined,
    page,
    limit: 20,
  });
  const ackMutation = useAcknowledgeReferral();
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

  const stats = statsQuery.data;
  const escalations = escalationsQuery.data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-[fadeIn_0.3s_ease-out]">
      <PageHeader
        title="Law Enforcement"
        subtitle="Anomalies escalated to ACB, Police, CVC, Lokayukta, Vigilance & CAG"
        icon={Gavel}
        actions={
          <button
            onClick={handleAutoEscalate}
            disabled={autoEscalate.isPending}
            className="flex items-center gap-2 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
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
          className="flex items-center gap-2 p-3 rounded-lg bg-electric-500/10 border border-electric-500/30 text-electric-300 text-xs"
        >
          <Zap className="w-4 h-4 shrink-0" />
          {autoEscalateMsg}
        </motion.div>
      )}

      {ackMutation.error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          {ackMutation.error.message}
        </div>
      )}

      {/* Stats grid */}
      {stats && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.4, ease: EASE }}>
            <div className="glass rounded-xl p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1.5">
                Total Escalated
              </p>
              <p className="text-2xl font-bold text-white tabular-nums">{stats.total}</p>
              <p className="text-[10px] text-slate-500 mt-1">across all authorities</p>
            </div>
          </motion.div>
          <motion.div variants={fadeUp} transition={{ duration: 0.4, ease: EASE }}>
            <div className="glass rounded-xl p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1.5">
                Pending Acknowledgement
              </p>
              <p className="text-2xl font-bold text-amber-400 tabular-nums">{stats.pending}</p>
              <p className="text-[10px] text-slate-500 mt-1">awaiting authority response</p>
            </div>
          </motion.div>
          <motion.div variants={fadeUp} transition={{ duration: 0.4, ease: EASE }}>
            <div className="glass rounded-xl p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1.5">
                Acknowledged
              </p>
              <p className="text-2xl font-bold text-emerald-400 tabular-nums">{stats.acknowledged}</p>
              <p className="text-[10px] text-slate-500 mt-1">under investigation</p>
            </div>
          </motion.div>
          <motion.div variants={fadeUp} transition={{ duration: 0.4, ease: EASE }}>
            <div className="glass rounded-xl p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1.5">
                Acknowledgement Rate
              </p>
              <p className="text-2xl font-bold text-electric-400 tabular-nums">
                {stats.total > 0 ? Math.round((stats.acknowledged / stats.total) * 100) : 0}%
              </p>
              <p className="text-[10px] text-slate-500 mt-1">of all escalations</p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* By authority breakdown */}
      {stats && stats.byAuthority.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-electric-400" />
            Escalations by Authority
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {stats.byAuthority.map((row) => {
              const style = AUTHORITY_ACCENT[row.authority ?? ""] ?? {
                bg: "bg-white/5",
                border: "border-white/10",
                text: "text-slate-200",
                icon: "📋",
              };
              return (
                <div
                  key={row.authority}
                  className={`p-3 rounded-lg ${style.bg} border ${style.border}`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-lg">{style.icon}</span>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>
                      {row.label.replace(/\s*\([^)]+\)/, "").split(" ").slice(0, 2).join(" ")}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-white tabular-nums">{row.count}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Authority:</span>
        </div>
        <button
          onClick={() => {
            setAuthorityFilter("");
            setPage(1);
          }}
          className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
            authorityFilter === ""
              ? "bg-electric-500/20 text-electric-300 border border-electric-500/30"
              : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
          }`}
        >
          All
        </button>
        {Object.keys(AUTHORITY_ACCENT).map((code) => {
          const isActive = authorityFilter === code;
          return (
            <button
              key={code}
              onClick={() => {
                setAuthorityFilter(code as LawAuthority);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                isActive
                  ? "bg-electric-500/20 text-electric-300 border border-electric-500/30"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
              }`}
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
              : "No anomalies have been escalated to law enforcement yet. You can use the auto-escalate button above or escalate from any anomaly detail page."
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
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-slate-300 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500">
                Page {escalations.pagination.page} of {escalations.pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(escalations.pagination.totalPages, p + 1))
                }
                disabled={page >= escalations.pagination.totalPages}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-slate-300 disabled:opacity-50"
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
  const sevStyle = SEVERITY_COLORS[escalation.severity as keyof typeof SEVERITY_COLORS] ?? {
    bg: "bg-slate-500/10",
    text: "text-slate-300",
    dot: "bg-slate-400",
  };
  const authStyle = AUTHORITY_ACCENT[escalation.lawAuthority ?? ""] ?? {
    bg: "bg-white/5",
    border: "border-white/10",
    text: "text-slate-300",
    icon: "📋",
  };

  return (
    <motion.div
      variants={fadeUp}
      transition={{ duration: 0.3, ease: EASE }}
      className="glass rounded-xl p-4 hover:border-white/15 transition-all group"
    >
      <div className="flex items-start gap-3">
        {/* Severity bar */}
        <div
          className={`w-1 self-stretch rounded-full ${
            escalation.severity === "CRITICAL"
              ? "bg-red-500"
              : escalation.severity === "HIGH"
              ? "bg-orange-500"
              : "bg-saffron-500"
          }`}
        />

        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-white/5 ${sevStyle.bg} ${sevStyle.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${sevStyle.dot}`} />
                {escalation.severity}
              </div>
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${authStyle.border} ${authStyle.bg} ${authStyle.text}`}
              >
                <span>{authStyle.icon}</span>
                {escalation.lawAuthorityLabel ?? escalation.lawAuthority}
              </div>
              {escalation.lawAcknowledged ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Acknowledged
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Pending
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                Risk
              </p>
              <p className="text-base font-bold text-white tabular-nums">
                {escalation.riskScore}
              </p>
            </div>
          </div>

          {/* Title */}
          <button
            onClick={onClick}
            className="block text-left text-sm font-semibold text-white group-hover:text-electric-300 transition-colors leading-snug"
          >
            {escalation.title}
          </button>

          {/* Reference + project */}
          <div className="mt-2 flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
            {escalation.lawReferenceNo && (
              <div className="flex items-center gap-1 font-mono">
                <Hash className="w-3 h-3" />
                <span className="text-slate-300">{escalation.lawReferenceNo}</span>
              </div>
            )}
            {escalation.project && (
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span className="text-slate-400 truncate max-w-[260px]">
                  {escalation.project.name}
                </span>
              </div>
            )}
            {escalation.project && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>
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
              <div className="text-slate-600">
                {formatCurrency(escalation.project.approvedAmount)}
              </div>
            )}
          </div>

          {/* Notes */}
          {escalation.lawNotes && (
            <p className="mt-2 text-[11px] text-slate-400 italic line-clamp-2 leading-relaxed">
              "{escalation.lawNotes}"
            </p>
          )}

          {/* Actions */}
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <div className="text-[10px] text-slate-500">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-md transition-colors disabled:opacity-50"
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-md transition-colors"
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
