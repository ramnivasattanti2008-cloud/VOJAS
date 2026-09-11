import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Sign In | VOJAS',
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E] selection:bg-[#007AFF] selection:text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Apple HIG Logo + Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block active:scale-95 transition-transform">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-[16px] bg-[#1C1C1E] text-white font-black text-xl shadow-ios-sm">
              V
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight mt-3">VOJAS</h1>
          <p className="text-[#8E8E93] text-xs font-medium mt-0.5">MPLAD Civic Accountability Platform</p>
        </div>

        {/* Inset Grouped Card */}
        <div className="bg-white rounded-[24px] border border-black/[0.06] shadow-ios-card p-6 sm:p-8">
          {children}
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-[#8E8E93]">
          <Link href="/" className="hover:text-[#007AFF] font-medium transition-colors">
            ← Back to Public Transparency Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
