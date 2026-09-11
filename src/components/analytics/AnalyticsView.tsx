import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar, 
  PieChart as PieIcon, 
  Layers, 
  FileText, 
  ShieldAlert,
  Satellite
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { ANALYTICS_DATA } from '../../data/mockData';
import { ViewType } from '../layout/TacticalSidebar';

interface AnalyticsViewProps {
  onNavigate: (view: ViewType) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNavigate }) => {
  const [timeframe, setTimeframe] = useState<'6M' | '30D' | '1Y'>('6M');

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col p-4 gap-4 overflow-y-auto bg-tactical-950 text-slate-100 select-none text-left">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-tactical-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-intel-cyan">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>MACRO GEOSPATIAL INTELLIGENCE ANALYTICS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-sans text-white mt-0.5">
            Geospatial &amp; Risk Analytics Hub
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Longitudinal trend synthesis across satellite passes, anomaly clusters, and citizen reports
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-tactical-900 border border-tactical-750 p-1 rounded-xl font-mono text-xs">
          <button
            onClick={() => setTimeframe('30D')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              timeframe === '30D' ? 'bg-intel-cyan text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeframe('6M')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              timeframe === '6M' ? 'bg-intel-cyan text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            6 Months
          </button>
          <button
            onClick={() => setTimeframe('1Y')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              timeframe === '1Y' ? 'bg-intel-cyan text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            1 Year
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        
        {/* Longitudinal Changes Over Time Area Chart (8 cols) */}
        <div className="lg:col-span-8 p-4 rounded-xl border border-tactical-800 bg-tactical-900/90 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">TEMPORAL SPECTRAL ANOMALIES</span>
              <h3 className="text-sm font-bold text-white font-sans">
                Surface Change Detections by Classification (2026)
              </h3>
            </div>
            <span className="text-xs font-mono text-intel-cyan font-bold">142 Cumulative</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ANALYTICS_DATA.changesOverTime}>
                <defs>
                  <linearGradient id="colorConst" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorVeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#070b12', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Area type="monotone" dataKey="construction" name="Construction / Grading" stroke="#ef4444" fillOpacity={1} fill="url(#colorConst)" />
                <Area type="monotone" dataKey="vegetation" name="Vegetation Loss" stroke="#10b981" fillOpacity={1} fill="url(#colorVeg)" />
                <Area type="monotone" dataKey="water" name="Water / Wetland Delta" stroke="#0284c7" fillOpacity={1} fill="url(#colorWater)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Donut Chart (4 cols) */}
        <div className="lg:col-span-4 p-4 rounded-xl border border-tactical-800 bg-tactical-900/90 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">SEVERITY COMPOSITION</span>
              <h3 className="text-sm font-bold text-white font-sans">
                Active Civic Risk Distribution
              </h3>
            </div>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ANALYTICS_DATA.riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {ANALYTICS_DATA.riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#070b12', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1 font-mono text-[11px] pt-2 border-t border-tactical-800">
            {ANALYTICS_DATA.riskDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="text-white font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown Bar Chart (6 cols) */}
        <div className="lg:col-span-6 p-4 rounded-xl border border-tactical-800 bg-tactical-900/90 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">ANOMALY PROFILE</span>
              <h3 className="text-sm font-bold text-white font-sans">
                Detected Change Incidents by Category
              </h3>
            </div>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ANALYTICS_DATA.categoryBreakdown} layout="vertical">
                <XAxis type="number" stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <YAxis dataKey="category" type="category" stroke="#64748b" fontSize={11} fontFamily="monospace" width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#070b12', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="count" fill="#38bdf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Citizen Triage Resolution Velocity (6 cols) */}
        <div className="lg:col-span-6 p-4 rounded-xl border border-tactical-800 bg-tactical-900/90 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">GROUND CORROBORATION</span>
              <h3 className="text-sm font-bold text-white font-sans">
                Citizen Grievance Resolution &amp; Verification Triage
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold">319 Ingested</span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ANALYTICS_DATA.reportsTriageStats}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#070b12', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {ANALYTICS_DATA.reportsTriageStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
