/**
 * Cases Page — Phase 21: Case Management
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, AlertCircle, Scale, ShieldCheck, Clock, CheckCircle } from "lucide-react";
import { useCases, useCaseStats } from "@/hooks/useCases";
import { LoadingState, ErrorState, PageHeader, Badge, DataTable } from "@/components/ui";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-500/20 text-blue-400",
  INVESTIGATING: "bg-amber-500/20 text-amber-400",
  ESCALATED: "bg-red-500/20 text-red-400",
  CLOSED: "bg-emerald-500/20 text-emerald-400",
  REOPENED: "bg-orange-500/20 text-orange-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-white/10 text-white/70",
  MEDIUM: "bg-amber-500/20 text-amber-400",
  HIGH: "bg-orange-500/20 text-orange-400",
  CRITICAL: "bg-red-500/20 text-red-400",
};

const TYPE_ICONS: Record<string, string> = {
  FRAUD: "💰",
  NEGLIGENCE: "⚠️",
  CORRUPTION: "🪝",
  SAFETY: "🚨",
  ENVIRONMENTAL: "🌿",
  FINANCIAL: "💳",
  OTHER: "📋",
};

export default function CasesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data, isLoading, error } = useCases({ status: statusFilter, priority: priorityFilter, type: typeFilter });
  const { data: stats } = useCaseStats();

  if (isLoading) return <LoadingState message="Loading cases..." />;
  if (error) return <ErrorState message="Failed to load cases" onRetry={() => window.location.reload()} />;

  const cases = Array.isArray(data) ? data : (data?.items ?? []);

  const columns = [
    {
      header: "Case",
      accessor: (c: any) => (
        <div className="flex items-center gap-3">
          <span className="text-xl">{TYPE_ICONS[c.type] ?? "📋"}</span>
          <div>
            <p className="font-medium text-white">{c.title}</p>
            <p className="text-xs text-white/50">{c.district}, {c.state}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Type",
      accessor: (c: Record<string, any>) => <Badge className="bg-white/10 text-white/70">{c.type}</Badge>,
    },
    {
      header: "Priority",
      accessor: (c: Record<string, any>) => <Badge className={PRIORITY_COLORS[c.priority] ?? ""}>{c.priority}</Badge>,
    },
    {
      header: "Status",
      accessor: (c: Record<string, any>) => <Badge className={STATUS_COLORS[c.status] ?? ""}>{c.status}</Badge>,
    },
    {
      header: "Assigned To",
      accessor: (c: Record<string, any>) => <span className="text-sm text-white/60">{c.assignedTo ?? "Unassigned"}</span>,
    },
    {
      header: "Created",
      accessor: (c: any) => (
        <span className="text-sm text-white/60">{new Date(c.createdAt).toLocaleDateString()}</span>
      ),
    },
  ];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      <PageHeader
        title="Case Management"
        subtitle={`${cases.length} cases`}
        actions={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Case
          </button>
        }
      />

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Open", value: stats.open ?? 0, icon: <AlertCircle className="w-5 h-5 text-blue-400" />, color: "text-blue-400" },
            { label: "Investigating", value: stats.investigating ?? 0, icon: <Clock className="w-5 h-5 text-amber-400" />, color: "text-amber-400" },
            { label: "Escalated", value: stats.escalated ?? 0, icon: <Scale className="w-5 h-5 text-red-400" />, color: "text-red-400" },
            { label: "Closed", value: stats.closed ?? 0, icon: <CheckCircle className="w-5 h-5 text-emerald-400" />, color: "text-emerald-400" },
            { label: "Critical", value: stats.critical ?? 0, icon: <ShieldCheck className="w-5 h-5 text-red-500" />, color: "text-red-500" },
          ].map((stat, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                {stat.icon}
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
              </div>
              <p className="text-sm text-white/50">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
        <Search className="w-4 h-4 text-white/40" />
        <input
          type="text"
          placeholder="Search cases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white">
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="ESCALATED">Escalated</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white">
          <option value="">All Priority</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white">
          <option value="">All Types</option>
          <option value="FRAUD">Fraud</option>
          <option value="NEGLIGENCE">Negligence</option>
          <option value="CORRUPTION">Corruption</option>
          <option value="SAFETY">Safety</option>
          <option value="ENVIRONMENTAL">Environmental</option>
          <option value="FINANCIAL">Financial</option>
        </select>
      </div>

      <DataTable columns={columns} data={cases} onRowClick={(c) => console.log("Case:", c.id)} />
    </motion.div>
  );
}
