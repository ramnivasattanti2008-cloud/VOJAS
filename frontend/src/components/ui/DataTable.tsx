import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export interface Column<T> {
  header: string;
  accessor: (row: T, index: number) => ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  empty?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

const ALIGN_CLASS = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export default function DataTable<T>({
  columns,
  data,
  empty = "No data found",
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("bg-white/5 border border-white/10 rounded-xl overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className={cn(
                    "py-3 px-4 font-medium text-xs text-white/50 uppercase tracking-wider",
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
                  className="py-12 text-center text-white/40 text-sm"
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
                    "border-b border-white/5 hover:bg-white/5 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col, j) => (
                    <td
                      key={j}
                      className={cn(
                        "py-3 px-4 text-white/80",
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
