/**
 * DataTable — VOJAS premium data table
 *
 * Features:
 * - Premium styling with hover effects
 * - Animated row entries (stagger fade-in)
 * - Sortable column headers
 * - Loading state with skeleton
 * - Empty state
 * - Action column support
 * - Zebra stripes optional
 * - Sticky header
 */

import { useState, useMemo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import LoadingState from './LoadingState';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  accessor?: (row: T, i: number) => any;
  render?: (row: T, i: number) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  rowKey?: (row: T) => string;
  zebra?: boolean;
  stickyHeader?: boolean;
  className?: string;
  density?: 'compact' | 'normal' | 'comfortable';
  caption?: string;
}

const DENSITY_CLASSES = {
  compact:    { row: 'h-8 text-[11px]',   cell: 'px-3 py-1.5' },
  normal:     { row: 'h-12 text-xs',      cell: 'px-4 py-2.5' },
  comfortable:{ row: 'h-16 text-sm',      cell: 'px-5 py-4' },
};

export function DataTable<T>({
  columns, data, loading = false, emptyState,
  onRowClick, rowKey, zebra = false, stickyHeader = false,
  className, density = 'normal', caption,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;
    const accessor = col.accessor || ((r: any) => r[sortKey]);
    return [...data].sort((a, b) => {
      const av = accessor(a, 0);
      const bv = accessor(b, 0);
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const aStr = String(av).toLowerCase();
      const bStr = String(bv).toLowerCase();
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [data, sortKey, sortDir, columns]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <LoadingState message="Loading data..." variant="spinner" size="md" />
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const densityCls = DENSITY_CLASSES[density];

  return (
    <div className={cn('w-full overflow-x-auto rounded-xl', className)}>
      <table className="w-full" aria-label={caption}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className={cn(
          'bg-white/[0.02] border-b border-white/5',
          stickyHeader && 'sticky top-0 z-10 backdrop-blur-md'
        )}>
          <tr>
            {columns.map((col) => {
              const isSortable = col.sortable !== false && (col.accessor || col.key);
              const isActive = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    col.width && `w-[${col.width}]`,
                    col.className,
                    densityCls.cell,
                    isSortable && 'cursor-pointer hover:text-slate-300 transition-colors select-none'
                  )}
                  onClick={() => isSortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {isSortable && (
                      <span className="text-slate-700">
                        {isActive ? (
                          sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-electric-400" /> : <ChevronDown className="w-3 h-3 text-electric-400" />
                        ) : (
                          <ChevronsUpDown className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={true}>
            {sortedData.map((row, i) => {
              const key = rowKey ? rowKey(row) : String(i);
              const clickable = !!onRowClick;
              return (
                <motion.tr
                  key={key}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4), duration: 0.3 }}
                  onClick={clickable ? () => onRowClick!(row) : undefined}
                  className={cn(
                    'group relative border-b border-white/[0.04] last:border-0',
                    'transition-all duration-150',
                    clickable && 'cursor-pointer hover:bg-white/[0.03]',
                    zebra && i % 2 === 1 && 'bg-white/[0.01]'
                  )}
                >
                  {/* Hover left accent bar */}
                  {clickable && (
                    <td className="absolute left-0 top-0 bottom-0 w-0.5 bg-electric-500/0 group-hover:bg-electric-500/80 transition-colors" />
                  )}
                  {columns.map((col) => {
                    const val = col.accessor ? col.accessor(row, i) : (row as any)[col.key];
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'text-slate-300 whitespace-nowrap',
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                          col.className,
                          densityCls.cell,
                        )}
                      >
                        {col.render ? col.render(row, i) : (val as ReactNode)}
                      </td>
                    );
                  })}
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
