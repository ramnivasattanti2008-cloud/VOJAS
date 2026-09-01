/**
 * LoginPage — VOJAS elite authentication
 *
 * Cinematic dark space environment with floating grid,
 * animated brand logo, HUD-style form panel,
 * and premium micro-interactions.
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/services/api";
import { LogoAnimated } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// ── Ambient grid background ─────────────────────────────────────────────────────

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(circle, #06b6d4 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Radial fade from center */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 0%, #020617 70%)',
        }}
      />
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/40 to-transparent" />
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/20 to-transparent" />
    </div>
  );
}

// ── Floating HUD panels (decorative) ──────────────────────────────────────────

function FloatingHUD({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left';
  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.8, duration: 0.6 }}
      className={`hidden xl:flex absolute top-1/2 -translate-y-1/2 ${isLeft ? 'left-8' : 'right-8'} flex-col gap-4`}
    >
      {/* Mini stats panel */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="w-40 glass rounded-xl p-3 border border-white/[0.06]"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">System Status</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Projects</span>
            <span className="text-electric-400 font-mono">2,847</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Anomalies</span>
            <span className="text-red-400 font-mono">142</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Risk Avg</span>
            <span className="text-saffron-400 font-mono">34.2</span>
          </div>
        </div>
      </motion.div>

      {/* Globe mini indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="w-40 glass rounded-xl p-3 border border-white/[0.06] flex items-center gap-3"
      >
        <div className="relative w-8 h-8 shrink-0">
          <div className="absolute inset-0 rounded-full bg-electric-500/20 animate-pulse" />
          <div className="w-8 h-8 rounded-full border border-electric-500/40 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border border-electric-400/60" />
          </div>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">Active Nodes</p>
          <p className="text-lg font-bold text-electric-400 tabular-nums">14,392</p>
          <p className="text-[9px] text-green-400">+12 this session</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main login form ─────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error when user types
  useEffect(() => { if (error) setError(null); }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Enter email and password to continue."); return; }
    setLoading(true);
    setError(null);
    try {
      await login({ email, password });
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (user: string) => {
    setEmail(user);
    setPassword("VojasDemo2026");
  };

  return (
    <div className="relative min-h-screen bg-navy-950 overflow-hidden flex items-center justify-center px-4">
      <GridBackground />
      <FloatingHUD side="left" />
      <FloatingHUD side="right" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10"
        >
          {/* Animated logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
            className="inline-flex items-center justify-center mb-6"
          >
            <LogoAnimated />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, letterSpacing: '0.5em' }}
            animate={{ opacity: 1, letterSpacing: '0.2em' }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-3xl font-bold text-white tracking-[0.2em]"
          >
            VOJAS
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-slate-500 text-xs mt-2 tracking-[0.3em] uppercase"
          >
            Spatial Intelligence Platform
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 mx-auto w-24 h-px bg-gradient-to-r from-transparent via-electric-500/60 to-transparent"
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-[10px] text-slate-700 mt-3 tracking-wider"
          >
            SIH 2026 · SIH26102 · MPLAD Accountability
          </motion.p>
        </motion.div>

        {/* Auth panel */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Glow background */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-electric-500/10 to-transparent blur-xl opacity-60" />

          <div className="relative glass rounded-2xl overflow-hidden border border-white/[0.08]">
            {/* Top gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/50 to-transparent" />

            {/* HUD corner brackets */}
            <div className="absolute top-3 left-3 w-4 h-4 border-l border-t border-electric-500/30 pointer-events-none" />
            <div className="absolute top-3 right-3 w-4 h-4 border-r border-t border-electric-500/30 pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-l border-b border-electric-500/20 pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-r border-b border-electric-500/20 pointer-events-none" />

            <div className="px-8 pt-8 pb-7">
              {/* Panel header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-4 bg-gradient-to-b from-electric-400 to-electric-600 rounded-full" />
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Sign In
                  </h2>
                </div>
                <p className="text-sm text-slate-500 ml-3.5">
                  Access the MPLAD monitoring system
                </p>
              </div>

              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="mb-4"
                  >
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 animate-pulse" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-4" aria-label="Sign in">
                <Input
                  id="login-email"
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@vojas.gov"
                  disabled={loading}
                  autoComplete="email"
                  required
                  iconLeft={
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  }
                />

                <Input
                  id="login-password"
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="current-password"
                  required
                  iconRight={
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="text-slate-500 hover:text-slate-300 transition-colors"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  }
                />

                <Button
                  type="submit"
                  loading={loading}
                  loadingText="Authenticating..."
                  className="w-full mt-2"
                  glow
                  size="lg"
                >
                  Access System
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Button>
              </form>

              <div className="mt-5 pt-5 border-t border-white/[0.05] text-center">
                <p className="text-xs text-slate-500">
                  No account?{' '}
                  <Link to="/register" className="text-electric-400 hover:text-electric-300 font-medium transition-colors">
                    Request access
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Demo credentials */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-4 glass rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-electric-400 animate-pulse" />
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Demo Access</span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { role: 'ADMIN',   user: 'admin@vojas.gov' },
              { role: 'OFFICER', user: 'officer@vojas.gov' },
              { role: 'ANALYST', user: 'analyst@vojas.gov' },
              { role: 'REVIEWER', user: 'reviewer@vojas.gov' },
            ].map(({ role, user }) => (
              <button
                key={user}
                type="button"
                onClick={() => fillCredentials(user)}
                className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/[0.08] hover:border-electric-500/40 hover:bg-electric-500/5 transition-all cursor-pointer"
              >
                <span className="text-[9px] font-bold text-slate-500 group-hover:text-electric-400 transition-colors tracking-wider uppercase">
                  {role}
                </span>
                <span className="text-[9px] text-slate-600 group-hover:text-slate-400 transition-colors font-mono hidden sm:inline">
                  {user}
                </span>
              </button>
            ))}
          </div>
          <p className="text-center text-[9px] text-slate-700 mt-2">Password: <span className="font-mono text-slate-600">VojasDemo2026</span></p>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-[10px] text-slate-700 mt-5 tracking-wider"
        >
          VOJAS · MPLAD Scheme · SIH 2026 · All data encrypted
        </motion.p>
      </div>
    </div>
  );
}
