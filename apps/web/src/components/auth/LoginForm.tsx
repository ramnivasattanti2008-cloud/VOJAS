'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { defaultRouteForRole, sanitiseNextPath } from '@/lib/auth-context';
import { KeyRound, ShieldAlert, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await login(email, password);
      const next = searchParams.get('next');
      const target = sanitiseNextPath(next) || defaultRouteForRole(user.role);
      router.push(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please verify credentials.');
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Admin123!');
    setError(null);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="Sign in form">
      <div className="space-y-1">
        <h2 className="text-xl font-extrabold text-[#1C1C1E] tracking-tight">Sign In</h2>
        <p className="text-xs text-[#8E8E93]">Access civic intelligence dashboard and audit workflows.</p>
      </div>

      {error && (
        <div className="p-3 rounded-[14px] bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-xs text-[#D70015] flex items-center gap-2" role="alert">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* One-Tap Demo Profiles for Judges / Evaluators */}
      <div className="p-3 rounded-[16px] bg-[#F2F2F7] border border-black/[0.04] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#007AFF]" /> One-Tap Demo Personas
          </span>
          <span className="text-[10px] font-mono text-[#8E8E93]">PW: Admin123!</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          <button
            type="button"
            onClick={() => fillDemoAccount('citizen@vojas.gov')}
            className="px-1.5 py-1.5 rounded-[8px] bg-white hover:bg-[#007AFF]/10 hover:text-[#007AFF] border border-black/[0.05] text-[10px] font-semibold text-[#1C1C1E] transition-all active:scale-95 shadow-2xs text-center truncate"
            title="Citizen Persona"
          >
            Citizen
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('officer@vojas.gov')}
            className="px-1.5 py-1.5 rounded-[8px] bg-white hover:bg-[#007AFF]/10 hover:text-[#007AFF] border border-black/[0.05] text-[10px] font-semibold text-[#1C1C1E] transition-all active:scale-95 shadow-2xs text-center truncate"
            title="Vigilance Officer Persona"
          >
            Officer
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('admin@vojas.gov')}
            className="px-1.5 py-1.5 rounded-[8px] bg-white hover:bg-[#007AFF]/10 hover:text-[#007AFF] border border-black/[0.05] text-[10px] font-semibold text-[#1C1C1E] transition-all active:scale-95 shadow-2xs text-center truncate"
            title="System Administrator Persona"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('mp@vojas.gov')}
            className="px-1.5 py-1.5 rounded-[8px] bg-white hover:bg-[#007AFF]/10 hover:text-[#007AFF] border border-black/[0.05] text-[10px] font-semibold text-[#1C1C1E] transition-all active:scale-95 shadow-2xs text-center truncate"
            title="Member of Parliament Persona"
          >
            MP
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('contractor@vojas.gov')}
            className="px-1.5 py-1.5 rounded-[8px] bg-white hover:bg-[#007AFF]/10 hover:text-[#007AFF] border border-black/[0.05] text-[10px] font-semibold text-[#1C1C1E] transition-all active:scale-95 shadow-2xs text-center truncate"
            title="Executing Contractor Persona"
          >
            Vendor
          </button>
        </div>
      </div>

      <Input
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        placeholder="e.g. citizen@vojas.gov"
      />

      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
        placeholder="••••••••"
      />

      <Button type="submit" className="w-full" isLoading={isLoading} leftIcon={<KeyRound className="w-4 h-4" />}>
        Sign In
      </Button>

      <p className="text-xs text-center text-[#8E8E93] pt-1">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-[#007AFF] hover:underline font-semibold">
          Create Account
        </Link>
      </p>
    </form>
  );
}
