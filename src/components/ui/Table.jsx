import { cn } from "../../lib/utils";

export default function Table({ columns, data, onSort, sortKey, sortDir, className, onRowClick }) {
  return (
    <div className={cn("rounded-xl overflow-hidden bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-teal-500/20 dark:border-white/20 shadow-lg shadow-teal-900/5 dark:shadow-black/30", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap"
                >
                  {onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="text-left w-full font-bold text-xs tracking-wider uppercase text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  No data available.
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={row.id || i} className={`${i % 2 === 0 ? "bg-white/40 dark:bg-white/5" : "bg-slate-50/50 dark:bg-white/5"} border-t border-slate-200 dark:border-border hover:bg-slate-100/70 dark:hover:bg-muted/30 transition-colors ${onRowClick ? "cursor-pointer" : ""}`} onClick={() => onRowClick?.(row)}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {col.render ? col.render(row) : row[col.key]}
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
