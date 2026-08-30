import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, ArrowRight } from "lucide-react";
import { ApiError } from "@/services/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await register({ name, email, password });
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-electric-500 mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">VOJAS</h1>
          <p className="text-slate-500 text-sm mt-1">Create an account</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-1">Request Access</h2>
          <p className="text-sm text-slate-400 mb-6">
            New accounts default to VIEWER role — officer verification required for higher roles
          </p>

          {error && (
            <div role="alert" className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Registration form">
            <div>
              <label htmlFor="register-name" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Officer Name"
                className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 transition-colors"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label htmlFor="register-email" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@vojas.gov"
                className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 transition-colors"
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="register-password" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 transition-colors"
                disabled={loading}
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label htmlFor="register-confirm" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                id="register-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 transition-colors"
                disabled={loading}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-electric-500 hover:bg-electric-600 disabled:bg-electric-500/50 text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="text-electric-400 hover:text-electric-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
