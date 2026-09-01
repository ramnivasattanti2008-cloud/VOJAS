/**
 * VOJAS — Related Data Panel for ProjectDetailPage
 *
 * Renders all related data for a project:
 *  - Project locations (geocoded)
 *  - MP (sponsor) info card
 *  - Vendor / contractor info card
 *  - Citizen reports list
 *  - Anomalies list
 *  - Expenditures list with vendor breakdown
 *  - Risk score breakdown
 */

import {
  User,
  Building2,
  FileText,
  AlertTriangle,
  IndianRupee,
  ExternalLink,
  ShieldAlert,
  Activity,
  MapPin,
  Calendar,
  Eye,
  ThumbsUp,
  CheckCircle,
  XCircle,
  Clock,
  Briefcase,
  GraduationCap,
  Satellite,
  type LucideIcon,
} from "lucide-react";
import SatelliteTimeline from "@/components/satellite/SatelliteTimeline";

// ── helpers ────────────────────────────────────────────────────────────────

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

// ── Card primitives ────────────────────────────────────────────────────────

function PanelCard({
  title,
  icon: Icon,
  count,
  accent = "electric",
  children,
  rightSlot,
}: {
  title: string;
  icon: LucideIcon;
  count?: number | string;
  accent?: "electric" | "saffron" | "green" | "red" | "blue";
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const accents: Record<string, string> = {
    electric: "text-electric-400 border-electric-500/20",
    saffron: "text-saffron-400 border-saffron-500/20",
    green: "text-emerald-400 border-emerald-500/20",
    red: "text-red-400 border-red-500/20",
    blue: "text-blue-400 border-blue-500/20",
  };
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className={`px-5 py-3 border-b ${accents[accent]} flex items-center gap-2`}>
        <Icon className="w-4 h-4" />
        <h3 className="text-sm font-semibold text-white flex-1">{title}</h3>
        {count !== undefined && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            accent === "red" ? "bg-red-500/10 text-red-400" :
            accent === "green" ? "bg-emerald-500/10 text-emerald-400" :
            accent === "saffron" ? "bg-saffron-500/10 text-saffron-400" :
            "bg-electric-500/10 text-electric-400"
          }`}>
            {count}
          </span>
        )}
        {rightSlot}
      </div>
      <div className="px-5 py-3">{children}</div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs border-b border-white/[0.03] last:border-0">
      <span className="text-slate-500 uppercase tracking-wider text-[10px] flex-1 min-w-0">{label}</span>
      <span className={`text-slate-200 text-right max-w-[60%] ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

// ── MP Card ───────────────────────────────────────────────────────────────

export function MPInfoCard({ mp }: { mp: any }) {
  if (!mp) {
    return (
      <PanelCard title="Member of Parliament" icon={User} accent="blue">
        <div className="py-4 text-center text-xs text-slate-500">
          <User className="w-7 h-7 mx-auto mb-2 opacity-50" />
          No MP linked to this project
        </div>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      title="Member of Parliament"
      icon={User}
      count={mp.party || ""}
      accent="blue"
      rightSlot={
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(mp.name + " MP " + mp.constituency)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-electric-400 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      }
    >
      <div className="space-y-2">
        <div>
          <p className="text-sm font-semibold text-white">{mp.name}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {mp.house || "Lok Sabha"} · {mp.term || "17th"}
          </p>
        </div>
        <div className="border-t border-white/5 pt-2 space-y-0.5">
          <Field label="Party" value={mp.party} />
          <Field label="Constituency" value={mp.constituency} />
          <Field label="State" value={mp.state} />
          {mp.attendance && <Field label="Attendance" value={mp.attendance} />}
          {mp.termStart && <Field label="Term Start" value={fmtDate(mp.termStart)} />}
          {mp.termEnd && <Field label="Term End" value={fmtDate(mp.termEnd)} />}
        </div>
        <div className="pt-1 text-[10px] text-slate-600">
          This project was sponsored using MPLADS funds allocated to this MP.
        </div>
      </div>
    </PanelCard>
  );
}

// ── Vendor Card ───────────────────────────────────────────────────────────

export function VendorInfoCard({ vendor, expenditures }: { vendor: any; expenditures: any[] }) {
  const expCount = expenditures?.length ?? 0;
  const totalPaid = expenditures
    ? expenditures.filter((e) => e.status === "PAID").reduce((s, e) => s + e.amount, 0)
    : 0;

  if (!vendor && expCount === 0) {
    return (
      <PanelCard title="Vendor / Contractor" icon={Building2} accent="saffron">
        <div className="py-4 text-center text-xs text-slate-500">
          <Building2 className="w-7 h-7 mx-auto mb-2 opacity-50" />
          No vendor linked yet
        </div>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      title="Vendor / Contractor"
      icon={Building2}
      count={expCount ? `${expCount} txns` : ""}
      accent="saffron"
    >
      <div className="space-y-2">
        {vendor ? (
          <div>
            <p className="text-sm font-semibold text-white">{vendor.name}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {[vendor.district, vendor.state].filter(Boolean).join(", ")}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">Free-text contractor only</p>
        )}

        <div className="border-t border-white/5 pt-2 space-y-0.5">
          {vendor?.projectCount !== undefined && (
            <Field label="Total Projects" value={vendor.projectCount} mono />
          )}
          {vendor?.constituencyCount !== undefined && (
            <Field
              label="Constituencies"
              value={
                <span className={vendor.constituencyCount > 5 ? "text-saffron-400 font-semibold" : ""}>
                  {vendor.constituencyCount}
                  {vendor.constituencyCount > 5 && " ⚠"}
                </span>
              }
            />
          )}
          {vendor?.totalPaid !== undefined && (
            <Field label="Lifetime Total Paid" value={formatINR(vendor.totalPaid)} mono />
          )}
          <Field label="This Project" value={formatINR(totalPaid)} mono />
        </div>

        {vendor?.constituencyCount > 5 && (
          <div className="mt-2 px-2 py-1.5 bg-saffron-500/10 border border-saffron-500/20 rounded text-[10px] text-saffron-300 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            <span>Vendor operates across {vendor.constituencyCount} constituencies — unusual concentration.</span>
          </div>
        )}
      </div>
    </PanelCard>
  );
}

// ── Risk Score Card ───────────────────────────────────────────────────────

const RISK_LEVEL_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  LOW:    { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400" },
  MEDIUM: { bg: "bg-saffron-500/10 border-saffron-500/20", text: "text-saffron-400", dot: "bg-saffron-400" },
  HIGH:   { bg: "bg-red-500/10 border-red-500/20", text: "text-red-400", dot: "bg-red-400" },
  CRITICAL: { bg: "bg-red-600/15 border-red-500/30", text: "text-red-400", dot: "bg-red-500" },
};

export function RiskScoreCard({ risk }: { risk: any }) {
  if (!risk) {
    return (
      <PanelCard title="Risk Assessment" icon={ShieldAlert} accent="red">
        <div className="py-4 text-center text-xs text-slate-500">
          <ShieldAlert className="w-7 h-7 mx-auto mb-2 opacity-50" />
          No risk score calculated yet
        </div>
      </PanelCard>
    );
  }

  const score = risk.overallScore ?? 0;
  const level = risk.level ?? (score > 70 ? "HIGH" : score > 40 ? "MEDIUM" : "LOW");
  const style = RISK_LEVEL_STYLES[level] || RISK_LEVEL_STYLES.MEDIUM;
  const components: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: "Financial",  value: risk.financialScore ?? 0,  icon: IndianRupee },
    { label: "Anomaly",    value: risk.anomalyScore ?? 0,   icon: AlertTriangle },
    { label: "Reports",    value: risk.reportScore ?? 0,    icon: FileText },
    { label: "Timeline",   value: risk.timelineScore ?? 0,  icon: Calendar },
  ];

  return (
    <PanelCard title="Risk Assessment" icon={ShieldAlert} accent="red" count={level}>
      <div className="space-y-3">
        {/* Big number */}
        <div className="text-center py-2">
          <p className={`text-3xl font-bold ${style.text}`}>{Math.round(score)}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Overall Risk Score</p>
        </div>

        {/* Component bars */}
        <div className="space-y-1.5">
          {components.map(({ label, value, icon: Icon }) => (
            <div key={label}>
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="text-slate-400 flex items-center gap-1">
                  <Icon className="w-2.5 h-2.5" />
                  {label}
                </span>
                <span className="font-mono text-slate-300">{Math.round(value)}</span>
              </div>
              <div className="h-1 bg-navy-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    value > 70 ? "bg-red-500" :
                    value > 40 ? "bg-saffron-500" :
                    "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, value)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PanelCard>
  );
}

// ── Reports Card ──────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  LOW:      { bg: "bg-slate-500/10 border-slate-500/20", text: "text-slate-400", dot: "bg-slate-400" },
  MEDIUM:   { bg: "bg-saffron-500/10 border-saffron-500/20", text: "text-saffron-400", dot: "bg-saffron-400" },
  HIGH:     { bg: "bg-orange-500/10 border-orange-500/20", text: "text-orange-400", dot: "bg-orange-400" },
  CRITICAL: { bg: "bg-red-500/10 border-red-500/20", text: "text-red-400", dot: "bg-red-400" },
};

const STATUS_ICONS: Record<string, LucideIcon> = {
  SUBMITTED: Clock,
  ACKNOWLEDGED: Eye,
  INVESTIGATING: Activity,
  RESOLVED: CheckCircle,
  REJECTED: XCircle,
};

export function ReportsCard({ reports }: { reports: any[] }) {
  return (
    <PanelCard
      title="Citizen Reports"
      icon={FileText}
      count={reports?.length ?? 0}
      accent="saffron"
    >
      {!reports || reports.length === 0 ? (
        <div className="py-4 text-center text-xs text-slate-500">
          <ThumbsUp className="w-7 h-7 mx-auto mb-2 opacity-50" />
          No citizen reports filed against this project
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {reports.map((r) => {
            const sevStyle = SEVERITY_STYLES[r.severity] || SEVERITY_STYLES.MEDIUM;
            const StatusIcon = STATUS_ICONS[r.status] || Clock;
            return (
              <div key={r.id} className="p-2.5 rounded-lg border border-white/5 bg-navy-800/30 hover:border-white/10 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold text-slate-200 flex-1">{r.title}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider ${sevStyle.bg} ${sevStyle.text}`}>
                    {r.severity}
                  </span>
                </div>
                {r.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{r.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <StatusIcon className="w-2.5 h-2.5" />
                    {r.status}
                  </span>
                  {r.category && <span className="uppercase tracking-wider">{r.category}</span>}
                  {r.createdAt && <span>{fmtDate(r.createdAt)}</span>}
                  {r.attachments?.length > 0 && (
                    <span className="text-electric-400">📎 {r.attachments.length}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PanelCard>
  );
}

// ── Anomalies Card ────────────────────────────────────────────────────────

const ANOMALY_CATEGORY_LABELS: Record<string, string> = {
  DUPLICATE_PROJECT: "Duplicate Project",
  COST_OUTLIER: "Cost Outlier",
  BUDGET_OVERRUN: "Budget Overrun",
  STALLED_PROJECT: "Stalled Project",
  VENDOR_CONCENTRATION: "Vendor Concentration",
  GEOGRAPHIC_ANOMALY: "Geographic Anomaly",
  TIMELINE_INCONSISTENCY: "Timeline Inconsistency",
  REPORT_SPIKE: "Report Spike",
  UNUSUAL_SPENDING: "Unusual Spending",
};

export function AnomaliesCard({ anomalies }: { anomalies: any[] }) {
  return (
    <PanelCard
      title="Detected Anomalies"
      icon={AlertTriangle}
      count={anomalies?.length ?? 0}
      accent="red"
    >
      {!anomalies || anomalies.length === 0 ? (
        <div className="py-4 text-center text-xs text-slate-500">
          <CheckCircle className="w-7 h-7 mx-auto mb-2 text-emerald-400 opacity-80" />
          No anomalies detected — looks clean!
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {anomalies.map((a) => {
            const sevStyle = SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.MEDIUM;
            return (
              <div key={a.id} className={`p-2.5 rounded-lg border ${sevStyle.bg}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold text-slate-200 flex-1">
                    {ANOMALY_CATEGORY_LABELS[a.category] || a.category}
                  </p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider ${sevStyle.bg} ${sevStyle.text}`}>
                    {a.severity}
                  </span>
                </div>
                {a.description && (
                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">{a.description}</p>
                )}
                {a.explanation && (
                  <p className="text-[10px] text-slate-500 mt-1 italic line-clamp-2">🤖 {a.explanation}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    {a.status === "RESOLVED" ? <CheckCircle className="w-2.5 h-2.5 text-emerald-400" /> :
                     a.status === "ACKNOWLEDGED" ? <Eye className="w-2.5 h-2.5 text-electric-400" /> :
                     <Clock className="w-2.5 h-2.5 text-saffron-400" />}
                    {a.status}
                  </span>
                  {a.confidence !== null && a.confidence !== undefined && (
                    <span className="font-mono">conf: {Math.round(a.confidence * 100)}%</span>
                  )}
                  {a.createdAt && <span>{fmtDate(a.createdAt)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PanelCard>
  );
}

// ── Expenditures Card ────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  MATERIAL: Briefcase,
  LABOR: User,
  EQUIPMENT: Activity,
  CONSULTANCY: GraduationCap,
  ADMINISTRATIVE: Building2,
  CONTINGENCY: AlertTriangle,
  OTHER: IndianRupee,
};

const STATUS_PILL: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-saffron-500/10 text-saffron-400 border-saffron-500/20",
  AUTHORIZED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
  REVERSED: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export function ExpendituresCard({
  expenditures,
  summary,
}: {
  expenditures: any[];
  summary: { total: number; paid: number; pending: number; count: number };
}) {
  return (
    <PanelCard
      title="Expenditures"
      icon={IndianRupee}
      count={summary.count}
      accent="green"
    >
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="px-2.5 py-2 rounded-lg bg-navy-800/50 border border-white/5">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">Total</p>
          <p className="text-sm font-bold text-white font-mono">{formatINR(summary.total)}</p>
        </div>
        <div className="px-2.5 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
          <p className="text-[9px] text-emerald-400 uppercase tracking-wider">Paid</p>
          <p className="text-sm font-bold text-emerald-300 font-mono">{formatINR(summary.paid)}</p>
        </div>
        <div className="px-2.5 py-2 rounded-lg bg-saffron-500/5 border border-saffron-500/10">
          <p className="text-[9px] text-saffron-400 uppercase tracking-wider">Pending</p>
          <p className="text-sm font-bold text-saffron-300 font-mono">{formatINR(summary.pending)}</p>
        </div>
      </div>

      {!expenditures || expenditures.length === 0 ? (
        <div className="py-4 text-center text-xs text-slate-500">
          <IndianRupee className="w-7 h-7 mx-auto mb-2 opacity-50" />
          No expenditures recorded
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {expenditures.slice(0, 30).map((e) => {
            const CatIcon = CATEGORY_ICONS[e.category] || IndianRupee;
            const pillClass = STATUS_PILL[e.status] || STATUS_PILL.PENDING;
            return (
              <div key={e.id} className="p-2 rounded border border-white/5 bg-navy-800/30 hover:border-white/10 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <CatIcon className="w-3 h-3 text-slate-500 shrink-0" />
                    <p className="text-xs text-slate-200 truncate">
                      {e.vendorEntity?.name || e.vendor || "Vendor"}
                    </p>
                  </div>
                  <p className="text-xs font-mono font-semibold text-white shrink-0">
                    {formatINR(e.amount)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="uppercase tracking-wider">{e.category}</span>
                  <span>·</span>
                  <span className={`px-1 py-0.5 rounded border ${pillClass} text-[9px] font-semibold uppercase`}>
                    {e.status}
                  </span>
                  {e.paidOn && <span className="ml-auto">{fmtDate(e.paidOn)}</span>}
                </div>
                {e.description && (
                  <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-1 italic">
                    {e.description}
                  </p>
                )}
              </div>
            );
          })}
          {expenditures.length > 30 && (
            <p className="text-[10px] text-slate-600 text-center pt-1">
              +{expenditures.length - 30} more transactions
            </p>
          )}
        </div>
      )}
    </PanelCard>
  );
}

// ── Documents Card ────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  WORK_PROPOSAL: "Work Proposal",
  ESTIMATE: "Cost Estimate",
  AGREEMENT: "Contract Agreement",
  INVOICE: "Invoice",
  PROGRESS_PHOTO: "Progress Photo",
  COMPLETION_CERTIFICATE: "Completion Certificate",
  INSPECTION_REPORT: "Inspection Report",
  OTHER: "Other Document",
};

export function DocumentsCard({ documents }: { documents: any[] }) {
  return (
    <PanelCard
      title="Documents & Evidence"
      icon={FileText}
      count={documents?.length ?? 0}
      accent="blue"
    >
      {!documents || documents.length === 0 ? (
        <div className="py-4 text-center text-xs text-slate-500">
          <FileText className="w-7 h-7 mx-auto mb-2 opacity-50" />
          No documents uploaded
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {documents.map((d) => (
            <a
              key={d.id}
              href={d.url || "#"}
              target={d.url ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex items-start gap-2 p-2 rounded border border-white/5 bg-navy-800/30 hover:border-electric-500/30 transition-colors group"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 group-hover:text-electric-400 truncate">
                  {d.originalName || d.title || d.filename || DOC_TYPE_LABELS[d.type] || d.type}
                </p>
                <p className="text-[10px] text-slate-500">
                  {d.mimeType} · {d.size ? `${(d.size / 1024).toFixed(1)} KB` : ""}
                </p>
              </div>
              {d.url && <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </a>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

// ── Master panel — composes all the above ─────────────────────────────────

// ── Location Card ──────────────────────────────────────────────────────────

export function LocationCard({ locations }: { locations: any[] }) {
  const primary = locations.find((l) => l.isPrimary) ?? locations[0];

  return (
    <PanelCard
      title="Project Locations"
      icon={MapPin}
      count={locations.length > 1 ? `${locations.length} sites` : "1 site"}
      accent="electric"
    >
      {!primary ? (
        <div className="py-3 text-center text-xs text-slate-500">
          <MapPin className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
          No location data recorded
        </div>
      ) : (
        <div className="space-y-2">
          {/* Primary location — prominent */}
          {primary && (
            <div className="bg-electric-500/5 border border-electric-500/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-electric-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-electric-400 uppercase tracking-wider">Primary Site</span>
              </div>
              <div className="font-medium text-sm text-white mb-0.5">{primary.label ?? primary.address ?? "Project Site"}</div>
              <div className="font-mono text-[11px] text-slate-400">
                {primary.latitude?.toFixed(5)}, {primary.longitude?.toFixed(5)}
              </div>
              {primary.landmark && (
                <div className="text-[11px] text-slate-500 mt-1">Landmark: {primary.landmark}</div>
              )}
            </div>
          )}

          {/* Other sites */}
          {locations.filter((l) => !l.isPrimary).map((loc, i) => (
            <div key={loc.id ?? i} className="border border-white/5 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Site {i + 2}</span>
              </div>
              <div className="font-medium text-sm text-slate-300 mb-0.5">{loc.label ?? loc.address ?? "Site"}</div>
              <div className="font-mono text-[11px] text-slate-500">
                {loc.latitude?.toFixed(5)}, {loc.longitude?.toFixed(5)}
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

export function RelatedDataPanel({ detail, projectId }: { detail: any; projectId: string }) {
  if (!detail) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-4">
        <LocationCard locations={detail.locations ?? []} />
        <MPInfoCard mp={detail.mp} />
      </div>
      <div className="space-y-4">
        <VendorInfoCard vendor={detail.vendor} expenditures={detail.expenditures} />
        <RiskScoreCard risk={detail.risk} />
      </div>
      <div className="md:col-span-2 space-y-4">
        <SatelliteCard projectId={projectId} />
        <ExpendituresCard
          expenditures={detail.expenditures}
          summary={detail.expenditureSummary}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReportsCard reports={detail.reports} />
          <AnomaliesCard anomalies={detail.anomalies} />
        </div>
        <DocumentsCard documents={detail.documents} />
      </div>
    </div>
  );
}

function SatelliteCard({ projectId }: { projectId: string }) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
        <Satellite className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-white">Satellite Imagery</h3>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-auto">Weekly Captures</span>
      </div>
      <div className="p-4">
        <SatelliteTimeline projectId={projectId} compact />
      </div>
    </div>
  );
}
