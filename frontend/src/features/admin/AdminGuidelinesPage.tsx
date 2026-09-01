/**
 * Admin Guidelines Page — Phase 41: Legislative / Guideline Audit
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { useGuidelines, useGuidelineCategories, useGuidelineStats } from "@/hooks/useGuidelines";
import { LoadingState, ErrorState, PageHeader, Badge, DataTable } from "@/components/ui";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";

export default function AdminGuidelinesPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");

  const { data, isLoading, error } = useGuidelines({ category: categoryFilter, sector: sectorFilter });
  const { data: categories } = useGuidelineCategories();
  const { data: stats } = useGuidelineStats();

  if (isLoading) return <LoadingState message="Loading guidelines..." />;
  if (error) return <ErrorState message="Failed to load guidelines" />;

  const guidelines = Array.isArray(data) ? data : (data?.items ?? []);

  const columns = [
    {
      header: "Guideline",
      accessor: (g: any) => (
        <div>
          <p className="font-medium text-white">{g.title}</p>
          <p className="text-xs text-white/50">{g.referenceNo ? `Ref: ${g.referenceNo}` : g.issuingBody}</p>
        </div>
      ),
    },
    {
      header: "Category",
      accessor: (g: Record<string, any>) => <Badge className="bg-white/10 text-white/70">{g.category}</Badge>,
    },
    {
      header: "Sector",
      accessor: (g: any) => (
        <span className="text-sm text-white/60">{g.sector ?? "All"}</span>
      ),
    },
    {
      header: "Issuing Body",
      accessor: (g: Record<string, any>) => <span className="text-sm text-white/60">{g.issuingBody ?? "—"}</span>,
    },
    {
      header: "URL",
      accessor: (g: any) => (
        g.url ? (
          <a href={g.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline">
            View ↗
          </a>
        ) : <span className="text-white/30 text-sm">—</span>
      ),
    },
    {
      header: "Updated",
      accessor: (g: Record<string, any>) => <span className="text-sm text-white/60">{new Date(g.updatedAt).toLocaleDateString()}</span>,
    },
  ];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      <PageHeader
        title="Legislative Guidelines"
        subtitle="MPLAD rules, financial codes, environmental laws, procurement rules"
        actions={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Guideline
          </button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Guidelines", value: stats.total ?? 0, color: "text-blue-400" },
            { label: "Compliant Checks", value: (stats.compliance?.true ?? 0) + (stats.compliance?.false ?? 0), color: "text-emerald-400" },
            { label: "Non-Compliant", value: stats.compliance?.false ?? 0, color: "text-red-400" },
          ].map((stat, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
              <p className="text-sm text-white/50 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
        <Search className="w-4 h-4 text-white/40" />
        <input
          type="text"
          placeholder="Search guidelines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Categories</option>
          {(categories ?? []).map((cat: string) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Sectors</option>
          <option value="EDUCATION">Education</option>
          <option value="HEALTH">Health</option>
          <option value="ROADS">Roads</option>
          <option value="WATER">Water</option>
        </select>
      </div>

      <DataTable columns={columns} data={guidelines} />
    </motion.div>
  );
}
