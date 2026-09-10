'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Landmark, ShieldCheck, HardHat, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface RoleOption {
  role: string;
  title: string;
  email: string;
  redirectUrl: string;
  description: string;
  icon: typeof Users;
  accent: string;
  badge: string;
}

const DEMO_ROLES: RoleOption[] = [
  {
    role: 'CITIZEN',
    title: 'Citizen Portal',
    email: 'citizen@vojas.gov',
    redirectUrl: '/citizen',
    description: 'Track the 13 projects, inspect weekly satellite imagery, and audit MP funds.',
    icon: Users,
    accent: 'border-blue-200 hover:border-blue-500 hover:bg-blue-50/50 text-blue-700',
    badge: 'Public Transparency',
  },
  {
    role: 'MP',
    title: 'Member of Parliament (MP)',
    email: 'mp@vojas.gov',
    redirectUrl: '/mp',
    description: 'Monitor constituency works, budget allocations, contractor ratings & fraud alerts.',
    icon: Landmark,
    accent: 'border-purple-200 hover:border-purple-500 hover:bg-purple-50/50 text-purple-700',
    badge: 'Constituency Oversight',
  },
  {
    role: 'OFFICER',
    title: 'Government Vigilance Officer',
    email: 'officer@vojas.gov',
    redirectUrl: '/officer',
    description: 'Audit the 3 AI-flagged ghost projects, verify contractor claims vs satellite images, dispatch inspections.',
    icon: ShieldCheck,
    accent: 'border-rose-200 hover:border-rose-500 hover:bg-rose-50/50 text-rose-700',
    badge: 'Fraud Detection Console',
  },
  {
    role: 'CONTRACTOR',
    title: 'Contractor Portal',
    email: 'contractor@vojas.gov',
    redirectUrl: '/contractor',
    description: 'Submit weekly construction progress (% done, % left, funds spent, site photos) with instant satellite check.',
    icon: HardHat,
    accent: 'border-amber-200 hover:border-amber-500 hover:bg-amber-50/50 text-amber-700',
    badge: 'Weekly Reporting',
  },
];

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleQuickLogin = async (role: RoleOption) => {
    setError(null);
    setSelectedRole(role.role);
    try {
      await login(role.email, 'Admin123!');
      router.push(role.redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo role sign in failed');
      setSelectedRole(null);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">VOJAS Accountability Portal</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Select your verified access role to inspect weekly satellite fraud detection or submit work reports.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* 1-Click Role Switcher */}
      <div className="space-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          ⚡ 1-Click Direct Role Access
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {DEMO_ROLES.map((r) => {
            const Icon = r.icon;
            const isCurrentLoggingIn = selectedRole === r.role && isLoading;

            return (
              <button
                key={r.role}
                type="button"
                onClick={() => handleQuickLogin(r)}
                disabled={isLoading}
                className={`text-left p-3.5 rounded-2xl border bg-white shadow-xs transition-all flex flex-col justify-between gap-2 group hover:shadow-md ${r.accent}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {r.badge}
                  </span>
                  <div className="p-1.5 rounded-xl bg-slate-50 group-hover:bg-white transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-900">{r.title}</h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    {r.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
                  <span>Enter as {r.role}</span>
                  {isCurrentLoggingIn ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-50 px-2 text-slate-400 font-medium">Or Sign In With Custom Email</span>
        </div>
      </div>

      {/* Manual Login Form */}
      <form onSubmit={onSubmit} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3.5" aria-label="Sign in form">
        <Input
          label="Official Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="officer@vojas.gov"
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

        <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl" isLoading={isLoading && !selectedRole}>
          Sign in
        </Button>

        <p className="text-xs text-center text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
            Register Public Account
          </Link>
        </p>
      </form>
    </div>
  );
}
