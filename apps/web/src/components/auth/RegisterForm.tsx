'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/\d/, 'Password must contain at least one digit'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export function RegisterForm() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = registerSchema.safeParse({ name, email, password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    try {
      await register(parsed.data.name, parsed.data.email, parsed.data.password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="Create account form">
      <div className="space-y-1">
        <h2 className="text-xl font-extrabold text-[#1C1C1E] tracking-tight">Create Account</h2>
        <p className="text-xs text-[#8E8E93]">Join VOJAS to file discrepancy reports and monitor projects.</p>
      </div>

      {error && (
        <div className="p-3 rounded-[14px] bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-xs text-[#D70015] flex items-center gap-2" role="alert">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="Your full name" />
      <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
      <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" placeholder="Min. 10 chars (uppercase, lowercase, number)" />
      <Input label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" placeholder="Re-enter password" />

      <Button type="submit" className="w-full" isLoading={isLoading} leftIcon={<UserPlus className="w-4 h-4" />}>
        Create Account
      </Button>

      <p className="text-xs text-center text-[#8E8E93] pt-1">
        Already have an account?{' '}
        <Link href="/login" className="text-[#007AFF] hover:underline font-semibold">
          Sign In
        </Link>
      </p>
    </form>
  );
}
