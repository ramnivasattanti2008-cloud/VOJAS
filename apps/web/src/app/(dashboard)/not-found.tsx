// This boundary needs a client component: the "Go back" button carries an
// onClick and reaches for window.history. As a server component it threw
// "Event handlers cannot be passed to Client Component props" on every render
// of a (dashboard) page, because Next prepares the not-found boundary for the
// segment even when the page itself resolves.
'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="text-6xl font-bold text-slate-200 mb-4">404</div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        Page not found
      </h1>
      <p className="text-slate-500 mb-6 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="px-4 py-2 text-sm font-medium text-white bg-vojas-600 rounded-lg hover:bg-vojas-700 transition-colors"
        >
          Go to Dashboard
        </Link>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          Go back
        </button>
      </div>
    </div>
  );
}
