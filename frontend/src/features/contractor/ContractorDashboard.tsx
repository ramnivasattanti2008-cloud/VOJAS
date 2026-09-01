/**
 * Contractor Dashboard — Phase 27-35: Contractor Portal
 */
import { motion } from "framer-motion";
import {
  Building2, FileText, AlertTriangle, DollarSign, Clock, CheckCircle,
  Plus, Upload, Wrench
} from "lucide-react";
import { useContractorDashboard, useContractorProfile } from "@/hooks/useContractor";
import { LoadingState, ErrorState, Badge } from "@/components/ui";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";

export default function ContractorDashboard() {
  const { data: profile } = useContractorProfile();
  const { data: dashboard, isLoading: dashLoading, error } = useContractorDashboard();

  if (dashLoading) return <LoadingState message="Loading contractor dashboard..." />;
  if (error) return <ErrorState message="Failed to load dashboard" />;

  const d = dashboard ?? {};

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contractor Dashboard</h1>
          <p className="text-white/50">{profile?.companyName ?? "Contractor Portal"}</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Milestone
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload Document
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active Projects", value: d.activeProjects ?? 0, icon: <FileText className="w-5 h-5 text-blue-400" />, color: "text-blue-400" },
          { label: "Completed Projects", value: d.completedProjects ?? 0, icon: <CheckCircle className="w-5 h-5 text-emerald-400" />, color: "text-emerald-400" },
          { label: "Pending Payments", value: d.pendingPayments ?? 0, icon: <DollarSign className="w-5 h-5 text-amber-400" />, color: "text-amber-400" },
          { label: "Open Defects", value: d.openDefects ?? 0, icon: <AlertTriangle className="w-5 h-5 text-red-400" />, color: "text-red-400" },
        ].map((stat, i) => (
          <motion.div key={i} variants={fadeUp} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              {stat.icon}
              <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
            </div>
            <p className="text-sm text-white/50">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Projects List */}
        <motion.div variants={fadeUp} className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" /> My Projects
          </h3>
          <div className="space-y-3">
            {(d.projects ?? []).slice(0, 5).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium text-white">{p.contractNo ?? `Project ${p.id.slice(0, 8)}`}</p>
                  <p className="text-xs text-white/50">
                    ₹{(p.contractAmount ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={`${p.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/60"}`}>
                    {p.status}
                  </Badge>
                  <p className="text-xs text-white/40 mt-1">{p.completion ?? 0}% done</p>
                </div>
              </div>
            ))}
            {(!d.projects || d.projects.length === 0) && (
              <p className="text-white/40 text-sm text-center py-8">No active projects</p>
            )}
          </div>
        </motion.div>

        {/* Pending Milestones */}
        <motion.div variants={fadeUp} className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" /> Milestones
          </h3>
          <div className="space-y-3">
            {(d.milestones ?? []).slice(0, 5).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium text-white">{m.title}</p>
                  <p className="text-xs text-white/50">
                    {m.dueDate ? `Due: ${new Date(m.dueDate).toLocaleDateString()}` : "No due date"}
                  </p>
                </div>
                <Badge className={`${m.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                  {m.status}
                </Badge>
              </div>
            ))}
            {(!d.milestones || d.milestones.length === 0) && (
              <p className="text-white/40 text-sm text-center py-8">No milestones</p>
            )}
          </div>
        </motion.div>

        {/* Work Diary */}
        <motion.div variants={fadeUp} className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-purple-400" /> Recent Work Diary
          </h3>
          <div className="space-y-3">
            {(d.recentDiaries ?? []).slice(0, 5).map((diary: any) => (
              <div key={diary.id} className="p-3 bg-white/5 rounded-lg">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-white">
                    {new Date(diary.date).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-white/50">{diary.workersPresent ?? 0} workers</span>
                </div>
                <p className="text-sm text-white/60">{diary.workDone}</p>
              </div>
            ))}
            {(!d.recentDiaries || d.recentDiaries.length === 0) && (
              <p className="text-white/40 text-sm text-center py-8">No work diary entries</p>
            )}
          </div>
        </motion.div>

        {/* Open Defects */}
        <motion.div variants={fadeUp} className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" /> Open Defects
          </h3>
          <div className="space-y-3">
            {(d.defects ?? []).slice(0, 5).map((defect: any) => (
              <div key={defect.id} className="p-3 bg-white/5 rounded-lg">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-white">{defect.title}</span>
                  <Badge className={`${defect.severity === "CRITICAL" ? "bg-red-500/20 text-red-400" : defect.severity === "HIGH" ? "bg-orange-500/20 text-orange-400" : "bg-white/10 text-white/60"}`}>
                    {defect.severity}
                  </Badge>
                </div>
                <p className="text-xs text-white/60">{defect.description?.slice(0, 80)}...</p>
              </div>
            ))}
            {(!d.defects || d.defects.length === 0) && (
              <p className="text-white/40 text-sm text-center py-8">No open defects</p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
