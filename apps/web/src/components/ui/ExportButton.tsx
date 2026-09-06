'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export type ExportFormat = 'csv' | 'pdf';

export interface ExportOption {
  format: ExportFormat;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const DEFAULT_OPTIONS: ExportOption[] = [
  {
    format: 'csv',
    label: 'Download CSV',
    icon: <FileSpreadsheet className="h-4 w-4" />,
    description: 'Spreadsheet-compatible comma-separated values',
  },
  {
    format: 'pdf',
    label: 'Print / Save PDF',
    icon: <FileText className="h-4 w-4" />,
    description: 'Print-ready document via your browser',
  },
];

interface ExportButtonProps {
  /** API endpoint for CSV export (e.g. '/api/v1/export/projects') */
  csvEndpoint?: string;
  /** Query params to append to CSV endpoint */
  csvParams?: Record<string, string | undefined>;
  /** Print selector — CSS selector for the element to print */
  printSelector?: string;
  /** Custom export options (default: CSV + PDF) */
  options?: ExportOption[];
  /** Button label when no dropdown */
  label?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Disable the button */
  disabled?: boolean;
  /** Extra className */
  className?: string;
  /** Filename hint for CSV (without extension) */
  filenameHint?: string;
}

export function ExportButton({
  csvEndpoint,
  csvParams,
  printSelector,
  options = DEFAULT_OPTIONS,
  label,
  variant = 'secondary',
  disabled,
  className,
  filenameHint,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleExport = async (format: ExportFormat) => {
    setOpen(false);
    setLoading(format);

    try {
      if (format === 'csv' && csvEndpoint) {
        await downloadCsv(csvEndpoint, csvParams, filenameHint);
      } else if (format === 'pdf') {
        triggerPrint(printSelector);
      }
    } finally {
      setLoading(null);
    }
  };

  if (loading) {
    return (
      <Button variant={variant} disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="hidden sm:inline">{loading === 'csv' ? 'Preparing download...' : 'Opening print...'}</span>
      </Button>
    );
  }

  const showDropdown = options.length > 1;

  return (
    <div className="relative inline-block">
      {showDropdown ? (
        <>
          <Button
            ref={btnRef}
            variant={variant}
            onClick={() => setOpen(!open)}
            disabled={disabled}
            className={cn('gap-1.5', className)}
            rightIcon={<ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />}
          >
            <Download className="h-4 w-4" />
            {label ?? 'Export'}
          </Button>

          {open && (
            <div
              ref={menuRef}
              className="absolute right-0 z-50 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 animate-in fade-in-0 zoom-in-95 duration-100"
            >
              <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                Export as
              </div>
              {options.map((opt) => (
                <button
                  key={opt.format}
                  onClick={() => handleExport(opt.format)}
                  disabled={opt.format === 'csv' && !csvEndpoint}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  <span className="mt-0.5 text-slate-400 shrink-0">{opt.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{opt.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{opt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <Button
          variant={variant}
          onClick={() => handleExport(options[0].format)}
          disabled={disabled}
          className={cn('gap-1.5', className)}
        >
          <Download className="h-4 w-4" />
          {label ?? options[0].label}
        </Button>
      )}
    </div>
  );
}

// ── CSV Download ──────────────────────────────────────────────────────────────

async function downloadCsv(
  endpoint: string,
  params?: Record<string, string | undefined>,
  filenameHint?: string
): Promise<void> {
  const url = new URL(endpoint, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
  }

  const token = (window as Window & { __accessToken?: string }).__accessToken;
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token ?? ''}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Export failed: ${res.status} ${res.statusText}`);
  }

  const contentDisposition = res.headers.get('Content-Disposition') ?? '';
  const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/i);
  const filename = filenameMatch?.[1] ?? `${filenameHint ?? 'export'}.csv`;

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();

  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

// ── Print to PDF ─────────────────────────────────────────────────────────────

function triggerPrint(selector?: string): void {
  if (selector) {
    // Temporarily hide everything except the target
    const originalBody = document.body.innerHTML;
    const target = document.querySelector(selector);
    if (target) {
      document.body.innerHTML = '';
      document.body.appendChild(target.cloneNode(true));
      window.print();
      document.body.innerHTML = originalBody;
      return;
    }
  }
  window.print();
}
