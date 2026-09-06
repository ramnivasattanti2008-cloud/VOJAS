import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In | VOJAS',
  description: 'Sign in to your VOJAS accountability platform account.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginForm />;
}
