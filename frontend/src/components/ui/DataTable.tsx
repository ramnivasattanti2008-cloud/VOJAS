import { cn } from "@/lib/utils";
import { ReactNode } from "react";

/**
 * DataTable — VOJAS 2.0 light theme.
 * Compact, IBM Carbon-style data table. Used for tabular data with sorting/filtering.
 */

export interface Column<T> {
  header: string;
  accessor: (row: T, index: number) => ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  /** When true, column header is sortable (visual only — actual sort logic is the parent's) */
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  empty?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  /** Compact mode reduces vertical padding */
  compact?: boolean;
}

const ALIGN_CLASS = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export default function DataTable<T>({
  columns,
  data,
  empty = "No data available",
  onRowClick,
  className,
  compact = false,
}: DataTableProps<T>) {
  const cellPad = compact ? "py-2 px-3" : "py-2.5 px-4";
  return (
    <div className={cn("bg-white border border-gray-200 rounded-md overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className={cn(
                    "font-semibold text-[11px] text-gray-600 uppercase tracking-wider",
                    cellPad,
                    col.align ? ALIGN_CLASS[col.align] : "text-left",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-gray-500 text-sm"
                >
                  {empty}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col, j) => (
                    <td
                      key={j}
                      className={cn(
                        "text-gray-800",
                        cellPad,
                        col.align ? ALIGN_CLASS[col.align] : "text-left",
                        col.className
                      )}
                    >
                      {col.accessor(row, i)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
