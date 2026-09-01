import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAnomalies, useAnomalyStats, useScanAnomalies } from "@/hooks/useAnomalies";
import {
  type AnomalyStatus,
  type AnomalySeverity,
  type AnomalyCategory,
  ANOMALY_STATUSES,
  SEVERITY_COLORS,
  getAnomalyCategoryLabel,
  getStatusLabel,
  getRiskLabel,
} from "@/types";
import { LoadingState, ErrorState } from "@/components/ui";
import PageHeader from "@/components/ui/PageHeader";
import { fadeUp, staggerContainer, EASE } from "@/components/ui/Animations";
import EmptyState from "@/components/ui/Empty";
import {
  AlertTriangle,
  Search,
  X,
  Filter,
  ChevronRight,
  Shield,
  Building2,
  MapPin,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Scan,
  ShieldCheck,
} from "lucide-react";

export default function AnomaliesPage() {
  const navigate = useNavigate();
  const [scanToast, setScanToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AnomalyStatus | "">("");
  const [severityFilter, setSeverityFilter] = useState<AnomalySeverity | "">("");
  const [categoryFilter, setCategoryFilter] = useState<AnomalyCategory | "">("");

  const anomaliesQuery = useAnomalies({
    status: (statusFilter || undefined) as AnomalyStatus | undefined,
    severity: (severityFilter || undefined) as AnomalySeverity | undefined,
    category: (categoryFilter || undefined) as AnomalyCategory | undefined,
    page: 1,
    limit: 50,
  });
  const statsQuery = useAnomalyStats();
  const scanMutation = useScanAnomalies();

  const anomalies = anomaliesQuery.data?.items ?? [];
  const stats = statsQuery.data
    ? {
        open: statsQuery.data.open,
        critical: statsQuery.data.critical,
        high: statsQuery.data.high,
        total: statsQuery.data.total,
      }
    : null;
  const loading = anomaliesQuery.isLoading;
  const error = anomaliesQuery.error?.message ?? null;
  const scanning = scanMutation.isPending;

  const filtered = useMemo(() => {
    if (!search.trim()) return anomalies;
    const q = search.trim().toLowerCase();
    return anomalies.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.project?.name.toLowerCase().includes(q) ||
        a.project?.district.toLowerCase().includes(q) ||
        a.ruleCode?.toLowerCase().includes(q)
    );
  }, [anomalies, search]);

  const clearFilters = () => {
    setStatusFilter("");
    setSeverityFilter("");
    setCategoryFilter("");
    setSearch("");
  };
  const hasActiveFilters = statusFilter || severityFilter || categoryFilter || search;

  const handleScan = async () => {
    try {
      const result = await scanMutation.mutateAsync();
      setScanToast(`Scan complete: ${result.newAnomalies} new anomalies detected (${result.totalAnomalies} total)`);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setScanToast(null), 6000);
    } catch { /* handled by error state */ }
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Page header */}
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Anomaly"
          gradientWord="Detection"
          accent="saffron"
          icon={AlertTriangle}
          subtitle="AI-flagged patterns requiring human verification"
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Anomaly Detection" },
          ]}
          actions={
            <button
              onClick={handleScan}
              disabled={scanning}
              aria-label={scanning ? "Running anomaly scan" : "Run anomaly scan"}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-saffron-500 to-orange-400 hover:from-orange-400 hover:to-saffron-400 disabled:from-saffron-500/50 text-navy-900 text-sm font-bold rounded-lg shadow-lg shadow-saffron-500/30 hover:shadow-saffron-500/50 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {scanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Run Scan
                </>
              )}
            </button>
          }
        />
      </motion.div>

      {/* Accessible toast */}
      {scanToast && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          role="status"
          aria-live="polite"
          className="glass rounded-xl p-4 flex items-center gap-3 border border-green-500/30 bg-green-500/5"
        >
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-sm text-green-300">{scanToast}</p>
        </motion.div>
      )}

      {/* Stats row — dramatic 4-up with glow */}
      {stats && (
        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Open",         value: stats.open,     accent: "amber" as const,  icon: AlertTriangle, sub: "needs review", delta: stats.open > 0 ? "+" : undefined },
            { label: "Critical",     value: stats.critical, accent: "red"    as const,  icon: ShieldCheck,   sub: "immediate action", pulse: stats.critical > 0 },
            { label: "High Risk",     value: stats.high,     accent: "saffron" as const, icon: AlertTriangle, sub: "priority", },
            { label: "Total",        value: stats.total,    accent: "electric" as const, icon: Scan,          sub: "all time", },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -3, scale: 1.02 }}
                className={`glass rounded-2xl p-5 border ring-1 ${
                  s.accent === "red" ? "ring-red-500/20 top-accent top-accent-red" :
                  s.accent === "amber" ? "ring-saffron-500/20 top-accent top-accent-saffron" :
                  s.accent === "electric" ? "ring-electric-500/20 top-accent top-accent-electric" :
                  "ring-saffron-500/20 top-accent top-accent-saffron"
                } transition-all cursor-default group overflow-hidden relative`}
              >
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                  s.accent === "red" ? "bg-gradient-to-r from-red-500 to-red-400" :
                  s.accent === "amber" ? "bg-gradient-to-r from-saffron-500 to-saffron-400" :
                  s.accent === "electric" ? "bg-gradient-to-r from-electric-500 to-electric-400" :
                  "bg-gradient-to-r from-orange-500 to-orange-400"
                }`} />
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    s.accent === "red" ? "bg-red-500/15 text-red-400" :
                    s.accent === "amber" ? "bg-saffron-500/15 text-saffron-400" :
                    s.accent === "electric" ? "bg-electric-500/15 text-electric-400" :
                    "bg-orange-500/15 text-orange-400"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {s.pulse && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                  )}
                </div>
                <p className={`text-3xl font-bold leading-none tabular-nums ${
                  s.accent === "red" ? "text-red-400" :
                  s.accent === "amber" ? "text-saffron-400" :
                  s.accent === "electric" ? "text-electric-400" :
                  "text-orange-400"
                }`} style={{ textShadow: "0 0 24px currentColor" }}>
                  {s.value}
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1.5 font-semibold">{s.label}</p>
                <p className="text-[9px] text-slate-600 mt-0.5">{s.sub}</p>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={fadeUp} className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative flex-1 min-w-[220px]"
            role="search"
            aria-label="Search anomalies"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, project, district, or rule..."
              className="w-full bg-navy-800/60 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all"
              aria-label="Search anomalies by title, project, district, or rule code"
            />
          </form>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AnomalyStatus | "")}
            className="bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-electric-500/50 transition-colors cursor-pointer"
            aria-label="Filter by anomaly status"
          >
            <option value="">All statuses</option>
            {ANOMALY_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as AnomalySeverity | "")}
            className="bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-electric-500/50 transition-colors cursor-pointer"
            aria-label="Filter by anomaly severity"
          >
            <option value="">All severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Severity quick-filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter by severity">
          <Filter className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1 font-semibold">Severity:</span>
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as AnomalySeverity[]).map((s) => {
            const isActive = severityFilter === s;
            const style = SEVERITY_COLORS[s];
            return (
              <button
                key={s}
                onClick={() => setSeverityFilter(isActive ? "" : s)}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                  isActive
                    ? `${style.bg} ${style.text} border-current shadow-sm`
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                {s}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading anomalies..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => anomaliesQuery.refetch()} />
      ) : filtered.length === 0 ? (
        <motion.div variants={fadeUp} className="glass rounded-xl">
          <EmptyState
            icon={CheckCircle2}
            title={hasActiveFilters ? "No anomalies match your filters" : "No anomalies detected"}
            description={
              hasActiveFilters
                ? "Try adjusting your filters or run a fresh scan."
                : "All projects are within expected parameters. Run a scan to check the latest data."
            }
            accent="green"
            action={
              hasActiveFilters ? (
                <button onClick={clearFilters} className="text-xs text-electric-400 hover:text-electric-300">
                  Clear filters
                </button>
              ) : (
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="flex items-center gap-2 px-3 py-1.5 bg-electric-500/10 border border-electric-500/30 text-electric-400 text-xs rounded-md hover:bg-electric-500/20 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${scanning ? "animate-spin" : ""}`} />
                  Run scan
                </button>
              )
            }
          />
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a, i) => {
            const sevStyle = SEVERITY_COLORS[a.severity];
            const risk = getRiskLabel(a.riskScore);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.4, ease: EASE }}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/anomalies/${a.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/anomalies/${a.id}`);
                  }
                }}
                className="glass rounded-xl p-5 hover:border-white/15 hover:-translate-y-0.5 transition-all cursor-pointer group relative overflow-hidden"
                aria-label={`View anomaly: ${a.title}`}
              >
                {/* Severity accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${a.severity === "CRITICAL" ? "bg-red-500" : a.severity === "HIGH" ? "bg-orange-500" : a.severity === "MEDIUM" ? "bg-saffron-500" : "bg-blue-500"}`} />

                <div className="flex items-start justify-between gap-3 mb-2.5 pl-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-white/5 ${sevStyle.bg} ${sevStyle.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sevStyle.dot}`} />
                      {a.severity}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-white/5 text-slate-300 uppercase tracking-wider">
                      {getAnomalyCategoryLabel(a.category)}
                    </span>
                    {a.status !== "OPEN" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-blue-500/10 text-blue-400 uppercase tracking-wider border border-blue-500/20">
                        {getStatusLabel(a.status)}
                      </span>
                    )}
                    {a.lawEscalation && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-red-500/10 text-red-400 uppercase tracking-wider border border-red-500/20 flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        {a.lawAuthorityLabel ?? "Escalated"}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0 pr-2">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Risk</p>
                    <p className={`text-lg font-bold leading-none tabular-nums ${risk.color}`} style={{ textShadow: "0 0 12px currentColor" }}>
                      {a.riskScore}
                    </p>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-white pl-2 group-hover:text-electric-300 transition-colors leading-snug">
                  {a.title}
                </h3>

                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed pl-2">
                  {a.description}
                </p>

                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-600 flex-wrap gap-2 pl-2">
                  <div className="flex items-center gap-3">
                    {a.project && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3" />
                        <span className="text-slate-400 truncate max-w-[200px]">{a.project.name}</span>
                      </div>
                    )}
                    {a.project && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        <span>{a.project.district}</span>
                      </div>
                    )}
                    {a.ruleCode && (
                      <span className="font-mono text-slate-500">{a.ruleCode}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-electric-400 transition-colors">
                    <span>
                      {new Date(a.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short",
                      })}
                    </span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Trust note */}
      <motion.div variants={fadeUp} className="glass rounded-xl p-4 flex items-start gap-3 text-xs text-slate-400">
        <Shield className="w-4 h-4 text-electric-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-slate-300 font-medium mb-0.5">About anomaly detection</p>
          <p className="leading-relaxed">
            Anomalies are AI-flagged patterns that warrant review — they indicate <em>risk</em>, not
            confirmed fraud. Final verification always remains with authorized government officers.
            Each anomaly has a risk score (0-100) and a clear evidence trail.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
