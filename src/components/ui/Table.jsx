import { cn } from "../../lib/utils";

export default function Table({ columns, data, onSort, sortKey, sortDir, className, onRowClick }) {
  return (
    <div className={cn("rounded-xl bg-card border shadow-sm overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                >
                  {onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="text-left w-full font-bold text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors"
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
                <tr key={row.id || i} className={`border-t border-border hover:bg-muted/30 transition-colors ${onRowClick ? "cursor-pointer" : ""}`} onClick={() => onRowClick?.(row)}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap">
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
