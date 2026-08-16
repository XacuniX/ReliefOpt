import { useMemo, useState } from "react";
import { Badge, Card, Input } from "../ui";
import { useData } from "../../context/DataContext";

const reasonColors = { Distribution: "teal", Restocking: "green", Damage: "red", Adjustment: "amber" };

export default function StockLog() {
  const { stockLog } = useData();
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return stockLog.filter((log) => {
      const matchesDate = !date || log.timestamp.slice(0, 10) === date;
      return matchesDate && (!query || log.itemName.toLowerCase().includes(query));
    });
  }, [date, search, stockLog]);

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-3">Stock change log</h2>
      <div className="flex flex-wrap gap-4">
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 min-w-[220px]" />
        <Input label="Search item" placeholder="Search by item name" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[220px]" />
      </div>
      <Card className="mt-4 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[150px_minmax(180px,1fr)_80px_120px_minmax(130px,0.7fr)] gap-4 px-4 py-3 bg-muted/50 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <span>Timestamp</span>
              <span>Item</span>
              <span>Change</span>
              <span>Reason</span>
              <span>Changed by</span>
            </div>
            {filteredLogs.map((log) => {
              const positive = log.change > 0;
              return (
                <div key={log.id} className="grid grid-cols-[150px_minmax(180px,1fr)_80px_120px_minmax(130px,0.7fr)] gap-4 px-4 py-3 border-t border-border text-sm items-center hover:bg-muted/30 transition-colors">
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                  <strong>{log.itemName}</strong>
                  <span className={`font-bold ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {positive ? "+" : ""}{log.change}
                  </span>
                  <span><Badge color={reasonColors[log.reason]} text={log.reason} /></span>
                  <span>{log.user}</span>
                </div>
              );
            })}
            {!filteredLogs.length && (
              <p className="text-muted-foreground text-center py-5">No stock changes match the selected filters.</p>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
