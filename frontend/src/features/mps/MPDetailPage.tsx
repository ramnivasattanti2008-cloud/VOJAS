/**
 * VOJAS — MP Detail Page
 *
 * Shows complete MP profile + all their projects + analytics.
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  MapPin,
  Calendar,
  TrendingUp,
  IndianRupee,
  Activity,
  ShieldAlert,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  FileText,
  Briefcase,
  BarChart3,
} from "lucide-react";
import { useMPDetail, useMPStats, useMPProjects } from "@/hooks/useMPs";
import { LoadingState, ErrorState } from "@/components/ui";
import {
  type Project,
  type ProjectStatus,
  PROJECT_STATUSES,
  STATUS_COLORS,
  getTermLabel,
  getHouseLabel,
} from "@/types";

function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(3)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

type Tab = "overview" | "projects" | "spending" | "spending-detail";

export default function MPDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [projectPage, setProjectPage] = useState(1);

  const mpQuery = useMPDetail(id);
  const statsQuery = useMPStats(id);
  const projectsQuery = useMPProjects(id, projectPage);

  const mp = mpQuery.data;
  const stats = statsQuery.data;
  const projectsData = projectsQuery.data;
  const loading = mpQuery.isLoading;
  const error = mpQuery.error?.message ?? null;

  if (loading) return <LoadingState message="Loading MP profile..." />;
  if (error || !mp) return <ErrorState message={error || "MP not found"} onRetry={() => mpQuery.refetch()} />;

  const totalProjects = stats?.totalProjects ?? mp.projects?.length ?? 0;
  const totalApproved = stats?.totalApproved ?? 0;
  const totalSpent = stats?.totalSpent ?? 0;
  const utilization = totalApproved > 0 ? (totalSpent / totalApproved) * 100 : 0;

  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
      {/* Back button */}
      <button
        onClick={() => navigate("/mps")}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        <span>MPs</span>
      </button>

      {/* Hero header */}
      <div className="glass rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/40 to-transparent" />
        <div className="flex items-start gap-5 flex-wrap">
          {/* Avatar circle */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-electric-500/20 to-blue-700/20 border border-electric-500/30 flex items-center justify-center shrink-0">
            <User className="w-10 h-10 text-electric-400" />
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-electric-500/30 bg-electric-500/10 text-electric-400">
                {mp.party || "Independent"}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 bg-white/5 text-slate-400">
                {getHouseLabel(mp.house)} · {getTermLabel(mp.term)}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white leading-tight">{mp.name}</h1>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {mp.constituency}, {mp.state}
              </span>
              {mp.termStart && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {fmtDate(mp.termStart)} – {mp.termEnd ? fmtDate(mp.termEnd) : "Incumbent"}
                </span>
              )}
              {mp.attendance && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Activity className="w-3 h-3" />
                  {mp.attendance} attendance
                </span>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-3 shrink-0 text-right">
            <Stat label="Projects" value={String(totalProjects)} accent="text-electric-400" />
            <Sep />
            <Stat label="Approved" value={formatINR(totalApproved)} accent="text-white" />
            <Sep />
            <Stat
              label="Spent"
              value={formatINR(totalSpent)}
              accent={totalSpent > totalApproved ? "text-red-400" : "text-saffron-400"}
            />
            <Sep />
            <Stat
              label="Util %"
              value={`${utilization.toFixed(0)}%`}
              accent={utilization > 100 ? "text-red-400" : utilization > 80 ? "text-emerald-400" : "text-saffron-400"}
            />
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-5 px-4 md:px-5 bg-navy-950/80 backdrop-blur-xl border-b border-white/5">
        <div role="tablist" className="flex items-center gap-1 overflow-x-auto">
          {[
            { key: "overview", label: "Overview", icon: User },
            { key: "projects", label: `Projects (${totalProjects})`, icon: Briefcase },
            { key: "spending", label: "MPLADS Spending", icon: IndianRupee },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key as Tab)}
              className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all shrink-0 ${
                activeTab === key
                  ? "border-electric-500 text-electric-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="pt-1">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              {/* Profile card */}
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-electric-400" />
                  MP Profile
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <Field label="Full Name" value={mp.name} />
                  <Field label="Party" value={mp.party} />
                  <Field label="House" value={getHouseLabel(mp.house)} />
                  <Field label="Term" value={getTermLabel(mp.term)} />
                  <Field label="Constituency" value={mp.constituency} />
                  <Field label="State" value={mp.state} />
                  <Field label="Term Start" value={fmtDate(mp.termStart)} />
                  <Field label="Term End" value={fmtDate(mp.termEnd)} />
                  <Field label="Attendance" value={mp.attendance || "—"} />
                  {mp.lgdCode && <Field label="LGD Code" value={mp.lgdCode} mono />}
                </div>
              </div>

              {/* Sector breakdown */}
              {stats?.bySector && Object.keys(stats.bySector).length > 0 && (
                <div className="glass rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-electric-400" />
                    Projects by Sector
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(stats.bySector)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([sector, count]) => {
                        const pct = ((count as number) / totalProjects) * 100;
                        return (
                          <div key={sector}>
                            <div className="flex items-center justify-between text-[11px] mb-0.5">
                              <span className="text-slate-300 capitalize">
                                {sector.toLowerCase().replace(/_/g, " ")}
                              </span>
                              <span className="text-slate-500 font-mono">{count as number} ({pct.toFixed(0)}%)</span>
                            </div>
                            <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-electric-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* State breakdown */}
              {stats?.byState && Object.keys(stats.byState).length > 0 && (
                <div className="glass rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-electric-400" />
                    Projects by State
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(stats.byState)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .slice(0, 12)
                      .map(([state, count]) => (
                        <span
                          key={state}
                          className="px-2 py-1 rounded bg-navy-800/50 border border-white/5 text-[10px] text-slate-300"
                        >
                          {state} <span className="text-slate-500 ml-1 font-mono">{count as number}</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {/* Anomalies count */}
              {stats && (
                <div className="glass rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    Anomalies Detected
                  </h3>
                  <p className={`text-2xl font-bold ${stats.anomalyCount > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {stats.anomalyCount}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    across {totalProjects} projects
                  </p>
                  {stats.anomalyCount > 0 && (
                    <a
                      href="/anomalies"
                      className="mt-2 text-[10px] text-electric-400 hover:text-electric-300 flex items-center gap-1"
                    >
                      View all <ChevronRight className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Status breakdown */}
              {stats?.byStatus && Object.keys(stats.byStatus).length > 0 && (
                <div className="glass rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-electric-400" />
                    Status Breakdown
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(stats.byStatus)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([status, count]) => {
                        const style = STATUS_COLORS[status as ProjectStatus];
                        return (
                          <div key={status} className="flex items-center justify-between text-[11px]">
                            <span className={`flex items-center gap-1.5 ${style?.text || "text-slate-400"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${style?.dot || "bg-slate-500"}`} />
                              {PROJECT_STATUSES.find((s) => s.value === (status as ProjectStatus))?.label ?? status}
                            </span>
                            <span className="font-mono text-slate-300">{count as number}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* External links */}
              <div className="glass rounded-xl p-4">
                <h3 className="text-xs font-semibold text-white mb-2.5">External Links</h3>
                <div className="space-y-1">
                  {[
                    { label: "PRS Legislative", url: `https://prsindia.org/mptrack/${mp.id}` },
                    { label: "Lok Sabha Profile", url: "https://loksabha.nic.in/Members.html" },
                    { label: "MPLADS Portal", url: "https://www.mplads.gov.in/" },
                  ].map(({ label, url }) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-electric-400 transition-colors group py-1"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="flex-1">{label}</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "projects" && (
          <ProjectsList
            projectsData={projectsData}
            isLoading={projectsQuery.isLoading}
            page={projectPage}
            onPageChange={setProjectPage}
            onProjectClick={(id) => navigate(`/projects/${id}`)}
          />
        )}

        {activeTab === "spending" && (
          <MPLADSSpending mp={mp} totalApproved={totalApproved} totalSpent={totalSpent} />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold ${accent}`}>{value}</p>
    </div>
  );
}
function Sep() {
  return <div className="w-px h-7 bg-white/10" />;
}
function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value || value === "—") return null;
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-xs text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
function ProjectsList({
  projectsData,
  isLoading,
  page,
  onPageChange,
  onProjectClick,
}: {
  projectsData: any;
  isLoading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  onProjectClick: (id: string) => void;
}) {
  if (isLoading) return <LoadingState message="Loading projects..." />;
  const items = projectsData?.items ?? [];
  const totalPages = projectsData?.totalPages ?? 1;
  const total = projectsData?.total ?? 0;

  if (items.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Briefcase className="w-10 h-10 mx-auto text-slate-500 mb-3" />
        <p className="text-sm text-slate-400">No projects found for this MP</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">{total} projects</p>
      <div className="space-y-1.5">
        {items.map((p: Project) => {
          const style = STATUS_COLORS[p.status];
          const progress = p.approvedAmount > 0 ? Math.round((p.spentAmount / p.approvedAmount) * 100) : 0;
          return (
            <button
              key={p.id}
              onClick={() => onProjectClick(p.id)}
              className="w-full text-left glass rounded-xl p-3.5 border border-white/5 hover:border-electric-500/30 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${style?.bg} ${style?.text}`}>
                      <span className={`w-1 h-1 rounded-full ${style?.dot}`} />
                      {PROJECT_STATUSES.find((s) => s.value === p.status)?.label ?? p.status}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {p.district}, {p.state}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-electric-400 transition-colors line-clamp-2 leading-snug">
                    {p.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-electric-400 font-mono">
                    {formatINR(p.approvedAmount)}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">{progress}% util</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-electric-400 transition-colors mt-0.5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1.5 text-xs rounded border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1.5 text-xs rounded border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ── MPLADS spending panel ────────────────────────────────────────────────

function MPLADSSpending({ mp, totalApproved, totalSpent }: { mp: any; totalApproved: number; totalSpent: number }) {
  const mpladExp = mp.mpladExpenditure ?? 0;
  const mpladEnt = mp.mpladEntitlement ?? 0;
  const mpladRec = mp.mpladFundReceived ?? 0;
  const mpladWorks = mp.mpladWorksCost ?? 0;
  const mpladUtil = mp.mpladUtilization ?? 0;
  const mpladUnspent = mp.mpladUnspentBalance ?? 0;

  // The OpenCity numbers are in Crore; convert to INR
  const expINR = mpladExp * 1_00_00_000;
  const entINR = mpladEnt * 1_00_00_000;
  const recINR = mpladRec * 1_00_00_000;
  const worksINR = mpladWorks * 1_00_00_000;
  const unspentINR = mpladUnspent * 1_00_00_000;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Headline cards */}
      <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Entitlement" value={formatINR(entINR)} sub="GOI allocation" accent="text-electric-400" />
        <KPI label="Received" value={formatINR(recINR)} sub="From Govt of India" accent="text-blue-400" />
        <KPI label="Works Cost" value={formatINR(worksINR)} sub="Sanctioned works" accent="text-saffron-400" />
        <KPI label="Actual Spent" value={formatINR(expINR)} sub="Real expenditure" accent="text-emerald-400" />
      </div>

      {/* Utilization gauge */}
      <div className="lg:col-span-2 glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-electric-400" />
          Utilization Performance
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400">Utilization over Release</span>
              <span className={`font-mono font-bold ${mpladUtil > 100 ? "text-red-400" : mpladUtil > 80 ? "text-emerald-400" : "text-saffron-400"}`}>
                {mpladUtil.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  mpladUtil > 100 ? "bg-red-500" :
                  mpladUtil > 80 ? "bg-emerald-500" :
                  "bg-saffron-500"
                }`}
                style={{ width: `${Math.min(100, mpladUtil)}%` }}
              />
            </div>
            {mpladUtil > 100 && (
              <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Spent more than received — possible advance funding
              </p>
            )}
          </div>

          {/* Visual bar comparison */}
          <div className="pt-3 space-y-2 border-t border-white/5">
            <Bar label="Entitlement" amount={entINR} max={entINR} color="bg-electric-500" />
            <Bar label="Received" amount={recINR} max={entINR} color="bg-blue-500" />
            <Bar label="Works Cost" amount={worksINR} max={entINR} color="bg-saffron-500" />
            <Bar label="Actual Spent" amount={expINR} max={entINR} color="bg-emerald-500" />
            <Bar label="Unspent" amount={unspentINR} max={entINR} color="bg-red-500" />
          </div>
        </div>
      </div>

      {/* Cross-check with project data */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-electric-400" />
          VOJAS Project Records
        </h3>
        <div className="space-y-2">
          <Field label="Projects Recorded" value={String(mp.projects?.length ?? "—")} />
          <Field label="Total Approved" value={formatINR(totalApproved)} />
          <Field label="Total Spent (VOJAS)" value={formatINR(totalSpent)} />
          {totalApproved > 0 && (
            <Field
              label="VOJAS Utilization"
              value={`${((totalSpent / totalApproved) * 100).toFixed(0)}%`}
            />
          )}
        </div>
        {mpladExp > 0 && totalSpent > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-[10px] text-slate-500">
              Government figures: ₹{mpladExp.toFixed(2)} Cr actual expenditure
            </p>
            <p className="text-[10px] text-slate-500">
              VOJAS tracked: {formatINR(totalSpent)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 italic">
              Differences are normal — VOJAS tracks project-level disbursements.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${accent}`}>{value}</p>
      <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
    </div>
  );
}

function Bar({ label, amount, max, color }: { label: string; amount: number; max: number; color: string }) {
  const pct = max > 0 ? (amount / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-0.5">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-slate-400">{formatINR(amount)}</span>
      </div>
      <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
