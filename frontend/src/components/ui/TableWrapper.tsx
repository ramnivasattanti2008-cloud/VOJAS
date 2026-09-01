import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  /** Render function: (row: T, index: number) => ReactNode */
  render: (row: T, index: number) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

interface TableWrapperProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  /** Accessible label for the table */
  caption?: string;
  /** Empty state message */
  empty?: string;
  /** Key extractor */
  getKey?: (row: T) => string;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  className?: string;
}

const ALIGN_CLASS = {
  left:   "text-left",
  right:  "text-right",
  center: "text-center",
};

export default function TableWrapper<T extends Record<string, unknown>>({
  columns,
  data,
  caption,
  empty = "No data found",
  getKey = (row) => String(row["id"] ?? JSON.stringify(row)),
  onRowClick,
  className,
}: TableWrapperProps<T>) {
  return (
    <div className={cn("overflow-x-auto rounded-xl", className)}>
      <table className="w-full text-xs" aria-label={caption}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-white/5">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "pb-2.5 pr-4 font-semibold text-[10px] text-slate-600 uppercase tracking-wider",
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
                className="py-10 text-center text-slate-600 text-sm"
              >
                {empty}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={getKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors",
                  onRowClick && "cursor-pointer",
                  "group"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "py-3 pr-4 text-slate-400",
                      col.align ? ALIGN_CLASS[col.align] : "text-left",
                      col.className
                    )}
                  >
                    {col.render(row, i)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
