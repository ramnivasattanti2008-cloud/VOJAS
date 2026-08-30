import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { anomalyApi } from "@/services/anomaly-api";
import { ApiError } from "@/services/api";
import {
  type Anomaly,
  type AnomalyStatus,
  type AnomalySeverity,
  type AnomalyCategory,
  ANOMALY_STATUSES,
  SEVERITY_COLORS,
  getAnomalyCategoryLabel,
  getStatusLabel,
  getRiskLabel,
} from "@/types";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui";
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
} from "lucide-react";

export default function AnomaliesPage() {
  const navigate = useNavigate();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanToast, setScanToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AnomalyStatus | "">("");
  const [severityFilter, setSeverityFilter] = useState<AnomalySeverity | "">("");
  const [categoryFilter, setCategoryFilter] = useState<AnomalyCategory | "">("");

  // Stats
  const [stats, setStats] = useState<{
    open: number;
    critical: number;
    high: number;
    total: number;
  } | null>(null);

  const fetchAnomalies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await anomalyApi.list({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
        category: categoryFilter || undefined,
        page: 1,
        limit: 50,
      });
      setAnomalies(data.items);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to load anomalies");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await anomalyApi.stats();
      setStats({
        open: data.open,
        critical: data.critical,
        high: data.high,
        total: data.total,
      });
    } catch (err) {
      // Stats are optional
    }
  };

  useEffect(() => {
    fetchAnomalies();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, severityFilter, categoryFilter]);

  // Apply client-side search
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
    setScanning(true);
    try {
      const result = await anomalyApi.scan();
      await fetchAnomalies();
      await fetchStats();
      // Show ARIA-friendly inline toast (announced via role="status")
      setScanToast(`Scan complete: ${result.newAnomalies} new anomalies detected (${result.totalAnomalies} total)`);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setScanToast(null), 6000);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-electric-400" />
            Anomaly Detection
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            AI-flagged patterns requiring human verification — anomalies indicate risk, not fraud
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          aria-label={scanning ? "Running anomaly scan" : "Run anomaly scan"}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-electric-500 to-electric-600 hover:from-electric-400 hover:to-electric-500 disabled:from-electric-500/50 disabled:to-electric-600/50 text-white text-sm font-semibold rounded-lg shadow-lg shadow-electric-500/20 hover:shadow-electric-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scanning ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Run Scan
            </>
          )}
        </button>
      </div>

      {/* Accessible toast — announced via aria-live */}
      {scanToast && (
        <div
          role="status"
          aria-live="polite"
          className="glass rounded-xl p-4 flex items-center gap-3 border border-emerald-500/30 bg-emerald-500/5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300">{scanToast}</p>
        </div>
      )}

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass rounded-xl p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Open</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.open}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Critical</p>
            <p className="text-2xl font-bold text-red-400 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {stats.critical}
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">High</p>
            <p className="text-2xl font-bold text-orange-400 mt-1">{stats.high}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Total</p>
            <p className="text-2xl font-bold text-electric-400 mt-1">{stats.total}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-3">
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
          <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1">Severity:</span>
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
                    ? `${style.bg} ${style.text} border-current`
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading anomalies..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAnomalies} />
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl">
          <EmptyState
            icon={<CheckCircle2 className="w-7 h-7 text-green-400" />}
            title={hasActiveFilters ? "No anomalies match your filters" : "No anomalies detected"}
            description={
              hasActiveFilters
                ? "Try adjusting your filters or run a fresh scan."
                : "All projects are within expected parameters. Run a scan to check the latest data."
            }
            action={hasActiveFilters ? (
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
            )}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const sevStyle = SEVERITY_COLORS[a.severity];
            const risk = getRiskLabel(a.riskScore);
            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/anomalies/${a.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/anomalies/${a.id}`);
                  }
                }}
                className="glass rounded-xl p-5 hover:border-white/15 hover:-translate-y-0.5 transition-all cursor-pointer group"
                aria-label={`View anomaly: ${a.title}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Severity badge */}
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-white/5 ${sevStyle.bg} ${sevStyle.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sevStyle.dot}`} />
                      {a.severity}
                    </div>
                    {/* Category badge */}
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-white/5 text-slate-300 uppercase tracking-wider">
                      {getAnomalyCategoryLabel(a.category)}
                    </span>
                    {/* Status */}
                    {a.status !== "OPEN" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-blue-500/10 text-blue-400 uppercase tracking-wider">
                        {getStatusLabel(a.status)}
                      </span>
                    )}
                  </div>
                  {/* Risk score */}
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Risk</p>
                    <p className={`text-base font-bold ${risk.color} leading-none`}>{a.riskScore}</p>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-white group-hover:text-electric-300 transition-colors leading-snug">
                  {a.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {a.description}
                </p>

                {/* Meta footer */}
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-600 flex-wrap gap-2">
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
              </div>
            );
          })}
        </div>
      )}

      {/* Trust note */}
      <div className="glass rounded-xl p-4 flex items-start gap-3 text-xs text-slate-400">
        <Shield className="w-4 h-4 text-electric-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-slate-300 font-medium mb-0.5">About anomaly detection</p>
          <p className="leading-relaxed">
            Anomalies are AI-flagged patterns that warrant review — they indicate <em>risk</em>, not
            confirmed fraud. Final verification always remains with authorized government officers.
            Each anomaly has a risk score (0-100) and a clear evidence trail.
          </p>
        </div>
      </div>
    </div>
  );
}
