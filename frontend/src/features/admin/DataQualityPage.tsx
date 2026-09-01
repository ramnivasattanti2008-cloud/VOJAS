/**
 * Data Quality Page — Phase 42: Data Quality Engine
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { DatabaseZap, Scan, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useDataQualityIssues, useDataQualityStats, useScanDataQuality, useResolveDataQuality } from "@/hooks/useDataQuality";
import { LoadingState, ErrorState, PageHeader, Badge } from "@/components/ui";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";

const ISSUE_COLORS: Record<string, string> = {
  MISSING_LOCATION: "bg-red-500/20 text-red-400",
  DUPLICATE: "bg-amber-500/20 text-amber-400",
  STALE_DATA: "bg-orange-500/20 text-orange-400",
  INVALID_VALUE: "bg-purple-500/20 text-purple-400",
  INCONSISTENCY: "bg-blue-500/20 text-blue-400",
  OUTLIER: "bg-pink-500/20 text-pink-400",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-500/20 text-blue-400",
  IN_REVIEW: "bg-amber-500/20 text-amber-400",
  RESOLVED: "bg-emerald-500/20 text-emerald-400",
  DISMISSED: "bg-white/10 text-white/40",
};

export default function DataQualityPage() {
  const [issueType, setIssueType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, error } = useDataQualityIssues({ issueType, status: statusFilter });
  const { data: stats } = useDataQualityStats();
  const scanMutation = useScanDataQuality();
  const resolveMutation = useResolveDataQuality();

  if (isLoading) return <LoadingState message="Analyzing data quality..." />;
  if (error) return <ErrorState message="Failed to load data quality issues" />;

  const issues = Array.isArray(data) ? data : (data?.items ?? []);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      <PageHeader
        title="Data Quality Engine"
        subtitle="Automated detection of missing data, duplicates, and inconsistencies"
        actions={
          <button
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            <Scan className={`w-4 h-4 ${scanMutation.isPending ? "animate-spin" : ""}`} />
            {scanMutation.isPending ? "Scanning..." : "Run Quality Scan"}
          </button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Issues", value: stats.total ?? 0, icon: <AlertTriangle className="w-5 h-5 text-blue-400" />, color: "text-blue-400" },
            { label: "Open", value: stats.open ?? 0, icon: <Clock className="w-5 h-5 text-amber-400" />, color: "text-amber-400" },
            { label: "Resolved", value: stats.resolved ?? 0, icon: <CheckCircle className="w-5 h-5 text-emerald-400" />, color: "text-emerald-400" },
            { label: "Critical", value: stats.critical ?? 0, icon: <AlertTriangle className="w-5 h-5 text-red-500" />, color: "text-red-500" },
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
        <DatabaseZap className="w-4 h-4 text-white/40" />
        <select
          value={issueType}
          onChange={(e) => setIssueType(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Types</option>
          <option value="MISSING_LOCATION">Missing Location</option>
          <option value="DUPLICATE">Duplicate</option>
          <option value="STALE_DATA">Stale Data</option>
          <option value="INVALID_VALUE">Invalid Value</option>
          <option value="INCONSISTENCY">Inconsistency</option>
          <option value="OUTLIER">Outlier</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {issues.map((issue: any) => (
          <motion.div key={issue.id} variants={fadeUp} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <Badge className={ISSUE_COLORS[issue.issueType] ?? "bg-white/10"}>{issue.issueType}</Badge>
                <Badge className={`${STATUS_COLORS[issue.status] ?? ""}`}>{issue.status}</Badge>
                <Badge className={`${issue.severity === "HIGH" ? "bg-red-500/20 text-red-400" : issue.severity === "MEDIUM" ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white/60"}`}>
                  {issue.severity}
                </Badge>
              </div>
              <span className="text-xs text-white/40">
                {new Date(issue.detectedAt).toLocaleString()}
              </span>
            </div>
            <p className="text-white/80 mb-2">{issue.description}</p>
            <div className="flex items-center gap-3 text-xs text-white/50 mb-3">
              <span>Entity: {issue.entityType}</span>
              <span>ID: {issue.entityId?.slice(0, 12)}</span>
            </div>
            {issue.status === "OPEN" && (
              <div className="flex gap-2">
                <button
                  onClick={() => resolveMutation.mutate({ id: issue.id })}
                  disabled={resolveMutation.isPending}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3 h-3" /> Resolve
                </button>
                <button
                  onClick={() => resolveMutation.mutate({ id: issue.id, note: "DISMISSED" })}
                  disabled={resolveMutation.isPending}
                  className="btn-secondary text-xs text-white/50"
                >
                  Dismiss
                </button>
              </div>
            )}
          </motion.div>
        ))}
        {issues.length === 0 && (
          <div className="text-center py-16 text-white/40">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No data quality issues found</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
