import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { financialApi } from "@/services/financial-api";
import { ApiError } from "@/services/api";
import type { ProjectFinancials } from "@/types/financial-types";
import type { Project, UserRole } from "@/types";
import {
  type Expenditure,
  type ExpenditureCategory,
  type PaymentStatus,
  EXPENDITURE_CATEGORIES,
  PAYMENT_STATUSES,
  getCategoryStyle,
  getCategoryLabel,
  getPaymentStatusStyle,
  getPaymentStatusLabel,
} from "@/types/financial-types";
import { LoadingState, ErrorState, EmptyState, InlineToast } from "@/components/ui";
import {
  IndianRupee,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  X,
  Calendar,
  FileText,
  Receipt,
  Hash,
  ArrowRight,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

function formatINRFull(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Props ────────────────────────────────────────────────────────────────────

interface FinancialTabProps {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function FinancialTab({ project, userRole, onProjectUpdate }: FinancialTabProps) {
  const [summary, setSummary] = useState<ProjectFinancials | null>(null);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | "ALL">("ALL");
  const [filterCategory, setFilterCategory] = useState<ExpenditureCategory | "ALL">("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const canEdit = userRole === "ADMIN" || userRole === "OFFICER";
  const canDelete = userRole === "ADMIN";

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, listRes] = await Promise.all([
        financialApi.projectFinancials(project.id),
        financialApi.list(project.id),
      ]);
      setSummary(summaryData);
      setExpenditures(listRes.items);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load financial data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [project.id]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return expenditures.filter((e) => {
      if (filterStatus !== "ALL" && e.status !== filterStatus) return false;
      if (filterCategory !== "ALL" && e.category !== filterCategory) return false;
      return true;
    });
  }, [expenditures, filterStatus, filterCategory]);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this expenditure entry? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await financialApi.remove(id);
      await loadAll();
      onProjectUpdate();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Delete failed";
      setToast(`Delete failed: ${msg}`);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Loading financial data..." />;
  if (error)   return <ErrorState message={error} onRetry={loadAll} />;
  if (!summary) return null;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm">
          <InlineToast message={toast} type="error" onDismiss={() => setToast(null)} />
        </div>
      )}

      {/* Budget summary cards */}
      <BudgetSummaryCards summary={summary} />

      {/* Fund flow pipeline (Phase 7) */}
      <FundFlowChart summary={summary} />

      {/* Category breakdown + Add action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CategoryBreakdown summary={summary} />

        <div className="glass rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Expenditure Ledger</h3>
            {canEdit && (
              <button
                onClick={() => setShowAddForm((s) => !s)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-electric-500 to-electric-600 text-white text-xs font-semibold hover:from-electric-600 hover:to-electric-700 transition-all shadow-md shadow-electric-500/20"
              >
                {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showAddForm ? "Cancel" : "Add Expenditure"}
              </button>
            )}
          </div>

          {showAddForm && canEdit && (
            <AddExpenditureForm
              projectId={project.id}
              approvedAmount={project.approvedAmount}
              currentCommitted={summary.committed}
              onCreated={() => { setShowAddForm(false); loadAll(); onProjectUpdate(); }}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mt-4 mb-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as PaymentStatus | "ALL")}
              aria-label="Filter expenditures by payment status"
              className="text-xs bg-navy-800 border border-white/10 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-electric-500"
            >
              <option value="ALL">All statuses</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as ExpenditureCategory | "ALL")}
              aria-label="Filter expenditures by category"
              className="text-xs bg-navy-800 border border-white/10 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-electric-500"
            >
              <option value="ALL">All categories</option>
              {EXPENDITURE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <div className="text-xs text-slate-500 self-center ml-auto" aria-live="polite">
              {filtered.length} of {expenditures.length} entries
            </div>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-7 h-7" />}
              title={expenditures.length === 0 ? "No expenditures recorded" : "No matching entries"}
              description={
                expenditures.length === 0
                  ? "Track individual disbursements to monitor fund utilization."
                  : "Adjust the filters above to see entries."
              }
            />
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <caption className="sr-only">Expenditure ledger — date, description, category, vendor, amount, status, and actions</caption>
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-white/5">
                    <th scope="col" className="text-left px-2 py-2 font-semibold">Date</th>
                    <th scope="col" className="text-left px-2 py-2 font-semibold">Description</th>
                    <th scope="col" className="text-left px-2 py-2 font-semibold">Category</th>
                    <th scope="col" className="text-left px-2 py-2 font-semibold">Vendor</th>
                    <th scope="col" className="text-right px-2 py-2 font-semibold">Amount</th>
                    <th scope="col" className="text-left px-2 py-2 font-semibold">Status</th>
                    {canDelete && <th scope="col" className="text-right px-2 py-2 font-semibold"></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((exp) => (
                    <tr key={exp.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                      <td className="px-2 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                        {fmtDate(exp.paidOn ?? exp.createdAt)}
                      </td>
                      <td className="px-2 py-2.5">
                        <p className="text-slate-200 text-xs leading-snug">{exp.description}</p>
                        {exp.invoiceNo && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            <Hash className="w-2.5 h-2.5 inline mr-0.5" />{exp.invoiceNo}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getCategoryStyle(exp.category)}`}>
                          {getCategoryLabel(exp.category)}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-slate-400 text-xs">
                        {exp.vendor && exp.vendor !== "—" ? exp.vendor : "—"}
                      </td>
                      <td className="px-2 py-2.5 text-right text-saffron-400 font-bold text-xs whitespace-nowrap">
                        {formatINRFull(exp.amount)}
                      </td>
                      <td className="px-2 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getPaymentStatusStyle(exp.status)}`}>
                          {getPaymentStatusLabel(exp.status)}
                        </span>
                      </td>
                      {canDelete && (
                        <td className="px-2 py-2.5 text-right">
                          <button
                            onClick={() => onDelete(exp.id)}
                            disabled={deletingId === exp.id}
                            className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            title="Delete"
                            aria-label={`Delete expenditure: ${exp.description}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

// ── Fund Flow Visualization (Phase 7 — Sankey-style) ────────────────────────
//
// Renders the fund lifecycle as an SVG flow diagram:
//   Sanctioned ──┬──> Authorized ──> Spent
//                └──> Pending
//
// Node heights are proportional to amounts. Ribbons are smooth Bezier curves
// whose thickness matches the proportion of money flowing along that path.

const COLORS = {
  sanctioned: "#3b82f6",
  authorized: "#6366f1",
  pending:    "#f59e0b",
  spent:      "#10b981",
};

function FundFlowChart({ summary }: { summary: ProjectFinancials }) {
  const { approved, authorized, pending, spent, remaining } = summary;

  // Layout constants (viewBox units, scales perfectly)
  const W = 720;
  const H = 220;
  const PAD_X = 16;
  const NODE_W = 18;

  // Three columns
  const colX = [PAD_X, (W - NODE_W) / 2, W - PAD_X - NODE_W];
  // Pad top/bottom for labels
  const TOP_PAD = 30;
  const BOTTOM_PAD = 16;
  const drawH = H - TOP_PAD - BOTTOM_PAD;

  // Max value (for height proportional)
  const maxV = Math.max(approved, authorized + pending, spent, 1);

  // Helper: node height proportional to amount
  const hOf = (amt: number) => Math.max(6, (Math.abs(amt) / maxV) * drawH);

  // Y positions
  // Col 0: Sanctioned node (full)
  const hSanctioned = hOf(approved);
  const ySanctioned = TOP_PAD + (drawH - hSanctioned) / 2;

  // Col 1: Authorized on top, Pending below (small gap)
  const hAuth = hOf(authorized);
  const hPend = hOf(pending);
  const gap1 = 8;
  const hTotalCol1 = hAuth + hPend + gap1;
  const yCol1Start = TOP_PAD + (drawH - hTotalCol1) / 2;
  const yAuth = yCol1Start;
  const yPend = yCol1Start + hAuth + gap1;

  // Col 2: Spent node
  const hSpent = hOf(spent);
  const ySpent = TOP_PAD + (drawH - hSpent) / 2;

  // Ribbon endpoints (Y offsets within the source node, by proportion)
  // For sanctioned → authorized: top portion of sanctioned
  const sancAuthRatio = approved > 0 ? authorized / approved : 0;
  const sancPendRatio = approved > 0 ? pending / approved : 0;
  const ySancAuthTop = ySanctioned;
  const ySancAuthBot = ySanctioned + hSanctioned * sancAuthRatio;
  const ySancPendTop = ySancAuthBot;
  const ySancPendBot = ySancAuthBot + hSanctioned * sancPendRatio;

  // For authorized → spent: top portion of authorized
  const authSpentRatio = authorized > 0 ? spent / authorized : 0;
  const yAuthSpentTop = yAuth;
  const yAuthSpentBot = yAuth + hAuth * Math.min(1, authSpentRatio);

  // Ribbon path helper
  const ribbon = (x1: number, y1: number, x2: number, y2: number, h: number) => {
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1}
            C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}
            L ${x2} ${y2 + h}
            C ${midX} ${y2 + h}, ${midX} ${y1 + h}, ${x1} ${y1 + h} Z`;
  };

  const xSancRight = colX[0] + NODE_W;
  const xMidLeft   = colX[1];
  const xMidRight  = colX[1] + NODE_W;
  const xSpentLeft = colX[2];

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-electric-400" />
          Fund Flow
        </h3>
        <span className="text-[10px] text-slate-600 font-mono">Sanctioned: {formatINR(approved)}</span>
      </div>

      <div className="relative w-full" style={{ height: H }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
          role="img"
          aria-label="Fund flow diagram — sanctioned, authorized, pending, and spent amounts"
        >
          <defs>
            <linearGradient id="ribbon-sanc-auth" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={COLORS.sanctioned} stopOpacity="0.55" />
              <stop offset="100%" stopColor={COLORS.authorized} stopOpacity="0.55" />
            </linearGradient>
            <linearGradient id="ribbon-sanc-pend" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={COLORS.sanctioned} stopOpacity="0.4" />
              <stop offset="100%" stopColor={COLORS.pending}    stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="ribbon-auth-spent" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={COLORS.authorized} stopOpacity="0.55" />
              <stop offset="100%" stopColor={COLORS.spent}     stopOpacity="0.55" />
            </linearGradient>
          </defs>

          {/* Sanctioned → Authorized ribbon */}
          {authorized > 0 && ySancAuthBot > ySancAuthTop && (
            <path
              d={ribbon(xSancRight, ySancAuthTop, xMidLeft, yAuth, ySancAuthBot - ySancAuthTop)}
              fill="url(#ribbon-sanc-auth)"
            />
          )}
          {/* Sanctioned → Pending ribbon */}
          {pending > 0 && ySancPendBot > ySancPendTop && (
            <path
              d={ribbon(xSancRight, ySancPendTop, xMidLeft, yPend, ySancPendBot - ySancPendTop)}
              fill="url(#ribbon-sanc-pend)"
            />
          )}
          {/* Authorized → Spent ribbon */}
          {spent > 0 && authorized > 0 && yAuthSpentBot > yAuthSpentTop && (
            <path
              d={ribbon(xMidRight, yAuthSpentTop, xSpentLeft, ySpent, yAuthSpentBot - yAuthSpentTop)}
              fill="url(#ribbon-auth-spent)"
            />
          )}

          {/* Nodes */}
          <rect x={colX[0]} y={ySanctioned} width={NODE_W} height={hSanctioned} rx={3} fill={COLORS.sanctioned} />
          <rect x={colX[1]} y={yAuth}       width={NODE_W} height={hAuth}       rx={3} fill={COLORS.authorized} />
          <rect x={colX[1]} y={yPend}       width={NODE_W} height={hPend}       rx={3} fill={COLORS.pending} />
          <rect x={colX[2]} y={ySpent}      width={NODE_W} height={hSpent}      rx={3} fill={COLORS.spent} />

          {/* Labels (above the node for sanctioned, above for others) */}
          {[
            { x: colX[0] + NODE_W / 2, y: ySanctioned, label: "Sanctioned", amount: approved },
            { x: colX[1] + NODE_W / 2, y: yAuth,       label: "Authorized", amount: authorized },
            { x: colX[1] + NODE_W / 2, y: yPend,       label: "Pending",    amount: pending },
            { x: colX[2] + NODE_W / 2, y: ySpent,      label: "Spent",      amount: spent },
          ].map((l) => {
            // Place label above node (or below if too close to top)
            const labelY = l.y < 30 ? l.y + hOf(l.amount) + 14 : l.y - 8;
            return (
              <g key={l.label}>
                <text
                  x={l.x}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill="#cbd5e1"
                  style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
                >
                  {l.label}
                </text>
                <text
                  x={l.x}
                  y={labelY + 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#f1f5f9"
                >
                  {formatINR(l.amount)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend + Utilization bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        <div className="md:col-span-2 space-y-1.5">
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Utilization (Spent / Sanctioned)</span>
            <span className="font-mono">{summary.utilization.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-navy-800 rounded-full overflow-hidden relative">
            <motion.div
              className="h-full bg-gradient-to-r from-electric-500 via-saffron-500 to-green-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(summary.utilization, 100)}%` }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            />
            {summary.utilization > 100 && (
              <div
                className="absolute top-0 right-0 h-full bg-red-500/80"
                style={{ width: `${Math.min(summary.utilization - 100, 100)}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-[9px] text-slate-600 font-mono">
            <span>₹0</span>
            <span>₹{formatINR(approved)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 text-[10px] flex-wrap">
          <LegendDot color={COLORS.sanctioned} label="Sanctioned" />
          <LegendDot color={COLORS.authorized} label="Authorized" />
          <LegendDot color={COLORS.pending}    label="Pending" />
          <LegendDot color={COLORS.spent}      label="Spent" />
        </div>
      </div>

      {/* Over-budget warning */}
      {summary.overrun && (
        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <p className="text-[11px] text-red-300">
            Budget overrun detected. Total expenditure exceeds approved budget by{" "}
            {formatINR(Math.abs(remaining))}.
          </p>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-400">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function BudgetSummaryCards({ summary }: { summary: ProjectFinancials }) {
  const cards = [
    {
      label: "Approved",
      value: formatINR(summary.approved),
      detail: `Sanctioned budget`,
      icon: Wallet,
      color: "text-electric-400",
      bg: "bg-electric-500/10",
    },
    {
      label: "Spent (Paid)",
      value: formatINR(summary.spent),
      detail: `${summary.utilization}% utilized`,
      icon: TrendingUp,
      color: "text-saffron-400",
      bg: "bg-saffron-500/10",
    },
    {
      label: "Authorized",
      value: formatINR(summary.authorized),
      detail: "Committed, awaiting payout",
      icon: CheckCircle2,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Pending",
      value: formatINR(summary.pending),
      detail: "Tendered / under review",
      icon: Calendar,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    {
      label: "Balance",
      value: formatINR(summary.remaining),
      detail: summary.overrun ? "⚠ Over budget" : "Available for use",
      icon: IndianRupee,
      color: summary.overrun ? "text-red-400" : "text-green-400",
      bg: summary.overrun ? "bg-red-500/10" : "bg-green-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map(({ label, value, detail, icon: Icon, color, bg }) => (
        <div key={label} className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              {label}
            </span>
          </div>
          <p className={`text-lg font-bold ${color}`}>{value}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{detail}</p>
        </div>
      ))}
    </div>
  );
}

function CategoryBreakdown({ summary }: { summary: ProjectFinancials }) {
  const catEntries = Object.entries(summary.byCategory) as [string, { count: number; total: number }][];
  const total = catEntries.reduce((a, [, d]) => a + d.total, 0);
  if (total === 0) {
    return (
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">By Category</h3>
        <p className="text-xs text-slate-500">No expenditures to break down yet.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-3">By Category</h3>
      <div className="space-y-2.5">
        {catEntries
          .sort((a, b) => b[1].total - a[1].total)
          .map(([cat, data]) => {
            const pct = (data.total / total) * 100;
            const style = getCategoryStyle(cat as ExpenditureCategory);
            return (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${style}`}>
                    {getCategoryLabel(cat as ExpenditureCategory)}
                  </span>
                  <span className="text-slate-300 font-bold">
                    {formatINR(data.total)}
                  </span>
                </div>
                <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-electric-500 to-saffron-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">{pct.toFixed(1)}% of disbursed</p>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ── Add Form ─────────────────────────────────────────────────────────────────

function AddExpenditureForm({
  projectId,
  approvedAmount,
  currentCommitted,
  onCreated,
  onCancel,
}: {
  projectId: string;
  approvedAmount: number;
  currentCommitted: number;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenditureCategory>("MATERIAL");
  const [description, setDescription] = useState("");
  const [vendor, setVendor] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("PENDING");
  const [paidOn, setPaidOn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const numAmount = parseFloat(amount) || 0;
  const wouldExceed = numAmount > 0 && (currentCommitted + numAmount) > approvedAmount;
  const wouldExceedAmt = Math.max(0, (currentCommitted + numAmount) - approvedAmount);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      setErrMsg("Amount must be greater than zero");
      return;
    }
    if (description.trim().length === 0) {
      setErrMsg("Description is required");
      return;
    }
    if (wouldExceed) {
      setErrMsg(`Amount exceeds remaining budget by ${formatINRFull(wouldExceedAmt)}`);
      return;
    }

    setSubmitting(true);
    setErrMsg(null);
    try {
      await financialApi.create({
        projectId,
        amount: numAmount,
        category,
        description: description.trim(),
        vendor: vendor.trim() || undefined,
        invoiceNo: invoiceNo.trim() || undefined,
        paidOn: paidOn || undefined,
      });
      onCreated();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create expenditure";
      setErrMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Add new expenditure"
      className="rounded-lg border border-electric-500/20 bg-electric-500/[0.03] p-4 space-y-3 mb-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Amount */}
        <div>
          <label htmlFor="exp-amount" className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
            Amount (₹) <span className="text-red-400">*</span>
          </label>
          <input
            id="exp-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="1"
            placeholder="0"
            className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-electric-500"
          />
          {wouldExceed && (
            <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1" role="alert">
              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
              Exceeds budget by {formatINRFull(wouldExceedAmt)}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="exp-category" className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
            Category <span className="text-red-400">*</span>
          </label>
          <select
            id="exp-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenditureCategory)}
            className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-electric-500"
          >
            {EXPENDITURE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="exp-description" className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
          Description <span className="text-red-400">*</span>
        </label>
        <input
          id="exp-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          placeholder="e.g. Cement supply, 50 bags"
          className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-electric-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label htmlFor="exp-vendor" className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
            Vendor
          </label>
          <input
            id="exp-vendor"
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Supplier name"
            className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-electric-500"
          />
        </div>
        <div>
          <label htmlFor="exp-invoice" className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
            Invoice #
          </label>
          <input
            id="exp-invoice"
            type="text"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            placeholder="INV-2025-001"
            className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-electric-500"
          />
        </div>
        <div>
          <label htmlFor="exp-status" className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
            Status
          </label>
          <select
            id="exp-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PaymentStatus)}
            className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-electric-500"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {status === "PAID" && (
        <div>
          <label htmlFor="exp-paid-on" className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
            Paid On
          </label>
          <input
            id="exp-paid-on"
            type="date"
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
            className="w-full md:w-1/3 bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-electric-500"
          />
        </div>
      )}

      {errMsg && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" role="alert">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{errMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || wouldExceed || numAmount <= 0}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-electric-500 to-electric-600 text-white text-xs font-semibold hover:from-electric-600 hover:to-electric-700 transition-all shadow-md shadow-electric-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="w-3.5 h-3.5" />
          {submitting ? "Saving..." : "Record Expenditure"}
        </button>
      </div>
    </form>
  );
}
