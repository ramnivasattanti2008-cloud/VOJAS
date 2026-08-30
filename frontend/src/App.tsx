import { useState, useEffect } from "react";
import { Shield, Activity, AlertTriangle, CheckCircle } from "lucide-react";

// API base URL from env or default to proxied
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

interface HealthStatus {
  status: string;
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  database?: string;
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setHealth(data.data);
        } else {
          setError("Unexpected response format");
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(`Connection failed: ${err.message}`);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Header */}
      <header className="glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-electric-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">VOJAS</h1>
              <p className="text-xs text-slate-400 tracking-widest uppercase">Accountability</p>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            MPLAD SCHEME MONITOR
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-electric-500/10 border border-electric-500/20 text-electric-400 text-xs font-medium tracking-widest uppercase mb-6">
            <Activity className="w-3 h-3" />
            SIH 2026 — SIH26102
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            AI-Powered Project
            <br />
            <span className="text-electric-400">Accountability Platform</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Detecting anomalies, fraud indicators, and inefficiencies in MPLAD Scheme
            implementation through multi-signal AI analysis.
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              {loading ? (
                <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
              ) : health ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Frontend Status
              </span>
            </div>
            <p className="text-white font-semibold">
              {loading ? "Checking..." : health ? "Running" : "Error"}
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              {loading ? (
                <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
              ) : health ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              <span className="text-xs text-silver-400 uppercase tracking-wider font-medium">
                API Status
              </span>
            </div>
            <p className="text-white font-semibold">
              {loading
                ? "Checking..."
                : error
                ? `Offline: ${error}`
                : `Online (v${health?.version})`}
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              {loading ? (
                <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
              ) : health?.database === "connected" ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <div className="w-3 h-3 rounded-full bg-slate-600" />
              )}
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Database Status
              </span>
            </div>
            <p className="text-white font-semibold">
              {loading ? "Checking..." : health?.database === "connected" ? "Connected" : "Not Connected"}
            </p>
          </div>
        </div>

        {/* Features Coming Soon */}
        <div className="glass rounded-xl p-8">
          <h3 className="text-lg font-semibold text-white mb-6">Foundation Complete ✓</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {[
              "Project Registry",
              "Citizen Reporting",
              "AI Anomaly Detection",
              "Risk Scoring",
              "Financial Tracking",
              "Map Visualization",
              "Document Intelligence",
              "Officer Workflow",
              "Audit Trail",
              "16 Sector Modules",
              "Alert System",
              "Analytics Dashboard",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 text-slate-400 bg-navy-800/30 rounded-lg px-3 py-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-electric-500/60" />
                {feature}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-6 text-center">
            Next: Phase 3 — User Authentication & Role-Based Access
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-600">
          VOJAS — SIH 2026 | Theme: Smart Automation | Building responsibly
        </div>
      </footer>
    </div>
  );
}

export default App;
