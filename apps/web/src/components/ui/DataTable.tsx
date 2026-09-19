'use client';

import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T extends { id?: string }> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends { id?: string }>({
  columns,
  rows,
  onRowClick,
  isLoading,
  emptyMessage = 'No data found',
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-[16px] border border-black/[0.06] bg-white shadow-ios-card', className)}>
      <table className="w-full text-sm" role="table" aria-label="Data table">
        <thead>
          <tr className="ios-hairline-b">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-4 py-3 text-left text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="ios-hairline-b">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="ios-shimmer h-4 rounded-[6px]" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-14 text-center text-[13px] text-[#8E8E93]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const isClickable = !!onRowClick;
              return (
                <tr
                  key={row.id ?? JSON.stringify(row)}
                  className={cn(
                    'ios-hairline-b last:border-b-0',
                    'hover:bg-black/[0.02] transition-colors',
                    isClickable && 'cursor-pointer'
                  )}
                  onClick={isClickable ? () => onRowClick(row) : undefined}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={
                    isClickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3 text-[#1C1C1E]', col.className)}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
