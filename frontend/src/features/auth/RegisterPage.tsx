/**
 * RegisterPage — VOJAS elite account creation
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/services/api";
import { LogoAnimated } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: 'radial-gradient(circle, #06b6d4 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 0%, #020617 70%)',
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/20 to-transparent" />
    </div>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (error) setError(null); }, [name, email, password, confirm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      await register({ name, email, password });
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-navy-950 overflow-hidden flex items-center justify-center px-4 py-8">
      <GridBackground />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
            className="inline-flex items-center justify-center mb-5"
          >
            <LogoAnimated />
          </motion.div>
          <h1 className="text-2xl font-bold text-white tracking-[0.2em]">VOJAS</h1>
          <p className="text-slate-500 text-xs mt-2 tracking-[0.3em] uppercase">Spatial Intelligence Platform</p>
        </motion.div>

        {/* Auth panel */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-electric-500/10 to-transparent blur-xl opacity-60" />
          <div className="relative glass rounded-2xl overflow-hidden border border-white/[0.08]">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/50 to-transparent" />
            <div className="absolute top-3 left-3 w-4 h-4 border-l border-t border-electric-500/30 pointer-events-none" />
            <div className="absolute top-3 right-3 w-4 h-4 border-r border-t border-electric-500/30 pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-l border-b border-electric-500/20 pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-r border-b border-electric-500/20 pointer-events-none" />

            <div className="px-8 pt-7 pb-6">
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-4 bg-gradient-to-b from-electric-400 to-electric-600 rounded-full" />
                  <h2 className="text-lg font-bold text-white tracking-tight">Request Access</h2>
                </div>
                <p className="text-sm text-slate-500 ml-3.5">
                  New accounts default to VIEWER role. Officer verification required for higher roles.
                </p>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  >
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 animate-pulse" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-3.5" aria-label="Registration form">
                <Input
                  id="register-name"
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Officer Name"
                  disabled={loading}
                  required
                />

                <Input
                  id="register-email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@vojas.gov"
                  disabled={loading}
                  autoComplete="email"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    id="register-password"
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 chars"
                    disabled={loading}
                    autoComplete="new-password"
                    required
                    helpText={password && password.length < 8 ? "Min 8 characters" : undefined}
                  />
                  <Input
                    id="register-confirm"
                    label="Confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter"
                    disabled={loading}
                    autoComplete="new-password"
                    required
                    error={confirm && password !== confirm ? "Mismatch" : undefined}
                  />
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  loadingText="Creating account..."
                  className="w-full mt-2"
                  glow
                  size="lg"
                >
                  Create Account
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Button>
              </form>

              <div className="mt-5 pt-5 border-t border-white/[0.05] text-center">
                <p className="text-xs text-slate-500">
                  Already have an account?{' '}
                  <Link to="/login" className="text-electric-400 hover:text-electric-300 font-medium transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
