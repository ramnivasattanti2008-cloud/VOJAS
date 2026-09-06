import type { ReactNode } from 'react';
import Link from 'next/link';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Simple public header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-vojas-600 text-white flex items-center justify-center font-bold text-sm">
              V
            </div>
            <span className="text-lg font-bold text-slate-900">VOJAS</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/report"
              className="px-4 py-2 text-sm font-medium text-white bg-vojas-600 rounded-lg hover:bg-vojas-700 transition-colors"
            >
              Submit Report
            </Link>
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>

      {/* Simple footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
          <p>VOJAS — MPLAD Accountability Platform</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-700">
              Privacy Policy
            </Link>
            <Link href="/about" className="hover:text-slate-700">
              About
            </Link>
            <Link href="/contact" className="hover:text-slate-700">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
