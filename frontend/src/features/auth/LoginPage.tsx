import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Eye, EyeOff, ArrowRight, Lock, User } from "lucide-react";
import { ApiError } from "@/services/api";
import { CinematicBackground } from "@/components/layout";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login({ email, password });
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-navy-950 overflow-hidden flex items-center justify-center px-4">
      {/* Animated cinematic background */}
      <CinematicBackground />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">

        {/* Logo block */}
        <div className="login-logo-enter text-center mb-8">
          {/* Glowing shield icon */}
          <div className="relative inline-flex items-center justify-center mb-5">
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-2xl bg-electric-500/20 blur-xl" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-electric-500 to-electric-600 flex items-center justify-center shadow-lg shadow-electric-500/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            {/* Orbiting ring */}
            <div className="absolute inset-[-4px] rounded-2xl border border-electric-500/30 animate-[spin_8s_linear_infinite]" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-[0.15em]">VOJAS</h1>
          <p className="text-slate-500 text-sm mt-1.5 tracking-widest uppercase font-medium">
            Accountability Platform
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5 tracking-wider">
            SIH 2026 · SIH26102 · Smart Automation
          </p>
        </div>

        {/* Login card */}
        <div className="login-card-enter">
          <div className="glass rounded-2xl p-8 relative overflow-hidden">
            {/* Card top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/40 to-transparent" />

            <h2 className="text-lg font-semibold text-white mb-0.5">Sign In</h2>
            <p className="text-sm text-slate-400 mb-6">
              Access the MPLAD monitoring system
            </p>

            {error && (
              <div role="alert" className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" aria-label="Sign in form">
              {/* Email field */}
              <div className="login-form-enter">
                <label htmlFor="login-email" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-medium">
                  Email Address
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@vojas.gov"
                    className="w-full bg-navy-800/60 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all"
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="login-form-enter" style={{ animationDelay: "0.35s" }}>
                <label htmlFor="login-password" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-medium">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-navy-800/60 border border-white/10 rounded-lg pl-10 pr-10 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all"
                    disabled={loading}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    aria-pressed={showPw}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="login-form-enter" style={{ animationDelay: "0.45s" }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full bg-gradient-to-r from-electric-500 to-electric-600 hover:from-electric-400 hover:to-electric-500 disabled:from-electric-500/50 disabled:to-electric-600/50 text-white text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-electric-500/20 hover:shadow-electric-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Access System
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-white/5 text-center">
              <p className="text-xs text-slate-500">
                Need access?{" "}
                <Link
                  to="/register"
                  className="text-electric-400 hover:text-electric-300 transition-colors font-medium"
                >
                  Request account
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="login-form-enter text-center mt-6" style={{ animationDelay: "0.55s" }}>
          <p className="text-[10px] text-slate-600 tracking-wider">
            VOJAS · MPLAD Scheme Accountability Platform · SIH 2026
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-slate-600">System operational</span>
          </div>
        </div>

        {/* Demo credentials hint */}
        <div className="login-form-enter glass rounded-xl p-3 mt-4 text-center" style={{ animationDelay: "0.65s" }}>
          <p className="text-[10px] text-slate-600 mb-1">Demo credentials</p>
          <div className="flex flex-wrap justify-center gap-1">
            {[
              { role: "ADMIN", user: "admin@vojas.gov" },
              { role: "OFFICER", user: "officer@vojas.gov" },
              { role: "ANALYST", user: "analyst@vojas.gov" },
            ].map(({ role, user }) => (
              <button
                key={user}
                type="button"
                onClick={() => { setEmail(user); setPassword("VojasDemo2026"); }}
                className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-slate-500 hover:text-slate-300 hover:border-electric-500/30 transition-all cursor-pointer"
              >
                {role}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-slate-700 mt-1">Password: VojasDemo2026</p>
        </div>
      </div>
    </div>
  );
}
