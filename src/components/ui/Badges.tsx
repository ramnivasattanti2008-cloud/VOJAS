import React from 'react';
import { EpistemicSource, RiskLevel, AlertSeverity, ProjectStatus, ReportStatus } from '../../types/civicshield';
import { Satellite, Brain, Users, FileCheck, CheckCircle2, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

interface EpistemicBadgeProps {
  source: EpistemicSource;
  size?: 'sm' | 'md';
  className?: string;
}

export const EpistemicBadge: React.FC<EpistemicBadgeProps> = ({ source, size = 'sm', className = '' }) => {
  const configs: Record<EpistemicSource, { label: string; icon: any; style: string }> = {
    SATELLITE_OBSERVATION: {
      label: 'SATELLITE OBSERVATION',
      icon: Satellite,
      style: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30'
    },
    AI_INFERENCE: {
      label: 'AI INFERENCE',
      icon: Brain,
      style: 'bg-purple-950/60 text-purple-300 border-purple-500/30'
    },
    CITIZEN_REPORT: {
      label: 'CITIZEN REPORT',
      icon: Users,
      style: 'bg-amber-950/60 text-amber-300 border-amber-500/30'
    },
    GOVERNMENT_DATA: {
      label: 'GOVERNMENT DATA',
      icon: FileCheck,
      style: 'bg-blue-950/60 text-blue-300 border-blue-500/30'
    },
    VERIFIED: {
      label: 'GROUND VERIFIED',
      icon: CheckCircle2,
      style: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
    }
  };

  const config = configs[source] || configs.SATELLITE_OBSERVATION;
  const Icon = config.icon;

  const sizeStyles = size === 'sm' 
    ? 'text-[10px] tracking-wider py-0.5 px-2 gap-1' 
    : 'text-xs tracking-wider py-1 px-2.5 gap-1.5';

  return (
    <span className={`inline-flex items-center font-mono font-medium rounded border ${config.style} ${sizeStyles} ${className}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: RiskLevel | AlertSeverity; className?: string }> = ({ severity, className = '' }) => {
  const styles: Record<string, string> = {
    CRITICAL: 'bg-red-950/70 text-red-400 border-red-500/40 animate-pulse-subtle',
    HIGH: 'bg-orange-950/70 text-orange-400 border-orange-500/40',
    MEDIUM: 'bg-amber-950/70 text-amber-400 border-amber-500/40',
    MODERATE: 'bg-amber-950/70 text-amber-400 border-amber-500/40',
    LOW: 'bg-cyan-950/70 text-cyan-400 border-cyan-500/40',
    VERIFIED: 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40',
    NEGLIGIBLE: 'bg-slate-900 text-slate-400 border-slate-700'
  };

  const activeStyle = styles[severity] || styles.LOW;

  return (
    <span className={`inline-flex items-center text-[10px] font-mono tracking-widest font-semibold px-2 py-0.5 rounded border ${activeStyle} ${className}`}>
      {severity === 'CRITICAL' && <AlertCircle className="w-2.5 h-2.5 mr-1" />}
      {severity === 'HIGH' && <AlertTriangle className="w-2.5 h-2.5 mr-1" />}
      {severity}
    </span>
  );
};

export const ProjectStatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  switch (status) {
    case 'UNDER_CONSTRUCTION':
      return (
        <span className="inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 animate-pulse" />
          UNDER CONSTRUCTION
        </span>
      );
    case 'DELAYED':
      return (
        <span className="inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-500/30">
          <AlertTriangle className="w-3 h-3 mr-1 text-red-400" />
          DELAYED
        </span>
      );
    case 'AWAITING_ANALYSIS':
      return (
        <span className="inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
          <Clock className="w-3 h-3 mr-1 text-slate-400" />
          AWAITING ANALYSIS
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
          COMPLETED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-tactical-800 text-slate-300 border border-tactical-700">
          {status.replace('_', ' ')}
        </span>
      );
  }
};

export const ReportStatusBadge: React.FC<{ status: ReportStatus }> = ({ status }) => {
  const styles: Record<ReportStatus, string> = {
    New: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
    Reviewing: 'bg-sky-950/60 text-sky-300 border-sky-500/30',
    Verified: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
    Resolved: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30',
    Rejected: 'bg-slate-900 text-slate-400 border-slate-700'
  };

  return (
    <span className={`inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${styles[status]}`}>
      {status === 'Verified' && <CheckCircle2 className="w-2.5 h-2.5 mr-1" />}
      {status}
    </span>
  );
};
