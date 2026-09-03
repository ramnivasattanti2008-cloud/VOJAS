import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo + header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-vojas-600 text-white font-bold text-lg mb-3">
            V
          </div>
          <h1 className="text-2xl font-bold text-slate-900">VOJAS</h1>
          <p className="text-slate-500 text-sm mt-1">MPLAD Accountability Platform</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">{children}</div>
      </div>
    </div>
  );
}
